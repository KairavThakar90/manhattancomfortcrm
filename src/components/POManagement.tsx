import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Search,
  Filter,
  Plus,
  FileSpreadsheet,
  FileUp,
  Download,
  Eye,
  Calendar,
  Layers,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  Clock,
  Mail,
  Sparkles,
  Send,
  X,
  Check,
  FileText,
  ChevronRight,
  ArrowRight,
  Trash,
  CalendarDays,
  Upload,
  DollarSign,
} from 'lucide-react';
import { PurchaseOrder, Vendor, Comment, EmailLog, UserRole } from '../types';
import Pagination from './common/Pagination';
import LoadingOverlay from './common/LoadingOverlay';
import VendorInfiniteDropdown from './common/VendorInfiniteDropdown';

interface POManagementProps {
  loading?: boolean;
  purchaseOrders: PurchaseOrder[];
  vendors: Vendor[];
  comments: Comment[];
  emails: EmailLog[];
  userRole: UserRole;
  selectedPOId: string | null;
  onSelectPO: (poId: string | null) => void;
  onUpdatePO: (updated: PurchaseOrder) => void;
  onAddComment: (comment: Comment) => void;
  onAddEmailLog: (email: EmailLog) => void;
  onAddActivity: (
    msg: string,
    type: 'PO Updated' | 'Email Sent' | 'Invoice Uploaded' | 'Vendor Comment',
  ) => void;
  onAddAudit: (
    poId: string,
    action: string,
    prev: string,
    next: string,
    browser?: string,
    ip?: string,
  ) => void;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  totalCount?: number;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (val: string) => void;
  vendorFilter?: string;
  onVendorFilterChange?: (val: string) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
}

export default function POManagement({
  loading = false,
  purchaseOrders: propPurchaseOrders,
  vendors,
  comments,
  emails,
  userRole,
  selectedPOId,
  onSelectPO,
  onUpdatePO,
  onAddComment,
  onAddEmailLog,
  onAddActivity,
  onAddAudit,
  currentPage: propCurrentPage,
  onPageChange: propOnPageChange,
  totalCount: propTotalCount,
  searchQuery: propSearchQuery,
  onSearchChange: propOnSearchChange,
  statusFilter: propStatusFilter,
  onStatusFilterChange: propOnStatusFilterChange,
  vendorFilter: propVendorFilter,
  onVendorFilterChange: propOnVendorFilterChange,
  pageSize: propPageSize,
  onPageSizeChange: propOnPageSizeChange,
}: POManagementProps) {
  const reduxPOs = useSelector((state: any) => state.purchaseOrders?.list);

  console.log('reduxPOs', reduxPOs);

  const purchaseOrders = reduxPOs || [];
  // Navigation inside PO module
  const [activeSubTab, setActiveSubTab] = useState<
    'grid' | 'kanban' | 'calendar'
  >('grid');

  // Filtering and Searching
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [localStatusFilter, setLocalStatusFilter] = useState<string>('all');
  const [localVendorFilter, setLocalVendorFilter] = useState<string>('all');

  const searchQuery =
    propSearchQuery !== undefined ? propSearchQuery : localSearchQuery;
  const setSearchQuery = propOnSearchChange
    ? propOnSearchChange
    : setLocalSearchQuery;

  const statusFilter =
    propStatusFilter !== undefined ? propStatusFilter : localStatusFilter;
  const setStatusFilter = propOnStatusFilterChange
    ? propOnStatusFilterChange
    : setLocalStatusFilter;

  const vendorFilter =
    propVendorFilter !== undefined ? propVendorFilter : localVendorFilter;
  const setVendorFilter = propOnVendorFilterChange
    ? propOnVendorFilterChange
    : setLocalVendorFilter;

  // Pagination
  const [localCurrentPage, setLocalCurrentPage] = useState(1);
  const currentPage =
    propCurrentPage !== undefined ? propCurrentPage : localCurrentPage;

  const handlePageChange = (newPage: number | ((prev: number) => number)) => {
    if (propOnPageChange) {
      if (typeof newPage === 'function') {
        propOnPageChange(newPage(currentPage));
      } else {
        propOnPageChange(newPage);
      }
    } else {
      setLocalCurrentPage(newPage);
    }
  };

  const [localPageSize, setLocalPageSize] = useState(10);
  const pageSize = propPageSize !== undefined ? propPageSize : localPageSize;
  const handlePageSizeChange = (size: number) => {
    if (propOnPageSizeChange) {
      propOnPageSizeChange(size);
    } else {
      setLocalPageSize(size);
      setLocalCurrentPage(1);
    }
  };

  const itemsPerPage = pageSize;

  useEffect(() => {
    handlePageChange(1);
  }, [searchQuery, statusFilter, vendorFilter]);

  // PO creation state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPO, setNewPO] = useState({
    vendorId: '',
    status: 'Production' as const,
    orderedQty: 500,
    container: '',
    eta: '',
    sku: 'SKU-5501',
    itemName: 'Premium Heavy-Duty Casing',
    unitPrice: 24.5,
  });

  // Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  // Detail drawer sub-sections
  const [activeDrawerSection, setActiveDrawerSection] = useState<
    'details' | 'comments' | 'ocr' | 'emails'
  >('details');

  // New Comment state
  const [newCommentText, setNewCommentText] = useState('');

  // AI Email Generator state
  const [aiEmailGenerated, setAiEmailGenerated] = useState<string | null>(null);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);

  // Simulated OCR uploading state
  const [isUploadingOCR, setIsUploadingOCR] = useState(false);
  const [ocrSuccessMsg, setOcrSuccessMsg] = useState<string | null>(null);

  // Smart Search logic: search by PO number, Vendor, SKU, Container, or Invoice (Rule 11)
  const filteredPOs = purchaseOrders.filter((po) => {
    const matchesSearch =
      po.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.container.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (po.invoiceDetails?.invoiceNumber || '')
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      po.skus.some((sku) =>
        sku.toLowerCase().includes(searchQuery.toLowerCase()),
      );

    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    const matchesVendor =
      vendorFilter === 'all' || po.vendorId === vendorFilter;

    // Role-based restrictions: if Vendor role, can ONLY see their own POs (Rule 13)
    if (userRole === 'Vendor') {
      const vendorUser = vendors.find(
        (v) =>
          v.email.toLowerCase().includes('john@') ||
          v.email.toLowerCase().includes('emily@') ||
          v.email.toLowerCase().includes('sophia@'),
      );
      // ABC Manufacturing associated default
      return matchesSearch && matchesStatus && po.vendorId === 'VEND-001';
    }

    return matchesSearch && matchesStatus && matchesVendor;
  });

  // Pagination calculation
  const totalPages =
    propTotalCount !== undefined
      ? Math.ceil(propTotalCount / itemsPerPage) || 1
      : Math.ceil(filteredPOs.length / itemsPerPage) || 1;
  const normalizedCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (normalizedCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPOs =
    propTotalCount !== undefined
      ? filteredPOs
      : filteredPOs.slice(startIndex, endIndex);

  const selectedPO = purchaseOrders.find((po) => po.id === selectedPOId);

  // Comments for selected PO
  const selectedPOComments = comments.filter((c) => c.poId === selectedPOId);

  // Email Logs for selected PO
  const selectedPOEmails = emails.filter((e) => e.poId === selectedPOId);

  // Execute manual CSV export (Rule 12)
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent +=
      'PO Number,Vendor,Status,Ordered Qty,Received Qty,Container,Invoice,ETA,Delayed Days\n';

    filteredPOs.forEach((po) => {
      csvContent += `${po.id},"${po.vendorName}",${po.status},${po.orderedQty},${po.receivedQty},${po.container || 'N/A'},${po.invoiceStatus},${po.eta},${po.delayedDays}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `SupplyChainCRM_PO_Export_${new Date().toISOString().split('T')[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onAddActivity(
      'Exported filtered Purchase Order database to CSV',
      'PO Updated',
    );
  };

  // CSV Mock Import parsing (Rule 12)
  const handleImportCSV = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importCsvText.trim()) {
      setImportFeedback('Please paste valid CSV lines first.');
      return;
    }

    try {
      const lines = importCsvText.split('\n');
      let successCount = 0;

      lines.forEach((line, index) => {
        if (index === 0 && line.toLowerCase().includes('po')) return; // skip header
        if (!line.trim()) return;

        const parts = line.split(',');
        if (parts.length >= 4) {
          const id = `PO-${Math.floor(10000 + Math.random() * 90000)}`;
          const vendorId = parts[0]?.trim() || 'VEND-001';
          const vendor = vendors.find((v) => v.id === vendorId) || vendors[0];
          const status = (parts[1]?.trim() as any) || 'Production';
          const orderedQty = parseInt(parts[2]?.trim() || '500');
          const eta = parts[3]?.trim() || '2026-08-15';
          const sku = parts[4]?.trim() || 'SKU-5501';

          const itemPrice = 25.0;
          const po: PurchaseOrder = {
            id,
            vendorId: vendor.id,
            vendorName: vendor.name,
            status,
            orderedQty,
            receivedQty: 0,
            container: '',
            invoiceStatus: 'Pending',
            invoiceFile: null,
            invoiceDetails: null,
            eta,
            creationDate: new Date().toISOString().split('T')[0],
            delayedDays: 0,
            skus: [sku],
            items: [
              {
                sku,
                name: 'Imported Parts Sourcing',
                qty: orderedQty,
                unitPrice: itemPrice,
              },
            ],
            productionStage: 'Materials',
            commentsCount: 0,
            emailCount: 0,
          };

          onUpdatePO(po);
          successCount++;
        }
      });

      if (successCount > 0) {
        setImportFeedback(
          `Successfully imported ${successCount} new Purchase Orders!`,
        );
        onAddActivity(
          `Bulk imported ${successCount} Purchase Orders via CSV parser`,
          'PO Updated',
        );
        setTimeout(() => {
          setShowImportModal(false);
          setImportCsvText('');
          setImportFeedback(null);
        }, 1500);
      } else {
        setImportFeedback(
          'Error: CSV line parameters must match expected fields.',
        );
      }
    } catch {
      setImportFeedback(
        'Parsing failed. Check fields format. Expected format: vendor_id,status,quantity,eta_yyyy_mm_dd,sku',
      );
    }
  };

  // Create PO form submission
  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPO.vendorId || !newPO.eta) {
      alert('Please fill in Vendor selection and target delivery date.');
      return;
    }

    const vendor = vendors.find((v) => v.id === newPO.vendorId);
    if (!vendor) return;

    const generatedId = `PO-${Math.floor(10000 + Math.random() * 90000)}`;
    const createdPO: PurchaseOrder = {
      id: generatedId,
      vendorId: vendor.id,
      vendorName: vendor.name,
      status: newPO.status,
      orderedQty: Number(newPO.orderedQty),
      receivedQty: 0,
      container: newPO.container,
      invoiceStatus: 'Pending',
      invoiceFile: null,
      invoiceDetails: null,
      eta: newPO.eta,
      creationDate: new Date().toISOString().split('T')[0],
      delayedDays: 0,
      skus: [newPO.sku],
      items: [
        {
          sku: newPO.sku,
          name: newPO.itemName,
          qty: Number(newPO.orderedQty),
          unitPrice: newPO.unitPrice,
        },
      ],
      productionStage: 'Materials',
      commentsCount: 0,
      emailCount: 0,
    };

    onUpdatePO(createdPO); // triggers callback
    onAddActivity(
      `Created new Purchase Order ${generatedId} for ${vendor.name}`,
      'PO Updated',
    );
    onAddAudit(
      generatedId,
      'Create Purchase Order',
      'None',
      'Created',
      'Chrome 122',
      '127.0.0.1',
    );
    setShowCreateModal(false);
  };

  // AI Email Follow-up Generator (Rule 10)
  const generateAIFollowUp = () => {
    if (!selectedPO) return;
    setIsGeneratingEmail(true);
    setAiEmailGenerated(null);

    setTimeout(() => {
      const lateDays = selectedPO.delayedDays;
      const delayedText =
        lateDays > 0
          ? `The shipment is currently delayed by ${lateDays} days, missing our original target date of ${selectedPO.eta}.`
          : `We would like to request an updated status check regarding production timelines for our target ETA of ${selectedPO.eta}.`;

      const text = `Subject: URGENT: Timeline Follow-up - Purchase Order ${selectedPO.id}

Dear ${selectedPO.vendorName} Operations Team,

This is a friendly reminder regarding our active Purchase Order ${selectedPO.id} for ${selectedPO.orderedQty} units of ${selectedPO.items[0]?.name || 'essential component modules'}.

${delayedText}

Please confirm your current production stage (currently listed as: ${selectedPO.productionStage}). Additionally, provide any updated logistics details or shipping container allocations at your earliest convenience.

Thank you for your continuous support in keeping our supply chains connected.

Best regards,
Sourcing & S&OP Operations Team
Supply Chain CRM Coordinator`;

      setAiEmailGenerated(text);
      setIsGeneratingEmail(false);
    }, 1200);
  };

  // Post follow-up to Email Log
  const handleSendAIEmail = () => {
    if (!selectedPO || !aiEmailGenerated) return;

    const newEmail: EmailLog = {
      id: `EML-${Math.floor(200 + Math.random() * 800)}`,
      poId: selectedPO.id,
      subject: `Timeline Follow-up - Purchase Order ${selectedPO.id}`,
      sentAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      status: 'Sent',
      openCount: 0,
      lastOpenTime: null,
      linkClicks: 0,
      repliedAt: null,
      attachmentName: null,
    };

    onAddEmailLog(newEmail);
    onAddActivity(
      `Sent AI-Generated follow-up email to ${selectedPO.vendorName}`,
      'Email Sent',
    );
    setAiEmailGenerated(null);
    alert(
      `Email successfully pushed to queue for delivery to ${selectedPO.vendorName}.`,
    );
  };

  // PDF Upload Mock OCR reader (Rule 17)
  const handleSimulatedPdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedPO || !e.target.files?.[0]) return;
    setIsUploadingOCR(true);
    setOcrSuccessMsg(null);

    const file = e.target.files[0];

    setTimeout(() => {
      const parsedAmount = selectedPO.items.reduce(
        (sum, item) => sum + item.qty * item.unitPrice,
        0,
      );
      const invoiceNumber = `INV-OCR-${Math.floor(100000 + Math.random() * 900000)}`;

      const updatedPO: PurchaseOrder = {
        ...selectedPO,
        invoiceStatus: 'Uploaded',
        invoiceFile: file.name,
        invoiceDetails: {
          amount: parsedAmount,
          invoiceNumber,
          date: new Date().toISOString().split('T')[0],
          ocrExtracted: true,
        },
      };

      onUpdatePO(updatedPO);
      setIsUploadingOCR(false);
      setOcrSuccessMsg(
        `Successfully extracted! Inv Number: ${invoiceNumber}, Amount: $${parsedAmount.toLocaleString()}`,
      );
      onAddActivity(
        `Uploaded invoice PDF & extracted details via OCR for ${selectedPO.id}`,
        'Invoice Uploaded',
      );
      onAddAudit(
        selectedPO.id,
        'Invoice OCR Extraction',
        'Pending',
        'Uploaded',
        'Chrome 122',
        '127.0.0.1',
      );
    }, 1800);
  };

  // Add a discussion comment (Rule 7)
  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO || !newCommentText.trim()) return;

    const comment: Comment = {
      id: `COM-${Math.floor(100 + Math.random() * 900)}`,
      poId: selectedPO.id,
      user:
        userRole === 'Vendor' ? selectedPO.vendorName : 'Sourcing Lead (You)',
      role: userRole,
      message: newCommentText.trim(),
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };

    onAddComment(comment);
    onAddActivity(
      `Added discussion comment on ${selectedPO.id}`,
      'Vendor Comment',
    );
    setNewCommentText('');
  };

  // Move a card on production board
  const handleMoveKanban = (
    po: PurchaseOrder,
    newStage: typeof po.productionStage,
  ) => {
    const updated: PurchaseOrder = {
      ...po,
      productionStage: newStage,
      status: newStage === 'Ready to Ship' ? 'In Transit' : po.status,
    };
    onUpdatePO(updated);
    onAddActivity(
      `Moved ${po.id} production stage to ${newStage}`,
      'PO Updated',
    );
    onAddAudit(
      po.id,
      'Production Stage Shift',
      po.productionStage,
      newStage,
      'Chrome 122',
      '127.0.0.1',
    );
  };

  return (
    <div className="space-y-6 flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Tab Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-xs gap-4 flex-shrink-0">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveSubTab('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeSubTab === 'grid'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Master Grid View</span>
          </button>


          <button
            onClick={() => setActiveSubTab('kanban')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeSubTab === 'kanban'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Delay Overview</span>
          </button>

          <button
            onClick={() => setActiveSubTab('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeSubTab === 'calendar'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Shipment Calendar</span>
          </button>
        </div>

        {/* Global actions: Create PO, Import, Export */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-xs font-medium transition"
          >
            <FileUp className="h-3.5 w-3.5" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-xs font-medium transition"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>

          {userRole !== 'Vendor' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1 px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-medium transition shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Purchase Order</span>
            </button>
          )}
        </div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center gap-3 flex-shrink-0 justify-between">
        {activeSubTab === 'kanban' && (
          <div className="flex-1">
            <h3 className="font-display font-bold text-slate-900 text-sm">
              Purchase Order Overview
            </h3>
          </div>
        )}
        {activeSubTab !== 'kanban' && (
          <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Smart Search: PO#, Vendor, SKU, Container, Invoice number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white transition"
          />
        </div>
        )}

        <div className="flex items-center gap-2.5">
          {/* <div className="flex items-center gap-1">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-500">Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-hidden text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="Production">Production</option>
            <option value="In Transit">In Transit</option>
            <option value="Port of Entry">Port of Entry</option>
            <option value="Delivered">Delivered</option>
            <option value="Delayed">Delayed</option>
          </select> */}

          {userRole !== 'Vendor' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs font-medium text-slate-500">Vendor:</span>
              </div>
              <div className="w-40">
                <VendorInfiniteDropdown
                  value={vendorFilter}
                  onChange={setVendorFilter}
                  showAllOption={true}
                  placeholder="All Vendors"
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-hidden text-slate-700 w-full"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SUB-VIEW 1: MASTER GRID VIEW */}
      {activeSubTab === 'grid' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden flex-1 flex flex-col min-h-0 relative">
          {loading && <LoadingOverlay message="Please wait a moment..." />}
          <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 scroll-smooth">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold sticky top-0 z-10">
                  <th className="px-6 py-4 bg-slate-50">PO Number</th>
                    <th className="px-6 py-4 bg-slate-50">Order Id</th>
                  <th className="px-6 py-4 bg-slate-50">Vendor</th>
                  <th className="px-6 py-4 bg-slate-50">PO Items</th>
                  <th className="px-6 py-4 bg-slate-50">
                    Ordered / Received Qty
                  </th>
                 
                  <th className="px-6 py-4 bg-slate-50">Invoice Status</th>
                  <th className="px-6 py-4 bg-slate-50">Delivery ETA</th>
                  <th className="px-6 py-4 bg-slate-50 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedPOs.map((po) => (
                  <tr
                    key={po.id}
                    className={`hover:bg-slate-50/75 transition ${selectedPOId === po.id ? 'bg-indigo-50/20 font-medium' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-900 font-bold font-mono text-xs">
                          {po.id}
                        </span>
                        {po.status === 'Delayed' && (
                          <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                        )}
                      </div>
                    </td>
                      <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-900 font-bold font-mono text-xs">
                          {po.id}
                        </span>
                        {po.status === 'Delayed' && (
                          <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium">
                      {po.vendorName}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                          po.status === 'Production'
                            ? 'bg-sky-50 text-sky-700'
                            : po.status === 'In Transit'
                              ? 'bg-indigo-50 text-indigo-700'
                              : po.status === 'Port of Entry'
                                ? 'bg-amber-50 text-amber-700'
                                : po.status === 'Delivered'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {po.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <span className="font-bold text-slate-800">
                        {po.orderedQty}
                      </span>
                      <span className="text-slate-400">
                        {' '}
                        / {po.receivedQty}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 rounded-sm text-[10px] font-mono border ${
                          po.invoiceStatus === 'Approved'
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                            : po.invoiceStatus === 'Uploaded'
                              ? 'bg-sky-50 border-sky-100 text-sky-700'
                              : po.invoiceStatus === 'Rejected'
                                ? 'bg-rose-50 border-rose-100 text-rose-700'
                                : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}
                      >
                        {po.invoiceStatus || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono">
                      {po.eta}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPO(po.id);
                        }}
                        className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-md inline-flex items-center gap-1 font-semibold"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Profile</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredPOs.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-12 text-center text-slate-400 italic"
                    >
                      No Purchase Orders found matching search or filter
                      parameters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {filteredPOs.length > 0 && (
            <Pagination
              currentPage={normalizedCurrentPage}
              totalCount={
                propTotalCount !== undefined
                  ? propTotalCount
                  : filteredPOs.length
              }
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </div>
      )}



      {/* SUB-VIEW 2: KANBAN PRODUCTION STAGES */}
      {activeSubTab === 'kanban' && (
        <div className="flex-1 min-h-0 relative flex flex-col">
          {loading && (
            <LoadingOverlay
              message="Please wait a moment..."
              className="bg-slate-50/60"
            />
          )}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 overflow-y-auto min-h-0 pb-4">
            {(
              [
                '1. New',
                '2. Invoice Delayed',
                '3. Delivery Delayed',
                '4. Remaining Order Items',
              ] as string[]
            ).map((stage) => {
              const stagePOs = filteredPOs.filter(
                (po) => po.status === stage || (stage === '1. New' && po.status === 'New')
              );
              return (
                <div
                  key={stage}
                  className="bg-slate-100/50 p-4 rounded-xl border border-slate-200/50 flex flex-col min-h-[500px]"
                >
                  <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
                    <h4 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                      {stage}
                    </h4>
                    <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                      {stagePOs.length}
                    </span>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {stagePOs.map((po) => (
                      <div
                        key={po.id}
                        onClick={() => onSelectPO(po.id)}
                        className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition cursor-pointer space-y-2 relative group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-slate-800">
                            {po.id}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded-xs text-[9px] font-bold ${
                              po.status === 'Delayed'
                                ? 'bg-rose-50 text-rose-700'
                                : po.status === 'In Transit'
                                  ? 'bg-indigo-50 text-indigo-700'
                                  : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {po.status}
                          </span>
                        </div>

                        <div>
                          <p className="text-[11px] font-bold text-slate-700 truncate">
                            {po.vendorName}
                          </p>
                          <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                            ETA: {po.eta}
                          </p>
                        </div>

                        <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-[9px]">
                          <span className="text-slate-500 font-mono">
                            Qty:{' '}
                            <strong className="text-slate-800 font-bold">
                              {po.orderedQty}
                            </strong>
                          </span>
                          <span className="text-[8px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-sm font-mono truncate max-w-[70px]">
                            {po.container || 'No Vessel'}
                          </span>
                        </div>

                        {/* Kanban Quick Transition arrows for Admin/Staff */}
                        {userRole !== 'Vendor' && (
                          <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition flex gap-1 bg-white pl-1.5 shadow-sm rounded-sm">
                            {stage !== '1. New' && (
                              <button
                                title="Move Previous Stage"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const stages: string[] =
                                    [
                                      '1. New',
                                      '2. Invoice Delayed',
                                      '3. Delivery Delayed',
                                      '4. Remaining Order Items',
                                    ];
                                  const idx = stages.indexOf(stage);
                                  handleMoveKanban(po, stages[idx - 1] as any);
                                }}
                                className="px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-sm text-[9px] font-bold"
                              >
                                ←
                              </button>
                            )}
                            {stage !== '4. Remaining Order Items' && (
                              <button
                                title="Move Next Stage"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const stages: string[] =
                                    [
                                      '1. New',
                                      '2. Invoice Delayed',
                                      '3. Delivery Delayed',
                                      '4. Remaining Order Items',
                                    ];
                                  const idx = stages.indexOf(stage);
                                  handleMoveKanban(po, stages[idx + 1] as any);
                                }}
                                className="px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-sm text-[9px] font-bold"
                              >
                                →
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {stagePOs.length === 0 && (
                      <div className="h-32 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-[10px] text-slate-400 italic">
                        No orders in stage
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: SHIPMENT CALENDAR */}
      {activeSubTab === 'calendar' && (
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-xs flex-1 min-h-0 relative flex flex-col">
          {loading && (
            <LoadingOverlay
              message="Please wait a moment..."
              className="rounded-xl"
            />
          )}
          <div className="overflow-y-auto flex-1 min-h-0 pr-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-sm">
                  Active Container Arrival Calendar
                </h3>
                <p className="text-xs text-slate-500">
                  Visualizing estimated container arrivals for active purchase
                  orders (Schedules for July 2026).
                </p>
              </div>
              <span className="text-xs font-bold text-indigo-600 font-mono">
                July 2026
              </span>
            </div>

            <div className="grid grid-cols-7 gap-1 bg-slate-100 p-1 rounded-xl text-center text-xs">
              {/* Days of week */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="py-2 text-slate-500 font-semibold">
                  {d}
                </div>
              ))}

              {/* Empty days prior to July 2026 starting date (July 1st was Wednesday -> 3 empty days) */}
              {[1, 2, 3].map((n) => (
                <div
                  key={`empty-${n}`}
                  className="bg-slate-50/50 rounded-lg min-h-[90px] p-1 text-slate-300"
                ></div>
              ))}

              {/* Calendar Days */}
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                const dateStr = `2026-07-${day.toString().padStart(2, '0')}`;
                const dayPOs = filteredPOs.filter(
                  (po) => po.eta === dateStr && po.container,
                );

                return (
                  <div
                    key={day}
                    className="bg-white border border-slate-100 rounded-lg min-h-[90px] p-1.5 text-left flex flex-col justify-between hover:bg-slate-50/50 transition"
                  >
                    <span className="text-[10px] font-bold font-mono text-slate-400">
                      {day}
                    </span>

                    <div className="space-y-1 mt-1 flex-1 overflow-y-auto">
                      {dayPOs.map((po) => (
                        <div
                          key={po.id}
                          onClick={() => onSelectPO(po.id)}
                          className={`text-[9px] p-1 rounded-sm border cursor-pointer leading-tight truncate ${
                            po.status === 'Delayed'
                              ? 'bg-rose-50 border-rose-100 text-rose-700 font-semibold'
                              : po.status === 'In Transit'
                                ? 'bg-indigo-50 border-indigo-100 text-indigo-700'
                                : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                          }`}
                          title={`${po.id}: ${po.vendorName} Container ${po.container}`}
                        >
                          <strong className="font-mono">{po.id}</strong> (
                          {po.container})
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PO DETAIL OVERLAY MODAL (Rule 2) */}
      {selectedPO && (
        <div
          onClick={() => onSelectPO(null)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-5xl w-full h-[85vh] max-h-[85vh] flex flex-col overflow-hidden animate-scaleUp"
          >
            {/* Header */}
            <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between z-20">
              <div className="flex items-center gap-3">
                <span className="text-base font-bold font-mono text-slate-900 bg-white border border-slate-200 px-3 py-1 rounded-lg">
                  {selectedPO.id}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {selectedPO.vendorName}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Sourcing country: Vietnam • Created:{' '}
                    {selectedPO.creationDate}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    selectedPO.status === 'Production'
                      ? 'bg-sky-50 text-sky-700'
                      : selectedPO.status === 'In Transit'
                        ? 'bg-indigo-50 text-indigo-700'
                        : selectedPO.status === 'Port of Entry'
                          ? 'bg-amber-50 text-amber-700'
                          : selectedPO.status === 'Delivered'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {selectedPO.status}
                </span>
                <button
                  onClick={() => onSelectPO(null)}
                  className="p-1.5 hover:bg-slate-200 rounded-md text-slate-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Tab Selection inside Modal */}
            <div className="flex border-b border-slate-100 bg-slate-50/50 z-20">
              {(['details', 'comments', 'ocr', 'emails'] as const).map(
                (section) => (
                  <button
                    key={section}
                    onClick={() => setActiveDrawerSection(section)}
                    className={`flex-1 py-3 text-xs font-bold capitalize border-b-2 transition ${
                      activeDrawerSection === section
                        ? 'border-indigo-600 text-indigo-600 bg-white'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {section === 'ocr'
                      ? 'OCR Invoice Reader'
                      : section === 'emails'
                        ? 'Email History'
                        : section}
                  </button>
                ),
              )}
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              {/* TAB: DETAILS */}
              {activeDrawerSection === 'details' && (
                <div className="space-y-6">
                  {/* Visual Production Timeline */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">
                      Production Stage Timeline
                    </h4>
                    <div className="flex items-center justify-between relative">
                      <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
                      {[
                        'Materials',
                        'Assembly',
                        'Quality Check',
                        'Packaging',
                        'Ready to Ship',
                      ].map((stage, idx, arr) => {
                        const currentIdx = arr.indexOf(
                          selectedPO.productionStage,
                        );
                        const isCompleted = idx < currentIdx;
                        const isActive = idx === currentIdx;

                        return (
                          <div
                            key={stage}
                            className="flex flex-col items-center relative z-10 w-16 text-center"
                          >
                            <div
                              className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shadow-xs transition ${
                                isCompleted
                                  ? 'bg-emerald-500 text-white'
                                  : isActive
                                    ? 'bg-indigo-600 text-white animate-pulse'
                                    : 'bg-white border-2 border-slate-200 text-slate-400'
                              }`}
                            >
                              {isCompleted ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                idx + 1
                              )}
                            </div>
                            <span
                              className={`text-[9px] mt-1.5 font-medium leading-tight ${isActive ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}
                            >
                              {stage}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Stats Panel - Changed from col-span-2 to col-span-3 to occupy full width while Internal Approval Status is temporarily hidden */}
                    <div className="space-y-3 md:col-span-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-medium block">
                            Ordered Quantity
                          </span>
                          <strong className="text-sm font-bold text-slate-800 font-mono">
                            {selectedPO.orderedQty} units
                          </strong>
                        </div>
                        <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-medium block">
                            Received Quantity
                          </span>
                          <strong className="text-sm font-bold text-slate-800 font-mono">
                            {selectedPO.receivedQty} units
                          </strong>
                        </div>
                        <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-medium block">
                            Container ID
                          </span>
                          <strong className="text-sm font-bold text-indigo-700 font-mono">
                            {selectedPO.container || 'Awaiting Vessel Booking'}
                          </strong>
                        </div>
                        <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-medium block">
                            Delivery ETA
                          </span>
                          <strong className="text-sm font-bold text-slate-800 font-mono">
                            {selectedPO.eta}
                          </strong>
                        </div>
                      </div>

                      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                        <h5 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">
                          Item Specifications (Products)
                        </h5>
                        <div className="overflow-x-auto overflow-y-auto max-h-[295px] rounded-lg border border-slate-100 bg-white">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-widest font-semibold text-[9px] sticky top-0 z-10">
                                <th className="px-3 py-2 bg-slate-50">SKU</th>
                                <th className="px-3 py-2 bg-slate-50">
                                  Product Name
                                </th>
                                <th className="px-3 py-2 bg-slate-50 text-right">
                                  Ordered Qty
                                </th>
                                <th className="px-3 py-2 bg-slate-50 text-right">
                                  Received Qty
                                </th>
                                 <th className="px-3 py-2 bg-slate-50 text-right">
                                  Remaining Qty
                                </th>
                                <th className="px-3 py-2 bg-slate-50 text-right">
                                  Unit Price
                                </th>
                                <th className="px-3 py-2 bg-slate-50 text-right">
                                  Total
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                              {selectedPO.items &&
                              selectedPO.items.length > 0 ? (
                                selectedPO.items.map((item) => (
                                  <tr
                                    key={item.sku}
                                    className="hover:bg-slate-50/50 transition"
                                  >
                                    <td className="px-3 py-2 font-mono font-bold text-slate-500 whitespace-nowrap">
                                      {item.sku}
                                    </td>
                                    <td className="px-3 py-2 font-medium text-slate-800 break-words max-w-[150px]">
                                      {item.name}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono font-medium">
                                      {item.qty.toLocaleString()}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono font-medium text-slate-500">
                                      {(item.receivedQty !== undefined
                                        ? item.receivedQty
                                        : 0
                                      ).toLocaleString()}
                                    </td>
                                     <td className="px-3 py-2 text-right font-mono font-medium text-slate-500">
                                      {(item.receivedQty !== undefined
                                        ? item.receivedQty
                                        : 0
                                      ).toLocaleString()}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono font-medium">
                                      ${item.unitPrice.toFixed(2)}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono font-bold text-indigo-600">
                                      ${(item.qty * item.unitPrice).toFixed(2)}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td
                                    colSpan={5}
                                    className="px-3 py-6 text-center text-slate-400 italic"
                                  >
                                    No items specified for this purchase order.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: COMMENTS DISCUSSION ENGINE */}
              {activeDrawerSection === 'comments' && (
                <div className="space-y-4">
                  <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-2">
                    {selectedPOComments.map((comment) => (
                      <div
                        key={comment.id}
                        className="p-3 rounded-xl border border-slate-100 bg-slate-50/50"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              {comment.user}
                            </span>
                            <span className="text-[9px] uppercase font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-sm">
                              {comment.role}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {comment.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {comment.message}
                        </p>
                      </div>
                    ))}
                    {selectedPOComments.length === 0 && (
                      <p className="text-xs text-slate-400 italic text-center py-6">
                        No discussions started yet. Begin the thread below.
                      </p>
                    )}
                  </div>

                  <form
                    onSubmit={handlePostComment}
                    className="flex gap-2 border-t border-slate-100 pt-3"
                  >
                    <input
                      type="text"
                      placeholder="Ask Emily (Warehouse) or Michael (Finance) for details..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white transition"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                    >
                      <Send className="h-3 w-3" />
                      <span>Comment</span>
                    </button>
                  </form>
                </div>
              )}

              {/* TAB: OCR INVOICE READER */}
              {activeDrawerSection === 'ocr' && (
                <div className="space-y-6">
                  <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                    <h4 className="text-xs font-bold text-indigo-950 mb-1 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                      <span>AI-Powered OCR Invoice Analyzer</span>
                    </h4>
                    <p className="text-[11px] text-indigo-800 leading-relaxed">
                      Upload a raw PDF invoice from the manufacturer. Aerocrm
                      will automatically parse details like billing quantities,
                      unit prices, and vendor info, matching them against this
                      Purchase Order to prevent discrepancies.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Drop area */}
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-indigo-400 transition cursor-pointer relative">
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg"
                        onChange={handleSimulatedPdfUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <Upload className="h-8 w-8 text-slate-400 mb-2" />
                      <span className="text-xs font-bold text-slate-700">
                        Drag & drop or Click to browse
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1">
                        Supports PDF, PNG, JPEG up to 10MB
                      </span>
                    </div>

                    {/* OCR results panel */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                      <div>
                        <h5 className="text-xs font-bold text-slate-700 mb-2 uppercase">
                          Extraction Audit Details
                        </h5>
                        {isUploadingOCR ? (
                          <div className="space-y-2 animate-pulse py-4">
                            <div className="h-3 bg-slate-200 rounded-sm w-3/4" />
                            <div className="h-3 bg-slate-200 rounded-sm w-1/2" />
                          </div>
                        ) : selectedPO.invoiceDetails ? (
                          <div className="space-y-3 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-400">
                                Invoice Ref:
                              </span>
                              <span className="font-mono font-bold text-slate-800">
                                {selectedPO.invoiceDetails.invoiceNumber}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">
                                Extracted Amount:
                              </span>
                              <span className="font-mono font-bold text-slate-800">
                                $
                                {selectedPO.invoiceDetails.amount.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">
                                OCR Timestamp:
                              </span>
                              <span className="font-mono text-slate-600">
                                {selectedPO.invoiceDetails.date}
                              </span>
                            </div>
                            <div className="flex justify-between items-center border-t border-slate-200 pt-2 mt-2">
                              <span className="text-slate-500 font-semibold">
                                Integrity Check:
                              </span>
                              <span className="text-emerald-600 font-bold flex items-center gap-1 text-[10px]">
                                <CheckCircle className="h-3.5 w-3.5" />
                                <span>100% Matches PO Items</span>
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic py-6">
                            No invoice parsed yet. Upload an invoice to trigger
                            OCR analysis.
                          </p>
                        )}
                      </div>

                      {ocrSuccessMsg && (
                        <div className="mt-2 text-[10px] text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-100 font-mono leading-tight">
                          {ocrSuccessMsg}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: EMAIL HISTORY & AI GENERATOR */}
              {activeDrawerSection === 'emails' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-700">
                        Connected Vendor Email Engagement Logs
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Track delivered outreach, opens, and replies directly
                        inside PO context.
                      </p>
                    </div>

                    <button
                      onClick={generateAIFollowUp}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition border border-indigo-100"
                      disabled={isGeneratingEmail}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>
                        {isGeneratingEmail
                          ? 'Writing...'
                          : 'Generate AI Follow-up'}
                      </span>
                    </button>
                  </div>

                  {/* AI Email draft output preview */}
                  {aiEmailGenerated && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-indigo-100 space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-950 flex items-center gap-1">
                          <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                          <span>Prepared AI Sourcing Template</span>
                        </span>
                        <button
                          onClick={() => setAiEmailGenerated(null)}
                          className="p-1 hover:bg-slate-200 rounded-md text-slate-400"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <textarea
                        value={aiEmailGenerated}
                        onChange={(e) => setAiEmailGenerated(e.target.value)}
                        rows={8}
                        className="w-full bg-white p-3 text-xs border border-slate-200 rounded-lg font-mono leading-relaxed focus:outline-hidden"
                      />

                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setAiEmailGenerated(null)}
                          className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-md text-xs font-medium"
                        >
                          Discard Draft
                        </button>
                        <button
                          onClick={handleSendAIEmail}
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-bold flex items-center gap-1"
                        >
                          <Send className="h-3 w-3" />
                          <span>Send to {selectedPO.vendorName}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Local PO outreach table */}
                  <div className="space-y-3">
                    {selectedPOEmails.map((email) => (
                      <div
                        key={email.id}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-1">
                          <h5 className="font-semibold text-slate-800">
                            {email.subject}
                          </h5>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Sent: {email.sentAt} • Status:{' '}
                            <strong className="text-indigo-600">
                              {email.status}
                            </strong>
                          </p>
                        </div>

                        <div className="text-right space-y-1">
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-sm">
                            Opens: {email.openCount}
                          </span>
                          {email.repliedAt && (
                            <p className="text-[9px] text-emerald-600 font-semibold font-mono">
                              Replied: {email.repliedAt.split(' ')[1]}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {selectedPOEmails.length === 0 && (
                      <p className="text-xs text-slate-400 italic text-center py-4">
                        No emails have been logged for this Purchase Order.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE PURCHASE ORDER FORM (Rule 2) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-lg w-full p-6 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="font-display font-bold text-slate-900 text-base">
                Generate New Purchase Order
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Target Manufacturing Vendor
                </label>
                <VendorInfiniteDropdown
                  value={newPO.vendorId}
                  onChange={(val) => setNewPO.vendorId(val)}
                  placeholder="-- Choose Vendor --"
                  className="w-full p-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Ordered Quantity (Units)
                  </label>
                  <input
                    type="number"
                    value={newPO.orderedQty}
                    onChange={(e) =>
                      setNewPO.orderedQty(Number(e.target.value))
                    }
                    className="w-full p-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Estimated Arrival ETA
                  </label>
                  <input
                    type="date"
                    value={newPO.eta}
                    onChange={(e) => setNewPO.eta(e.target.value)}
                    className="w-full p-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    SKU Number
                  </label>
                  <input
                    type="text"
                    value={newPO.sku}
                    onChange={(e) => setNewPO.sku(e.target.value)}
                    className="w-full p-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Fulfillment Container ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., CNT-095"
                    value={newPO.container}
                    onChange={(e) => setNewPO.container(e.target.value)}
                    className="w-full p-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Component Description
                  </label>
                  <input
                    type="text"
                    value={newPO.itemName}
                    onChange={(e) => setNewPO.itemName(e.target.value)}
                    className="w-full p-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
                >
                  Generate Sourcing PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IMPORT CSV FORM (Rule 12) */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-lg w-full p-6 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="font-display font-bold text-slate-900 text-base">
                Bulk Sourcing PO CSV Importer
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleImportCSV} className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Paste your spreadsheet rows below to import Purchase Orders in
                bulk. Follow the expected format carefully.
              </p>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-[10px] text-slate-600 leading-tight">
                <strong>Expected Fields:</strong> vendor_id, status, quantity,
                eta_yyyy_mm_dd, sku
                <br />
                <strong>Example Row:</strong> VEND-001, Production, 750,
                2026-08-30, SKU-5501
              </div>

              <div>
                <textarea
                  placeholder="VEND-001,Production,750,2026-08-30,SKU-5501&#10;VEND-004,In Transit,1200,2026-07-28,SKU-2041"
                  value={importCsvText}
                  onChange={(e) => setImportCsvText(e.target.value)}
                  rows={6}
                  className="w-full bg-slate-50 p-3 text-xs border border-slate-200 rounded-lg font-mono focus:outline-hidden focus:bg-white focus:border-indigo-500 transition"
                />
              </div>

              {importFeedback && (
                <div
                  className={`p-2.5 rounded-lg border font-semibold text-xs text-center ${
                    importFeedback.includes('Successfully')
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                      : 'bg-rose-50 border-rose-100 text-rose-700'
                  }`}
                >
                  {importFeedback}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                >
                  Parse & Synchronize Rows
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
