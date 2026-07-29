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
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Copy,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { Tooltip } from 'react-tooltip';
import { PurchaseOrder, Vendor, Comment, EmailLog, UserRole } from '../types';
import { updatePOLeadTime, exportPurchaseOrdersCSV, getPurchaseOrders, postPOComment } from '../services/purchaseOrder.service';
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
  sortConfig?: { key: string | null; direction: 'asc' | 'desc' | null };
  onSortChange?: (key: string | null, direction: 'asc' | 'desc' | null) => void;
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
  sortConfig: propSortConfig,
  onSortChange: propOnSortChange,
}: POManagementProps) {
  const reduxPOs = useSelector((state: any) => state.purchaseOrders.list);
  const kanbanList = useSelector((state: any) => state.purchaseOrders.kanbanList || {});


  const purchaseOrders = reduxPOs || [];
  // Navigation inside PO module
  const [activeSubTab, setActiveSubTab] = useState<
    'grid' | 'kanban' | 'calendar'
  >('grid');

  // Filtering and Searching
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [localStatusFilter, setLocalStatusFilter] = useState<string>('all');
  const [localVendorFilter, setLocalVendorFilter] = useState<string>('all');
  const [leadTimeDays, setLeadTimeDays] = useState<string>('');

  useEffect(() => {
    if (selectedPOId) {
      const po = purchaseOrders.find((p: any) => p.id === selectedPOId);
      if (po && po.containerLeadTimeDays) {
        setLeadTimeDays(po.containerLeadTimeDays.toString());
      } else {
        setLeadTimeDays('');
      }
    }
  }, [selectedPOId, purchaseOrders]);

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

  // Export State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFilterStatus, setExportFilterStatus] = useState<string>('all');
  const [exportColumns, setExportColumns] = useState<string[]>([]);

  const PO_LEVEL_COLUMNS = [
    'PO ID',
    'PO Title',
    'Vendor',
    'Status Code',
    'Receiving Status',
    'Created On',
    'Date Ordered',
    'Expected Delivery',
    'Invoice Date',
    'Lead Time (days)',
    'Total Amount',
    'Currency',
  ];

  const ITEM_LEVEL_COLUMNS = [
    'Item ID',
    'SKU',
    'Product Name',
    'Qty Ordered',
    'Qty Received',
    'Qty in Container',
    'Unit Price',
    'Cases Ordered',
    'Units per Case',
    'Case Price',
    'Item Expected Delivery',
  ];

  const CONTAINER_LEVEL_COLUMNS = ['Container Name', 'Container ETA'];

  // Detail drawer sub-sections
  const [activeDrawerSection, setActiveDrawerSection] = useState<
    'details' | 'comments' | 'ocr' | 'emails'
  >('details');

  // New Comment state
  const [newCommentText, setNewCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  // AI Email Generator state
  const [aiEmailGenerated, setAiEmailGenerated] = useState<string | null>(null);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);

  // Simulated OCR uploading state
  const [isUploadingOCR, setIsUploadingOCR] = useState(false);
  const [ocrSuccessMsg, setOcrSuccessMsg] = useState<string | null>(null);

  const [localSortConfig, setLocalSortConfig] = useState<{
    key: keyof PurchaseOrder | 'invoiceDate' | null;
    direction: 'asc' | 'desc' | null;
  }>({ key: null, direction: null });

  const activeSortConfig = propSortConfig !== undefined ? propSortConfig : localSortConfig;

  const handleSort = (key: keyof PurchaseOrder | 'invoiceDate') => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (activeSortConfig.key === key) {
      if (activeSortConfig.direction === 'asc') direction = 'desc';
      else if (activeSortConfig.direction === 'desc') direction = null;
    }
    
    if (propOnSortChange) {
      propOnSortChange(direction ? key : null, direction);
    } else {
      setLocalSortConfig({ key: direction ? key : null, direction });
    }
  };

  const sortedPOs = [...purchaseOrders.filter((po) => {
    const matchesSearch =
      po.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.container.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (po.invoiceDetails?.invoiceNumber || '')
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      po.skus.some((sku) =>
        sku.toLowerCase().includes(searchQuery.toLowerCase()),
      );

    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;

    // Role-based restrictions: if Vendor role, can ONLY see their own POs (Rule 13)
    if (userRole === 'Vendor') {
      return matchesSearch && matchesStatus && po.vendorId === 'VEND-001';
    }

    return matchesSearch && matchesStatus;
  })].sort((a, b) => {
    if (!activeSortConfig.key || !activeSortConfig.direction) return 0;
    
    let aValue: any;
    let bValue: any;
    
    if (activeSortConfig.key === 'invoiceDate') {
      aValue = a.invoiceDetails?.date || (a as any).invoice_date || '';
      bValue = b.invoiceDetails?.date || (b as any).invoice_date || '';
    } else {
      aValue = a[activeSortConfig.key as keyof PurchaseOrder] || '';
      bValue = b[activeSortConfig.key as keyof PurchaseOrder] || '';
    }

    if (aValue < bValue) return activeSortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return activeSortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredPOs = sortedPOs;

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

  // Items Pagination for selected PO (Rule 23)
  const [itemsCurrentPage, setItemsCurrentPage] = useState(1);
  const itemsPageSize = 10;
  
  useEffect(() => {
    setItemsCurrentPage(1);
  }, [selectedPOId]);

  const totalItemsCount = selectedPO?.items?.length || 0;
  const paginatedItems = selectedPO?.items 
    ? selectedPO.items.slice((itemsCurrentPage - 1) * itemsPageSize, itemsCurrentPage * itemsPageSize) 
    : [];

  // Comments for selected PO
  const selectedPOComments = comments.filter((c) => c.poId === selectedPOId);

  // Email Logs for selected PO
  const selectedPOEmails = emails.filter((e) => e.poId === selectedPOId);

  // Execute CSV export using backend API (Rule 12)
  const handleExportCSVClick = () => {
    setExportColumns([]);
    setExportFilterStatus('all');
    setShowExportModal(true);
  };

  const executeExportCSV = async () => {
    let finalColumns = exportColumns;
    if (finalColumns.length === 0) {
      finalColumns = [...PO_LEVEL_COLUMNS, ...ITEM_LEVEL_COLUMNS, ...CONTAINER_LEVEL_COLUMNS];
    }

    try {
      const toastId = toast.loading('Generating CSV Export...');

      const payload: any = {
        columns: finalColumns,
        filter_status: exportFilterStatus,
      };

      const blob = await exportPurchaseOrdersCSV(payload);

      const downloadUrl = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute(
        'download',
        `SupplyChainCRM_PO_Export_${new Date().toISOString().split('T')[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.update(toastId, { render: 'Export successful!', type: 'success', isLoading: false, autoClose: 3000 });
      onAddActivity('Exported PO list via backend API', 'PO Updated');
      setShowExportModal(false);
    } catch (error) {
      console.error('Export failed', error);
      toast.dismiss();
      toast.error('Failed to export CSV. Please try again.');
    }
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

  // Add a discussion comment — calls real API
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO || !newCommentText.trim() || isPostingComment) return;

    const messageText = newCommentText.trim();

    // Optimistic UI update immediately
    const optimisticComment: Comment = {
      id: `COM-OPT-${Date.now()}`,
      poId: selectedPO.id,
      user:
        userRole === 'Vendor' ? selectedPO.vendorName : 'Sourcing Lead (You)',
      role: userRole,
      message: messageText,
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };
    onAddComment(optimisticComment);
    setNewCommentText('');

    // Post to API in background
    setIsPostingComment(true);
    try {
      await postPOComment(selectedPO.id, messageText);
      onAddActivity(
        `Added discussion comment on ${selectedPO.id}`,
        'Vendor Comment',
      );
    } catch (err) {
      console.error('Failed to save comment to server:', err);
      toast.error('Comment posted locally but failed to save on server.');
    } finally {
      setIsPostingComment(false);
    }
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
        </div>

        {/* Global actions: Create PO, Import, Export */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-xs font-medium transition"
          >
            <FileUp className="h-3.5 w-3.5" />
            <span>Import CSV</span>
          </button> */}

          {activeSubTab !== 'kanban' && (
            <button
              onClick={handleExportCSVClick}
              className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-xs font-medium transition"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          )}

          {/* {userRole !== 'Vendor' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1 px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-medium transition shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Purchase Order</span>
            </button>
          )} */}
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
                  <th className="px-6 py-4 bg-slate-50 cursor-pointer select-none group hover:text-indigo-600 transition-colors" onClick={() => handleSort('id')}>
                    <div className="flex items-center gap-1">
                      PO Number
                      <span className="text-slate-400 group-hover:text-indigo-600">
                        {activeSortConfig.key === 'id' ? (activeSortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-50 outline-hidden" />}
                      </span>
                    </div>
                  </th>
                  <th className="px-6 py-4 bg-slate-50">Order Id</th>
                  <th className="px-6 py-4 bg-slate-50 cursor-pointer select-none group hover:text-indigo-600 transition-colors" onClick={() => handleSort('creationDate')}>
                    <div className="flex items-center gap-1">
                      <div className="flex flex-col">
                        <span>Order Date</span>
                        <span className="text-[9px] text-slate-400 normal-case">(YYYY-MM-DD)</span>
                      </div>
                      <span className="text-slate-400 group-hover:text-indigo-600">
                        {activeSortConfig.key === 'creationDate' ? (activeSortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-50 outline-hidden" />}
                      </span>
                    </div>
                  </th>
                  <th className="px-6 py-4 bg-slate-50">
                    Vendor
                  </th>
                  <th className="px-6 py-4 bg-slate-50">PO Items</th>
                  <th className="px-6 py-4 bg-slate-50">Ordered / Received Qty</th>
                  <th className="px-6 py-4 bg-slate-50 cursor-pointer select-none group hover:text-indigo-600 transition-colors" onClick={() => handleSort('invoiceDate')}>
                    <div className="flex items-center gap-1">
                      <div className="flex flex-col">
                        <span>Invoice Date</span>
                        <span className="text-[9px] text-slate-400 normal-case">(YYYY-MM-DD)</span>
                      </div>
                      <span className="text-slate-400 group-hover:text-indigo-600">
                        {activeSortConfig.key === 'invoiceDate' ? (activeSortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-50 outline-hidden" />}
                      </span>
                    </div>
                  </th>
                  <th className="px-6 py-4 bg-slate-50">Invoice Delay Status</th>
                  <th className="px-6 py-4 bg-slate-50 cursor-pointer select-none group hover:text-indigo-600 transition-colors" onClick={() => handleSort('eta')}>
                    <div className="flex items-center gap-1">
                      <div className="flex flex-col">
                        <span>Scheduled Delivery</span>
                        <span className="text-[9px] text-slate-400 normal-case">(YYYY-MM-DD)</span>
                      </div>
                      <span className="text-slate-400 group-hover:text-indigo-600">
                        {activeSortConfig.key === 'eta' ? (activeSortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-50 outline-hidden" />}
                      </span>
                    </div>
                  </th>
                  <th className="px-6 py-4 bg-slate-50">Container Count</th>
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
                      <div className="flex flex-col gap-1 items-start">
                        <div className="flex items-center gap-1 max-w-[100px] overflow-hidden whitespace-nowrap text-ellipsis">
                          <span 
                            className="text-slate-900 font-bold font-mono text-[10px] truncate"
                            title={po.id}
                          >
                            {po.id}
                          </span>
                          {po.status === 'Delayed' && (
                            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                          )}
                        </div>
                        {po.containerLeadTimeDays && (
                          <span className="text-slate-500 font-mono text-[9px]">
                            Lead Days: {po.containerLeadTimeDays}d
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={
                          !po.orderId || po.orderId === 'N/A'
                            ? 'px-2 py-0.5 rounded-sm text-[10px] font-mono border bg-slate-50 border-slate-200 text-slate-500'
                            : 'text-[11px] font-bold text-slate-700'
                        }
                      >
                        {(!po.orderId || po.orderId === 'N/A') ? 'Stock' : po.orderId}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {po.creationDate && po.creationDate !== 'N/A' ? (
                        <span className="text-[11px] font-bold text-slate-700">{po.creationDate}</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono border bg-slate-50 border-slate-200 text-slate-500">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium">
                      {po.vendorName}
                    </td>
                  
                    <td className="px-6 py-4">
                      <span 
                        title={po.items && po.items.length > 0 ? po.items.map(item => item.name).join(', ') : 'N/A'}
                        className={
                          !po.items || po.items.length === 0
                            ? 'px-2 py-0.5 rounded-sm text-[10px] font-mono border bg-slate-50 border-slate-200 text-slate-500'
                            : 'text-[11px] font-bold text-slate-700'
                        }
                      >
                        {po.items && po.items.length > 0 ? po.items.length : 'N/A'}
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
                      {po.invoiceDetails?.date ? (
                        <span className="text-[11px] font-bold text-slate-700">{po.invoiceDetails.date}</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono border bg-slate-50 border-slate-200 text-slate-500">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const invoiceDate = (po as any).invoice_date || po.invoiceDetails?.date;
                        const createdOn = (po as any).created_on || po.creationDate;
                        
                        if (invoiceDate) {
                          return <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono border bg-emerald-50 border-emerald-100 text-emerald-700">On Time</span>;
                        }

                        if (!createdOn || createdOn === 'N/A') {
                          return <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono border bg-slate-50 border-slate-200 text-slate-500">N/A</span>;
                        }

                        const orderDate = new Date(createdOn);
                        const today = new Date();
                        const diffDays = Math.floor((today.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
                        
                        if (diffDays > 10) {
                          return <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono border bg-rose-50 border-rose-100 text-rose-700 animate-pulse">Delay</span>;
                        }
                        
                        return <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono border bg-amber-50 border-amber-100 text-amber-700">Pending</span>;
                      })()}
                    </td>
                    {/* <td className="px-6 py-4">
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
                    </td> */}
                    <td className="px-6 py-4 text-slate-600 font-mono">
                      <span
                        className={
                          !po.expected_delivery_date || po.expected_delivery_date === 'N/A'
                            ? 'px-2 py-0.5 rounded-sm text-[10px] font-mono border bg-slate-50 border-slate-200 text-slate-500'
                            : 'text-[11px] font-bold text-slate-700'
                        }
                      >
                        {po.expected_delivery_date || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                      {po.containerNames && po.containerNames.length > 0 ? (
                        <span 
                          title={po.containerNames.join(', ')}
                          className="text-[11px] font-bold text-slate-700"
                        >
                          {po.containerNames.length} 
                        </span>
                      ) : (!po.container || po.container === 'N/A') ? (
                        <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono border bg-slate-50 border-slate-200 text-slate-500">
                          N/A
                        </span>
                      ) : (
                        <span className="truncate max-w-[150px] inline-block align-bottom">{po.container}</span>
                      )}
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
                        <span>Order Insights</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredPOs.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
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
                { name: '1. New', key: 'new_without_invoice' },
                { name: '2. Invoice Delayed', key: 'invoice_delayed' },
                { name: '3. Delivery Delayed', key: 'delivery_overdue' },
                { name: '4. Remaining Order Items', key: 'remaining_items' },
              ]
            ).map(({ name: stage, key }) => {
              const stagePOs = kanbanList[key] || [];
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
                    Order ID: {(!selectedPO.orderId || selectedPO.orderId === 'N/A') ? 'Stock' : selectedPO.orderId} • Created:{' '}
                    {selectedPO.creationDate}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                
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
              {(['details', 'comments'] as const).map(
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
                    {section}
                  </button>
                ),
              )}
            </div>

            <div className="p-6 flex-1 flex flex-col min-h-0">
              {/* TAB: DETAILS */}
              {activeDrawerSection === 'details' && (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
                    {/* Stats Panel - Changed from col-span-2 to col-span-3 to occupy full width while Internal Approval Status is temporarily hidden */}
                    <div className="space-y-3 md:col-span-3 flex flex-col min-h-0">
                      <div className="grid grid-cols-5 gap-4 shrink-0">
                        <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-medium block">
                            Order ID
                          </span>
                          <strong className="text-sm font-bold text-slate-800 font-mono">
                            {(!selectedPO.orderId || selectedPO.orderId === 'N/A') ? 'Stock' : selectedPO.orderId}
                          </strong>
                        </div>
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
                            Remaining Quantity
                          </span>
                          <strong className="text-sm font-bold text-slate-800 font-mono">
                            {Math.max(0, selectedPO.orderedQty - selectedPO.receivedQty)} units
                          </strong>
                        </div>
                        <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                          <label className="text-[10px] text-slate-400 font-medium block mb-1">
                            Enter lead days for po order
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={leadTimeDays}
                              onChange={(e) => setLeadTimeDays(e.target.value)}
                              className="w-full text-sm font-bold text-slate-800 font-mono bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                              placeholder="0"
                            />
                            <button
                              onClick={async () => {
                                if (!leadTimeDays) return;
                                try {
                                  await updatePOLeadTime(selectedPO.uuid || selectedPO.id, Number(leadTimeDays));
                                  onAddActivity(`Updated lead time to ${leadTimeDays} days for PO ${selectedPO.id}`, 'PO Updated');
                                  toast.success('Lead time updated successfully!');
                                } catch (error) {
                                  console.error(error);
                                  toast.error('Failed to update lead time.');
                                }
                              }}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors"
                            >
                              {selectedPO.containerLeadTimeDays ? 'Update' : 'Save'}
                            </button>
                          </div>
                        </div>
                        {/* <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-medium block">
                            Container IDs
                          </span>
                          <strong className="text-xs font-bold text-indigo-700 font-mono block truncate" title={selectedPO.containerNames?.join(', ') || selectedPO.container || 'Awaiting Vessel Booking'}>
                            {selectedPO.containerNames && selectedPO.containerNames.length > 0 
                               ? selectedPO.containerNames.join(', ') 
                               : selectedPO.container || 'Awaiting Vessel Booking'}
                          </strong>
                        </div>
                        <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-medium block">
                            Delivery ETA
                          </span>
                          <strong className="text-sm font-bold text-slate-800 font-mono">
                            {selectedPO.expected_delivery_date || selectedPO.eta || 'N/A'}
                          </strong>
                        </div> */}
                      </div>

                      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex-1 flex flex-col min-h-0 mt-3">
                        <h5 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider shrink-0">
                          Item Specifications (Products)
                        </h5>
                        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 rounded-lg border border-slate-100 bg-white">
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
                                <th className="px-3 py-2 bg-slate-50 text-left">
                                  Container/Items Count
                                </th>
                                <th className="px-3 py-2 bg-slate-50 text-left">
                                  Container Details
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                              {paginatedItems &&
                              paginatedItems.length > 0 ? (
                                paginatedItems.map((item) => (
                                  <tr
                                    key={item.sku}
                                    className={`transition ${
                                      Math.max(0, item.qty - (item.receivedQty || 0)) > 0
                                        ? 'bg-amber-50/50 hover:bg-amber-100/50'
                                        : 'hover:bg-slate-50/50'
                                    }`}
                                  >
                                    <td className="px-3 py-2 max-w-[120px]">
                                      <div className="flex items-center gap-1 group">
                                        <span 
                                          className="font-mono font-bold text-slate-500 truncate cursor-pointer"
                                          data-tooltip-id="po-item-tooltip"
                                          data-tooltip-content={item.sku}
                                        >
                                          {item.sku}
                                        </span>
                                        <button
                                          title="Copy SKU"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(item.sku);
                                            toast.success('SKU copied!');
                                          }}
                                          className="opacity-0 group-hover:opacity-100 transition text-slate-400 hover:text-indigo-600 shrink-0"
                                        >
                                          <Copy className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 max-w-[150px]">
                                      <div className="flex items-start gap-1 group">
                                        <span 
                                          className="font-medium text-slate-800 line-clamp-1 cursor-pointer"
                                          data-tooltip-id="po-item-tooltip"
                                          data-tooltip-content={item.name}
                                        >
                                          {item.name}
                                        </span>
                                        <button
                                          title="Copy Product Name"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(item.name);
                                            toast.success('Product Name copied!');
                                          }}
                                          className="opacity-0 group-hover:opacity-100 transition text-slate-400 hover:text-indigo-600 shrink-0 mt-0.5"
                                        >
                                          <Copy className="h-3 w-3" />
                                        </button>
                                      </div>
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
                                     <td className={`px-3 py-2 text-right font-mono ${Math.max(0, item.qty - (item.receivedQty || 0)) > 0 ? 'text-amber-700 font-bold' : 'font-medium text-slate-500'}`}>
                                      {Math.max(0, item.qty - (item.receivedQty || 0)).toLocaleString()}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono font-medium">
                                      ${item.unitPrice.toFixed(2)}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono font-bold text-indigo-600">
                                      ${(item.qty * item.unitPrice).toFixed(2)}
                                    </td>
                                    <td className="px-3 py-2 text-left text-[10px] font-mono text-slate-500">
                                      {item.containers && item.containers.length > 0 ? (
                                        <div className="flex flex-col gap-0.5">
                                          {item.containers.map((c, i) => (
                                            <span key={i} className="bg-slate-100 rounded-sm px-1.5 py-0.5 whitespace-nowrap">
                                              {c.container_name || 'Unnamed'} <strong className="text-slate-600">({c.qty_in_container})</strong>
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        'Unassigned'
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-left font-mono text-[11px] text-slate-500">
                                      {item.containers && item.containers.length > 0 ? (
                                        <div className="flex flex-col gap-0.5">
                                          {item.containers.map((c, i) => {
                                            const rawDate = c.estimated_arrival_date || c.received_date;
                                            const displayDate = rawDate ? rawDate.split('T')[0] : 'TBD';
                                            return (
                                              <span key={i} className="bg-slate-50 border border-slate-100 rounded-sm px-1.5 py-0.5 whitespace-nowrap">
                                                ETA: <strong className="text-indigo-600">{displayDate}</strong>
                                              </span>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        'N/A'
                                      )}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td
                                    colSpan={9}
                                    className="px-3 py-6 text-center text-slate-400 italic"
                                  >
                                    No items specified for this purchase order.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                        <Tooltip
                          id="po-item-tooltip"
                          place="top"
                          style={{
                            backgroundColor: '#4f46e5',
                            color: '#ffffff',
                            fontWeight: 500,
                            fontSize: '11px',
                            zIndex: 100,
                            padding: '4px 8px',
                            borderRadius: '6px',
                            maxWidth: '300px'
                          }}
                        />
                        {/* Items Pagination Footer */}
                        {totalItemsCount > itemsPageSize && (
                          <div className="mt-4 shrink-0">
                            <Pagination
                              currentPage={itemsCurrentPage}
                              totalCount={totalItemsCount}
                              pageSize={itemsPageSize}
                              onPageChange={setItemsCurrentPage}
                              onPageSizeChange={() => {}}
                              hidePageSizeSelector={true}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: COMMENTS DISCUSSION ENGINE */}
              {activeDrawerSection === 'comments' && (
                <div className="flex-1 flex flex-col min-h-0 gap-4">
                  <div className="flex-1 overflow-y-auto pr-2 space-y-3.5 custom-scrollbar">
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
                    className="flex gap-2 border-t border-slate-100 pt-3 shrink-0"
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

             

              {/* TAB: EMAIL HISTORY & AI GENERATOR */}
              {activeDrawerSection === 'emails' && (
                <div className="flex-1 flex flex-col min-h-0 gap-6 overflow-y-auto custom-scrollbar">
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

      {/* MODAL: EXPORT CSV FORM */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-xl w-full animate-scaleUp max-h-[90vh] flex flex-col">
            
            <div className="flex items-center justify-between border-b border-slate-100 p-5 shrink-0">
              <h3 className="font-display font-bold text-slate-900 text-base">
                Export Purchase Orders
              </h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 min-h-0 space-y-6">
              {/* Filter Status */}
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-2">Filter Data</label>
                <select
                  value={exportFilterStatus}
                  onChange={(e) => setExportFilterStatus(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-indigo-500 focus:bg-white text-slate-700 transition"
                >
                  <option value="all">No Filter (All Data)</option>
                  <option value="invoice_delayed">Invoice Delayed (Missing &gt; 10 days)</option>
                  <option value="delivery_delayed">Delivery Delayed (ETA Passed)</option>
                  <option value="lefts_items">Incomplete Receiving (Lefts Items)</option>
                </select>
              </div>

              {/* Columns Selection */}
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-2">Select Columns</label>
                <p className="text-xs text-slate-500 mb-4">Choose the fields to include in your CSV export. Including Item-Level columns will output one row per item.</p>
                
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xs font-bold text-indigo-700 mb-2.5 uppercase tracking-wide border-b border-indigo-100 pb-1">PO-Level Columns</h4>
                    <div className="grid grid-cols-2 gap-2.5">
                       {PO_LEVEL_COLUMNS.map(col => (
                         <label key={col} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded transition select-none">
                           <input 
                             type="checkbox" 
                             checked={exportColumns.includes(col)}
                             onChange={(e) => {
                               if (e.target.checked) setExportColumns(C => [...C, col]);
                               else setExportColumns(C => C.filter(c => c !== col));
                             }}
                             className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                           />
                           {col}
                         </label>
                       ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-emerald-700 mb-2.5 uppercase tracking-wide border-b border-emerald-100 pb-1">Item-Level Columns</h4>
                    <div className="grid grid-cols-2 gap-2.5">
                       {ITEM_LEVEL_COLUMNS.map(col => (
                         <label key={col} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded transition select-none">
                           <input 
                             type="checkbox" 
                             checked={exportColumns.includes(col)}
                             onChange={(e) => {
                               if (e.target.checked) setExportColumns(C => [...C, col]);
                               else setExportColumns(C => C.filter(c => c !== col));
                             }}
                             className="rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                           />
                           {col}
                         </label>
                       ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-sky-700 mb-2.5 uppercase tracking-wide border-b border-sky-100 pb-1">Container-Level Columns</h4>
                    <div className="grid grid-cols-2 gap-2.5">
                       {CONTAINER_LEVEL_COLUMNS.map(col => (
                         <label key={col} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded transition select-none">
                           <input 
                             type="checkbox" 
                             checked={exportColumns.includes(col)}
                             onChange={(e) => {
                               if (e.target.checked) setExportColumns(C => [...C, col]);
                               else setExportColumns(C => C.filter(c => c !== col));
                             }}
                             className="rounded text-sky-600 focus:ring-sky-500 border-slate-300"
                           />
                           {col}
                         </label>
                       ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 p-5 shrink-0 bg-slate-50/50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium bg-white hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={executeExportCSV}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5"
              >
                <Download className="h-4 w-4" />
                Generate CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
