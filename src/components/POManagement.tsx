import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setPurchaseOrdersList } from '../store/purchaseOrderSlice';
import { fetchUsers } from '../store/userSlice';
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
  RefreshCw,
  CalendarDays,
  Upload,
  DollarSign,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Copy,
  Info,
  ExternalLink,
  Loader2,
  Reply,
  ChevronUp,
  ChevronDown,
  Pencil,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { Tooltip } from 'react-tooltip';
import { PurchaseOrder, Vendor, Comment, EmailLog, UserRole } from '../types';
import { useCRM } from '../hooks/useCRM';
import {
  updatePOLeadTime,
  exportPurchaseOrdersCSV,
  getPurchaseOrders,
  postPOComment,
  getPurchaseOrderById,
  syncPurchaseOrders,
  updatePOComment,
  getItemComments,
  postItemComment,
  updateItemComment,
} from '../services/purchaseOrder.service';
import { getUsers, User } from '../services/user.service';
import Pagination from './common/Pagination';
import TableLoader from './common/TableLoader';
import FullPageLoader from './common/FullPageLoader';
import ItemCommentModal from './ItemCommentModal';
import VendorInfiniteDropdown from './common/VendorInfiniteDropdown';
import DataTable from './common/DataTable';
import SellerCloudSyncLoading from './common/SellerCloudSyncLoading';

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
  onRefreshData?: () => void;
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
  dateFrom?: string;
  onDateFromChange?: (val: string) => void;
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
  onRefreshData,
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
  dateFrom: propDateFrom,
  onDateFromChange: propOnDateFromChange,
  pageSize: propPageSize,
  onPageSizeChange: propOnPageSizeChange,
  sortConfig: propSortConfig,
  onSortChange: propOnSortChange,
}: POManagementProps) {
  const reduxPOs = useSelector((state: any) => state.purchaseOrders.list);
  const kanbanList = useSelector(
    (state: any) => state.purchaseOrders.kanbanList || {},
  );
  const dispatch = useDispatch();
  const { user: currentUser } = useCRM();

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

  // Comments state fetched from detail API
  const [fetchedComments, setFetchedComments] = useState<Comment[]>([]);
  const [detailedPOItems, setDetailedPOItems] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCommentOnlyView, setIsCommentOnlyView] = useState(false);
  const [commentScope, setCommentScope] = useState<'po' | 'sku'>('po');
  const [selectedSkuId, setSelectedSkuId] = useState<string | null>(null);
  const [fetchedSkuComments, setFetchedSkuComments] = useState<any[]>([]);
  const [isLoadingSkuComments, setIsLoadingSkuComments] = useState(false);
  const [isScopeDropdownOpen, setIsScopeDropdownOpen] = useState(false);

  // Reply State
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
  const [replyToUser, setReplyToUser] = useState<string | null>(null);
  const [replyToText, setReplyToText] = useState<string | null>(null);

  // Tree Collapse State
  const [collapsedComments, setCollapsedComments] = useState<
    Record<string, boolean>
  >({});

  // Editing Comment State
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState<string>('');

  // Mention Tagging State
  const reduxUsers = useSelector((state: any) => state.users?.list || []);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionFilter, setMentionFilter] = useState('');
  const [taggedUserMap, setTaggedUserMap] = useState<Record<string, string>>(
    {},
  );

  // Item Comments Modal
  const [selectedItemForComments, setSelectedItemForComments] =
    useState<any>(null);

  useEffect(() => {
    const handleOpenItemComments = (e: any) => {
      setSelectedItemForComments(e.detail);
    };
    window.addEventListener('open-item-comments', handleOpenItemComments);
    return () =>
      window.removeEventListener('open-item-comments', handleOpenItemComments);
  }, []);

  useEffect(() => {
    if (!reduxUsers || reduxUsers.length === 0) {
      dispatch(fetchUsers() as any);
    }
  }, [dispatch, reduxUsers.length]);

  const handleSyncSellerCloud = async () => {
    try {
      setIsSyncing(true);
      await syncPurchaseOrders('25');
      toast.success('Successfully synced POs from SellerCloud!');
    } catch (error) {
      console.error('Error syncing POs:', error);
      toast.error('Failed to sync POs from SellerCloud.');
    } finally {
      setIsSyncing(false);
    }
  };

  const formatUtcTimestamp = (ts: any) => {
    if (!ts) return new Date().toISOString().slice(0, 16).replace('T', ' ');
    const d = new Date(ts);
    return isNaN(d.getTime())
      ? ts
      : d.toISOString().slice(0, 16).replace('T', ' ');
  };

  const isPoMatch = (po: any, targetId: string | number | null | undefined) => {
    if (!targetId || !po) return false;
    const cleanTarget = String(targetId).replace(/^PO-/i, '').trim();
    const cleanId = String(po.id || '')
      .replace(/^PO-/i, '')
      .trim();
    const cleanUuid = String(po.uuid || '').trim();
    const cleanScId = String(po.sellercloud_po_id || '').trim();

    return (
      po.id === targetId ||
      po.uuid === targetId ||
      po.sellercloud_po_id === targetId ||
      (cleanId && cleanId === cleanTarget) ||
      (cleanUuid && cleanUuid === cleanTarget) ||
      (cleanScId && cleanScId === cleanTarget)
    );
  };

  useEffect(() => {
    if (selectedPOId) {
      const po = purchaseOrders.find((p: any) => isPoMatch(p, selectedPOId));
      if (po && po.containerLeadTimeDays) {
        setLeadTimeDays(po.containerLeadTimeDays.toString());
      } else {
        setLeadTimeDays('');
      }

      const targetId =
        po?.sellercloud_po_id ||
        String(selectedPOId).replace(/^PO-/i, '') ||
        po?.uuid;
      setIsLoadingComments(true);
      getPurchaseOrderById(targetId)
        .then((detailData: any) => {
          if (!detailData) return;
          const rawComments = detailData?.comments || [];
          const mappedComments = rawComments.map((c: any) => ({
            id: String(c.id || `COM-${Math.random()}`),
            poId: selectedPOId,
            user: c.user_name || c.user || c.author || 'User',
            userId: c.user_id || c.author_id || null,
            role: c.role || 'Administrator',
            message: c.comment || c.message || c.text || '',
            timestamp: formatUtcTimestamp(c.created_at || c.timestamp),
            parentId: c.parent_id ? String(c.parent_id) : null,
          }));
          setFetchedComments(mappedComments);
          setDetailedPOItems(detailData?.items || []);

          if (po) {
            const calculatedOrderedQty = detailData.items
              ? detailData.items.reduce(
                  (sum: number, i: any) =>
                    sum + (i.qty_ordered ?? i.qty ?? i.orderedQty ?? 0),
                  0,
                )
              : po.orderedQty;
            const calculatedReceivedQty = detailData.items
              ? detailData.items.reduce(
                  (sum: number, i: any) =>
                    sum +
                    (i.qty_received ?? i.receivedQty ?? i.received_qty ?? 0),
                  0,
                )
              : po.receivedQty;

            const updatedPO = {
              ...po,
              orderedQty: calculatedOrderedQty || po.orderedQty || 0,
              receivedQty: calculatedReceivedQty || po.receivedQty || 0,
              commentsCount: mappedComments.length,
              items: detailData.items
                ? detailData.items.map((item: any) => ({
                    ...item,
                    sku: item.sku || 'N/A',
                    name: item.product_name || item.name || 'N/A',
                    qty_ordered:
                      item.qty_ordered !== undefined
                        ? item.qty_ordered
                        : item.qty || 0,
                    qty_received:
                      item.qty_received !== undefined
                        ? item.qty_received
                        : item.receivedQty || 0,
                    qty_remaining:
                      item.qty_remaining !== undefined &&
                      item.qty_remaining !== null
                        ? item.qty_remaining
                        : Math.max(
                            0,
                            (item.qty_ordered ?? item.qty ?? 0) -
                              (item.qty_received ?? item.receivedQty ?? 0),
                          ),
                    qty:
                      item.qty_ordered !== undefined
                        ? item.qty_ordered
                        : item.qty || 0,
                    receivedQty:
                      item.qty_received !== undefined
                        ? item.qty_received
                        : item.receivedQty || 0,
                    unitPrice:
                      item.unit_price !== undefined
                        ? item.unit_price
                        : item.unitPrice || 0,
                    expected_delivery_date: item.expected_delivery_date
                      ? item.expected_delivery_date.split('T')[0]
                      : null,
                    containers: item.containers || [],
                  }))
                : po.items,
              containerNames:
                detailData.container_names &&
                detailData.container_names.length > 0
                  ? detailData.container_names
                  : po.containerNames,
            };
            onUpdatePO(updatedPO);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch PO details for comments', err);
          setFetchedComments([]);
          setDetailedPOItems([]);
        })
        .finally(() => {
          setIsLoadingComments(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPOId]);

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

  const [localDateFrom, setLocalDateFrom] = useState('');
  const dateFrom = propDateFrom !== undefined ? propDateFrom : localDateFrom;
  const setDateFrom = propOnDateFromChange
    ? propOnDateFromChange
    : setLocalDateFrom;

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
    'Comments',
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

  const [itemsCurrentPage, setItemsCurrentPage] = useState(1);
  const [itemsPageSize, setItemsPageSize] = useState(10);
  const [isItemsPaginationLoading, setIsItemsPaginationLoading] =
    useState(false);

  useEffect(() => {
    if (selectedPOId) {
      setActiveDrawerSection('details');
      setItemsCurrentPage(1);
      setCommentScope('po');
      setSelectedSkuId(null);
    }
  }, [selectedPOId]);

  useEffect(() => {
    if (
      activeDrawerSection === 'comments' &&
      commentScope === 'sku' &&
      selectedSkuId
    ) {
      setIsLoadingSkuComments(true);
      getItemComments(selectedSkuId)
        .then((data: any) => {
          const rawComments = data?.comments || data || [];
          const mappedComments = rawComments.map((c: any) => ({
            id: String(c.id || `ITEMCOM-${Math.random()}`),
            itemId: selectedSkuId,
            user: c.user_name || c.user || c.author || 'User',
            userId: c.user_id || c.author_id || null,
            role: c.role || 'Administrator',
            message: c.comment || c.message || c.text || '',
            timestamp: formatUtcTimestamp(c.created_at || c.timestamp),
            parentId: c.parent_id ? String(c.parent_id) : null,
          }));
          setFetchedSkuComments(mappedComments);
        })
        .catch((err: any) => {
          console.error(err);
          setFetchedSkuComments([]);
        })
        .finally(() => setIsLoadingSkuComments(false));
    }
  }, [selectedSkuId, commentScope, activeDrawerSection]);

  useEffect(() => {
    const handleItemCommentAdded = (e: any) => {
      const itemId = e.detail?.itemId;
      if (!itemId) return;
      setDetailedPOItems((prevItems) =>
        prevItems.map((item) =>
          item.id === itemId
            ? {
                ...item,
                commentsCount:
                  (parseInt(
                    item.commentsCount ||
                      item.comments_count ||
                      item.commentCount ||
                      (Array.isArray(item.comments) ? item.comments.length : 0),
                    10,
                  ) || 0) + 1,
              }
            : item,
        ),
      );
    };

    window.addEventListener('item-comment-added', handleItemCommentAdded);
    return () => {
      window.removeEventListener('item-comment-added', handleItemCommentAdded);
    };
  }, []);

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

  const activeSortConfig =
    propSortConfig !== undefined ? propSortConfig : localSortConfig;

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

  const sortedPOs = [
    ...purchaseOrders.filter((po) => {
      const matchesSearch =
        po.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (po.orderId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.container.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (po.invoiceDetails?.invoiceNumber || '')
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        po.skus.some((sku) =>
          sku.toLowerCase().includes(searchQuery.toLowerCase()),
        );

      const matchesStatus =
        statusFilter === 'all' || po.status === statusFilter;

      // Client-side order date filter (ETA field)
      const poEta = po.eta || po.expected_delivery_date || '';
      const matchesDate = !dateFrom || (poEta && poEta === dateFrom);

      // Role-based restrictions: if Vendor role, can ONLY see their own POs (Rule 13)
      if (userRole === 'Vendor') {
        return (
          matchesSearch &&
          matchesStatus &&
          matchesDate &&
          po.vendorId === 'VEND-001'
        );
      }

      return matchesSearch && matchesStatus && matchesDate;
    }),
  ].sort((a, b) => {
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
  const isLocalFilteringActive = Boolean(
    searchQuery || statusFilter !== 'all' || dateFrom,
  );
  const validTotalCount =
    propTotalCount !== undefined && !isLocalFilteringActive
      ? propTotalCount
      : filteredPOs.length;

  const totalPages = Math.ceil(validTotalCount / itemsPerPage) || 1;
  const normalizedCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (normalizedCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const paginatedPOs =
    propTotalCount !== undefined && !isLocalFilteringActive
      ? filteredPOs
      : filteredPOs.slice(startIndex, endIndex);

  let selectedPO = purchaseOrders.find((po: any) =>
    isPoMatch(po, selectedPOId),
  );
  if (!selectedPO && kanbanList) {
    for (const key of Object.keys(kanbanList)) {
      const found = kanbanList[key].find((po: any) =>
        isPoMatch(po, selectedPOId),
      );
      if (found) {
        selectedPO = found;
        break;
      }
    }
  }

  // All Items for selected PO will be listed with local pagination
  // Use detailed API items if available since they contain `id` DB fields that are missing in the summary index
  const allItemsForPO =
    detailedPOItems.length > 0 ? detailedPOItems : selectedPO?.items || [];
  const totalItemsCount = allItemsForPO.length;

  const paginatedItems = allItemsForPO.slice(
    (itemsCurrentPage - 1) * itemsPageSize,
    itemsCurrentPage * itemsPageSize,
  );

  // Comments for selected PO (Dynamically loaded from detail API)
  const selectedPOComments = fetchedComments;

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
      finalColumns = [
        ...PO_LEVEL_COLUMNS,
        ...ITEM_LEVEL_COLUMNS,
        ...CONTAINER_LEVEL_COLUMNS,
      ];
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
        `SupplyChainCRM_PO_Export_${new Date().toISOString().split('T')[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.update(toastId, {
        render: 'Export successful!',
        type: 'success',
        isLoading: false,
        autoClose: 3000,
      });
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
  // User Mention logic
  const handleCommentTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewCommentText(val);

    const cursorPosition = e.target.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursorPosition);
    const words = textBeforeCursor.split(/\s+/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith('@')) {
      setShowMentionDropdown(true);
      setMentionFilter(lastWord.slice(1).toLowerCase());
      const wordStartIndex = textBeforeCursor.lastIndexOf(lastWord);
      setMentionIndex(wordStartIndex);
    } else {
      setShowMentionDropdown(false);
    }
  };

  const handleSelectMention = (user: User | any) => {
    const username =
      user.full_name ||
      user.username ||
      `${user.first_name || ''}_${user.last_name || ''}`.trim() ||
      user.email;
    const tag = `@${username.replace(/\s+/g, '_')}`;

    const textBefore = newCommentText.slice(0, mentionIndex);
    const textAfter = newCommentText.slice(mentionIndex).replace(/^\S+/, '');

    setNewCommentText(`${textBefore}${tag} ${textAfter}`);

    setTaggedUserMap((prev) => ({
      ...prev,
      [tag]: user.id,
    }));

    setShowMentionDropdown(false);
  };

  const handleUpdateSubmit = (commentId: string) => {
    if (!editingCommentText.trim() || !selectedPO) return;

    // Extract tagged users
    const words = editingCommentText.trim().split(/\s+/);
    const taggedUserIds = words
      .filter((w) => w.startsWith('@'))
      .map((w) => taggedUserMap[w])
      .filter(Boolean);

    // Optimistic UI update
    setFetchedComments((prev) =>
      prev.map((c) =>
        c.id === commentId ? { ...c, message: editingCommentText.trim() } : c,
      ),
    );
    setEditingCommentId(null);
    setEditingCommentText('');

    if (commentScope === 'sku' && selectedSkuId) {
      setFetchedSkuComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, message: editingCommentText.trim() } : c,
        ),
      );
      setEditingCommentId(null);
      setEditingCommentText('');

      updateItemComment(commentId, editingCommentText.trim(), taggedUserIds)
        .then(() => {
          onAddActivity(
            `Updated comment on SKU (${selectedSkuId})`,
            'Vendor Comment',
          );
          return getItemComments(selectedSkuId);
        })
        .then((data: any) => {
          const rawComments = data?.comments || data || [];
          const mappedComments = rawComments.map((c: any) => ({
            id: String(c.id || `ITEMCOM-${Math.random()}`),
            itemId: selectedSkuId,
            user: c.user_name || c.user || c.author || 'User',
            userId: c.user_id || c.author_id || null,
            role: c.role || 'Administrator',
            message: c.comment || c.message || c.text || '',
            timestamp: formatUtcTimestamp(c.created_at || c.timestamp),
            parentId: c.parent_id ? String(c.parent_id) : null,
          }));
          setFetchedSkuComments(mappedComments);
        })
        .catch((err) => {
          console.error('Failed to update SKU comment', err);
          toast.error('Network sync error: Comment may not have saved.', {
            autoClose: 2000,
          });
        });
      return;
    }

    updatePOComment(commentId, editingCommentText.trim(), taggedUserIds).catch(
      () => {
        // Re-fetch invisibly to sync real DB record if it fails or completes
        const targetId = selectedPO.id.replace(/^PO-/i, '');
        getPurchaseOrderById(targetId).then((detailData: any) => {
          if (!detailData) return;
          const rawComments = detailData.comments || [];
          const mappedComments = rawComments.map((c: any) => ({
            id: String(c.id || `COM-${Math.random()}`),
            poId: selectedPO.id,
            user: c.user_name || c.user || c.author || 'User',
            role: c.role || 'Administrator',
            message: c.comment || c.message || c.text || '',
            timestamp: formatUtcTimestamp(c.created_at || c.timestamp),
            parentId: c.parent_id ? String(c.parent_id) : null,
          }));
          // Only update if we didn't just switch away to another PO
          setFetchedComments((current) => {
            if (current.length > 0 && current[0].poId !== selectedPO.id)
              return current;
            return mappedComments;
          });
        });
      },
    );
  };

  // Add a discussion comment — WhatsApp style 'fire and forget'
  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO || !newCommentText.trim()) return;

    const messageText = newCommentText.trim();

    // Extract tagged users
    const words = messageText.split(/\s+/);
    const taggedUserIds = words
      .filter((w) => w.startsWith('@'))
      .map((w) => taggedUserMap[w])
      .filter(Boolean);

    // Optimistic UI update immediately
    const optimisticComment: Comment = {
      id: `COM-OPT-${Date.now()}`,
      poId: selectedPO.id,
      user:
        userRole === 'Vendor' ? selectedPO.vendorName : 'Sourcing Lead (You)',
      role: userRole,
      message: messageText,
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      parentId: replyToCommentId,
    };

    const replyId = replyToCommentId;
    setReplyToCommentId(null);
    setReplyToUser(null);
    setReplyToText(null);

    if (commentScope === 'sku' && selectedSkuId) {
      setFetchedSkuComments((prev) => [...prev, optimisticComment]);
      setNewCommentText('');
      setShowMentionDropdown(false);

      postItemComment(selectedSkuId, messageText, taggedUserIds, replyId)
        .then(() => {
          onAddActivity(
            `Added discussion comment on SKU (${selectedSkuId})`,
            'Vendor Comment',
          );
          return getItemComments(selectedSkuId);
        })
        .then((data: any) => {
          const rawComments = data?.comments || data || [];
          const mappedComments = rawComments.map((c: any) => ({
            id: String(c.id || `ITEMCOM-${Math.random()}`),
            itemId: selectedSkuId,
            user: c.user_name || c.user || c.author || 'User',
            userId: c.user_id || c.author_id || null,
            role: c.role || 'Administrator',
            message: c.comment || c.message || c.text || '',
            timestamp: formatUtcTimestamp(c.created_at || c.timestamp),
            parentId: c.parent_id ? String(c.parent_id) : null,
          }));
          setFetchedSkuComments(mappedComments);
        })
        .catch((err) => {
          console.error('Failed to save comment to server:', err);
          toast.error('Network sync error: Comment may not have saved.', {
            autoClose: 2000,
          });
        });
      return;
    }

    onAddComment(optimisticComment);
    setFetchedComments((prev) => [...prev, optimisticComment]);
    setNewCommentText('');
    setShowMentionDropdown(false);

    // Fire-and-forget background sync (No UI locks!)
    const targetId = selectedPO.id.replace(/^PO-/i, '');

    postPOComment(targetId, messageText, taggedUserIds, replyId)
      .then(() => {
        onAddActivity(
          `Added discussion comment on ${selectedPO.id}`,
          'Vendor Comment',
        );

        // Re-fetch invisibly to sync real DB record
        return getPurchaseOrderById(targetId);
      })
      .then((detailData: any) => {
        if (!detailData) return;
        const rawComments = detailData.comments || [];
        const mappedComments = rawComments.map((c: any) => ({
          id: String(c.id || `COM-${Math.random()}`),
          poId: selectedPO.id,
          user: c.user_name || c.user || c.author || 'User',
          userId: c.user_id || c.author_id || null,
          role: c.role || 'Administrator',
          message: c.comment || c.message || c.text || '',
          timestamp: formatUtcTimestamp(c.created_at || c.timestamp),
          parentId: c.parent_id ? String(c.parent_id) : null,
        }));

        // Only update if we didn't just switch away to another PO
        setFetchedComments((current) => {
          // We might have multiple optimistics in flight. For absolute safety WhatsApp-style,
          // we just replace the whole array with the fresh backend truth.
          return mappedComments;
        });

        // Optimistically update the PO list commentsCount to avoid reloading the whole table
        if (selectedPO) {
          const updatedPOs = purchaseOrders.map((p: any) =>
            p.id === selectedPO.id
              ? { ...p, commentsCount: mappedComments.length }
              : p,
          );
          dispatch(setPurchaseOrdersList(updatedPOs));
        }
      })
      .catch((err) => {
        console.error('Failed to save comment to server:', err);
        // Silently fail UI or show a tiny toast, but don't disrupt user
        toast.error('Network sync error: Comment may not have saved.', {
          autoClose: 2000,
        });
      });
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

  const poColumns = React.useMemo(
    () => [
      {
        header: (
          <div
            className="flex items-center gap-1"
            onClick={() => handleSort('id')}
          >
            PO Number
            <span className="text-slate-400 group-hover:text-indigo-600">
              {activeSortConfig.key === 'id' ? (
                activeSortConfig.direction === 'asc' ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )
              ) : (
                <ArrowUpDown className="h-3 w-3 opacity-50 outline-hidden" />
              )}
            </span>
          </div>
        ),
        accessor: 'id',
        headerClassName:
          'px-6 py-4 bg-slate-50 cursor-pointer select-none group hover:text-indigo-600 transition-colors',
        className: 'px-6 py-4',
        render: (po: any) => (
          <div className="flex flex-col gap-1 items-start">
            <div className="flex items-center gap-1.5 max-w-[120px] overflow-hidden whitespace-nowrap text-ellipsis">
              <span
                className="text-slate-900 font-bold font-mono text-[10px] truncate"
                title={String(po.id).replace(/^PO-/i, '')}
              >
                {String(po.id).replace(/^PO-/i, '')}
              </span>
              {po.delta_sellercloud_link && (
                <a
                  title="Open in Sellercloud (Purchasing)"
                  href={po.delta_sellercloud_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e: any) => e.stopPropagation()}
                  className="text-indigo-400 hover:text-indigo-600 transition-colors inline-flex items-center shrink-0"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              <button
                type="button"
                title="View PO Insights"
                onClick={(e: any) => {
                  e.stopPropagation();
                  setIsCommentOnlyView(false);
                  onSelectPO(po.id);
                  setActiveDrawerSection('details');
                }}
                className="text-slate-400 hover:text-indigo-600 transition-colors inline-flex items-center shrink-0 ml-0.5"
              >
                <Eye className="h-3 w-3" />
              </button>
              {po.status === 'Delayed' && (
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
              )}
            </div>
            {po.containerLeadTimeDays && (
              <span className="text-slate-500 font-mono text-[9px]">
                Lead Days: {po.containerLeadTimeDays}d
              </span>
            )}
          </div>
        ),
      },
      {
        header: 'Order Id',
        accessor: 'orderId',
        headerClassName: 'px-6 py-4 bg-slate-50',
        className: 'px-6 py-4',
        render: (po: any) => (
          <div className="flex items-center gap-1.5">
            <span
              className={
                !po.orderId || po.orderId === 'N/A'
                  ? 'px-2 py-0.5 rounded-sm text-[10px] font-mono border bg-slate-50 border-slate-200 text-slate-500'
                  : 'text-[11px] font-bold text-slate-700'
              }
            >
              {!po.orderId || po.orderId === 'N/A' ? 'Stock' : po.orderId}
            </span>
            {po.sellercloud_link && (
              <a
                title="Open in Sellercloud (Order)"
                href={po.sellercloud_link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e: any) => e.stopPropagation()}
                className="text-indigo-400 hover:text-indigo-600 transition-colors inline-flex items-center shrink-0"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        ),
      },
      {
        header: (
          <div
            className="flex items-center gap-1"
            onClick={() => handleSort('creationDate')}
          >
            <div className="flex flex-col">
              <span>Order Date</span>
              <span className="text-[9px] text-slate-400 normal-case">
                (YYYY-MM-DD)
              </span>
            </div>
            <span className="text-slate-400 group-hover:text-indigo-600">
              {activeSortConfig.key === 'creationDate' ? (
                activeSortConfig.direction === 'asc' ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )
              ) : (
                <ArrowUpDown className="h-3 w-3 opacity-50 outline-hidden" />
              )}
            </span>
          </div>
        ),
        accessor: 'creationDate',
        headerClassName:
          'px-6 py-4 bg-slate-50 cursor-pointer select-none group hover:text-indigo-600 transition-colors',
        className: 'px-6 py-4',
        render: (po: any) =>
          po.creationDate && po.creationDate !== 'N/A' ? (
            <span className="text-[11px] font-bold text-slate-700">
              {po.creationDate}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono border bg-slate-50 border-slate-200 text-slate-500">
              N/A
            </span>
          ),
      },
      {
        header: 'Vendor',
        accessor: 'vendorName',
        headerClassName: 'px-6 py-4 bg-slate-50',
        className: 'px-6 py-4 text-slate-700 font-medium',
      },
      {
        header: 'PO Items',
        accessor: 'items',
        headerClassName: 'px-6 py-4 bg-slate-50',
        className: 'px-6 py-4',
        render: (po: any) => {
          const itemCount =
            po.total_item_count ??
            (po.items && po.items.length > 0 ? po.items.length : 'N/A');
          return (
            <span
              title={
                po.items && po.items.length > 0
                  ? po.items.map((item: any) => item.name).join(', ')
                  : 'N/A'
              }
              className={
                itemCount === 'N/A' || itemCount === 0
                  ? 'px-2 py-0.5 rounded-sm text-[10px] font-mono border bg-slate-50 border-slate-200 text-slate-500'
                  : 'text-[11px] font-bold text-slate-700'
              }
            >
              {itemCount}
            </span>
          );
        },
      },
      {
        header: 'Ordered / Received Qty',
        accessor: 'orderedQty',
        headerClassName: 'px-6 py-4 bg-slate-50',
        className: 'px-6 py-4 text-slate-600',
        render: (po: any) => {
          const ordered = po.total_qty_ordered || po.orderedQty || 0;
          const received = po.total_qty_received || po.receivedQty || 0;
          return (
            <>
              <span className="font-bold text-slate-800">{ordered}</span>
              <span className="text-slate-400"> / {received}</span>
            </>
          );
        },
      },
      {
        header: (
          <div
            className="flex items-center gap-1"
            onClick={() => handleSort('invoiceDate')}
          >
            <div className="flex flex-col">
              <span>Invoice Date</span>
              <span className="text-[9px] text-slate-400 normal-case">
                (YYYY-MM-DD)
              </span>
            </div>
            <span className="text-slate-400 group-hover:text-indigo-600">
              {activeSortConfig.key === 'invoiceDate' ? (
                activeSortConfig.direction === 'asc' ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )
              ) : (
                <ArrowUpDown className="h-3 w-3 opacity-50 outline-hidden" />
              )}
            </span>
          </div>
        ),
        accessor: 'invoiceDetails',
        headerClassName:
          'px-6 py-4 bg-slate-50 cursor-pointer select-none group hover:text-indigo-600 transition-colors',
        className: 'px-6 py-4',
        render: (po: any) =>
          po.invoiceDetails?.date ? (
            <span className="text-[11px] font-bold text-slate-700">
              {po.invoiceDetails.date}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono border bg-slate-50 border-slate-200 text-slate-500">
              N/A
            </span>
          ),
      },
      {
        header: (
          <div className="flex items-center gap-1.5 uppercase tracking-wider text-xs font-semibold text-slate-600">
            Invoice Delay Status
            <div
              data-tooltip-id="po-metrics-tooltip"
              data-tooltip-content="This is based on the 10-day formula. Please compare it with the Created Date to determine the result."
              className="flex items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors p-[1.5px] cursor-pointer outline-hidden ml-1"
            >
              <Info className="h-3 w-3" />
            </div>
          </div>
        ),
        accessor: 'invoiceDelayStatus',
        headerClassName: 'px-6 py-4 bg-slate-50',
        className: 'px-6 py-4',
        render: (po: any) => {
          const invoiceDate =
            (po as any).invoice_date || po.invoiceDetails?.date;
          const createdOn = (po as any).created_on || po.creationDate;
          if (invoiceDate)
            return (
              <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono border bg-emerald-50 border-emerald-100 text-emerald-700">
                On Time
              </span>
            );
          if (!createdOn || createdOn === 'N/A')
            return (
              <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono border bg-slate-50 border-slate-200 text-slate-500">
                N/A
              </span>
            );
          const orderDate = new Date(createdOn);
          const today = new Date();
          const diffDays = Math.floor(
            (today.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24),
          );
          if (diffDays > 10)
            return (
              <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono border bg-rose-50 border-rose-100 text-rose-700 animate-pulse">
                Delay
              </span>
            );
          return (
            <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono border bg-amber-50 border-amber-100 text-amber-700">
              Pending
            </span>
          );
        },
      },
      {
        header: (
          <div
            className="flex items-center gap-1"
            onClick={() => handleSort('eta')}
          >
            <div className="flex flex-col">
              <span>Scheduled Delivery</span>
              <span className="text-[9px] text-slate-400 normal-case">
                (YYYY-MM-DD)
              </span>
            </div>
            <span className="text-slate-400 group-hover:text-indigo-600">
              {activeSortConfig.key === 'eta' ? (
                activeSortConfig.direction === 'asc' ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )
              ) : (
                <ArrowUpDown className="h-3 w-3 opacity-50 outline-hidden" />
              )}
            </span>
            <div
              data-tooltip-id="po-metrics-tooltip"
              data-tooltip-content="This is based on the formula calculated using the Lead Days available after the Invoice Date."
              className="flex items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors p-[1.5px] cursor-pointer outline-hidden ml-1"
              onClick={(e: any) => e.stopPropagation()}
            >
              <Info className="h-3 w-3" />
            </div>
          </div>
        ),
        accessor: 'expected_delivery_date',
        headerClassName:
          'px-6 py-4 bg-slate-50 cursor-pointer select-none group hover:text-indigo-600 transition-colors',
        className: 'px-6 py-4 text-slate-600 font-mono',
        render: (po: any) => (
          <span
            className={
              !po.expected_delivery_date || po.expected_delivery_date === 'N/A'
                ? 'px-2 py-0.5 rounded-sm text-[10px] font-mono border bg-slate-50 border-slate-200 text-slate-500'
                : 'text-[11px] font-bold text-slate-700'
            }
          >
            {po.expected_delivery_date || 'N/A'}
          </span>
        ),
      },
      {
        header: 'Container Count',
        accessor: 'containerNames',
        headerClassName: 'px-6 py-4 bg-slate-50',
        className: 'px-6 py-4 text-slate-600 font-mono text-xs',
        render: (po: any) =>
          po.containerNames && po.containerNames.length > 0 ? (
            <span
              title={po.containerNames.join(', ')}
              className="text-[11px] font-bold text-slate-700"
            >
              {po.containerNames.length}
            </span>
          ) : !po.container || po.container === 'N/A' ? (
            <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono border bg-slate-50 border-slate-200 text-slate-500">
              N/A
            </span>
          ) : (
            <span className="truncate max-w-[150px] inline-block align-bottom">
              {po.container}
            </span>
          ),
      },
      {
        header: 'Comments',
        accessor: 'commentsCount',
        headerClassName: 'px-4 py-4 bg-slate-50 text-center flex-shrink-0 w-20',
        className: 'px-4 py-4 text-center',
        render: (po: any) => {
          const count =
            parseInt(po.total_comments_count ?? po.commentsCount, 10) || 0;
          const hasComments = count > 0;
          return (
            <button
              onClick={(e: any) => {
                e.stopPropagation();
                setIsCommentOnlyView(true);
                onSelectPO(po.id);
                setTimeout(() => {
                  setActiveDrawerSection('comments');
                }, 10);
              }}
              className={`relative p-2 rounded-xl border transition ${
                hasComments
                  ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 hover:border-blue-300'
                  : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
              title="View Comments"
            >
              <MessageSquare className="h-5 w-5" />
              {hasComments && (
                <span className="absolute -top-2 -right-2 flex min-w-[18px] h-[18px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs border border-white">
                  {count >= 1000 ? `${Math.floor(count / 1000)}K+` : count}
                </span>
              )}
            </button>
          );
        },
      },
      {
        header: 'Actions',
        accessor: 'actions',
        headerClassName: 'px-6 py-4 bg-slate-50 text-center',
        className: 'px-6 py-4 text-center',
        render: (po: any) => (
          <button
            onClick={(e: any) => {
              e.stopPropagation();
              setIsCommentOnlyView(false);
              onSelectPO(po.id);
            }}
            className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-md inline-flex items-center gap-1 font-semibold"
          >
            <Eye className="h-3.5 w-3.5" />
            <span></span>
          </button>
        ),
      },
    ],
    [activeSortConfig, handleSort, selectedPOId, onSelectPO],
  );

  const poItemColumns = React.useMemo(
    () => [
      {
        header: 'SKU',
        accessor: 'sku',
        headerClassName: 'px-3 py-2 bg-slate-50',
        className: 'px-3 py-2 max-w-[120px]',
        render: (item: any) => (
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
              onClick={(e: any) => {
                e.stopPropagation();
                navigator.clipboard.writeText(item.sku);
                toast.success('SKU copied!');
              }}
              className="opacity-0 group-hover:opacity-100 transition text-slate-400 hover:text-indigo-600 shrink-0"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        ),
      },
      {
        header: 'Product Name',
        accessor: 'name', // Or perhaps accessor isn't strict, but render handles it
        headerClassName: 'px-3 py-2 bg-slate-50',
        className: 'px-3 py-2 max-w-[150px]',
        render: (item: any) => {
          const productName =
            item.name ||
            item.product_name ||
            item.productName ||
            item.ProductName ||
            'Unknown Product';
          return (
            <div className="flex items-start gap-1 group">
              <span
                className="font-medium text-slate-800 line-clamp-1 cursor-pointer"
                data-tooltip-id="po-item-tooltip"
                data-tooltip-content={productName}
              >
                {productName}
              </span>
              <button
                title="Copy Product Name"
                onClick={(e: any) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(productName);
                  toast.success('Product Name copied!');
                }}
                className="opacity-0 group-hover:opacity-100 transition text-slate-400 hover:text-indigo-600 shrink-0 mt-0.5"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
          );
        },
      },
      {
        header: 'Ordered Qty',
        accessor: 'qty',
        headerClassName: 'px-3 py-2 bg-slate-50 text-right',
        className: 'px-3 py-2 text-right font-mono font-medium',
        render: (item: any) => {
          const qty = item.qty_ordered ?? item.qty ?? item.orderedQty ?? 0;
          return Number(qty).toLocaleString();
        },
      },
      {
        header: 'Received Qty',
        accessor: 'receivedQty',
        headerClassName: 'px-3 py-2 bg-slate-50 text-right',
        className: 'px-3 py-2 text-right font-mono font-medium text-slate-500',
        render: (item: any) => {
          const rQty =
            item.qty_received ?? item.receivedQty ?? item.received_qty ?? 0;
          return Number(rQty).toLocaleString();
        },
      },
      {
        header: 'Remaining Qty',
        accessor: 'remainingQty',
        headerClassName: 'px-3 py-2 bg-slate-50 text-right',
        className: (item: any) => {
          const oQty = item.qty_ordered ?? item.qty ?? item.orderedQty ?? 0;
          const rQty =
            item.qty_received ?? item.receivedQty ?? item.received_qty ?? 0;
          const remQty =
            item.qty_remaining !== undefined && item.qty_remaining !== null
              ? item.qty_remaining
              : item.remainingQty !== undefined && item.remainingQty !== null
                ? item.remainingQty
                : Math.max(0, oQty - rQty);
          return `px-3 py-2 text-right font-mono ${remQty > 0 ? 'text-amber-700 font-bold' : 'font-medium text-slate-500'}`;
        },
        render: (item: any) => {
          const oQty = item.qty_ordered ?? item.qty ?? item.orderedQty ?? 0;
          const rQty =
            item.qty_received ?? item.receivedQty ?? item.received_qty ?? 0;
          const remQty =
            item.qty_remaining !== undefined && item.qty_remaining !== null
              ? item.qty_remaining
              : item.remainingQty !== undefined && item.remainingQty !== null
                ? item.remainingQty
                : Math.max(0, oQty - rQty);
          return Number(remQty).toLocaleString();
        },
      },
      {
        header: 'Unit Price',
        accessor: 'unitPrice',
        headerClassName: 'px-3 py-2 bg-slate-50 text-right',
        className: 'px-3 py-2 text-right font-mono font-medium text-slate-500',
        render: (item: any) => {
          const uPrice = item.unit_price ?? item.unitPrice ?? item.price ?? 0;
          return `$${Number(uPrice).toFixed(2)}`;
        },
      },
      {
        header: 'Total',
        accessor: 'total',
        headerClassName: 'px-3 py-2 bg-slate-50 text-right',
        className: 'px-3 py-2 text-right font-mono font-bold text-slate-800',
        render: (item: any) => {
          const oQty = item.qty_ordered ?? item.qty ?? item.orderedQty ?? 0;
          const uPrice = item.unit_price ?? item.unitPrice ?? item.price ?? 0;
          return `$${(Number(oQty) * Number(uPrice)).toFixed(2)}`;
        },
      },
      {
        header: 'Container/Items Count',
        accessor: 'containerInfo',
        headerClassName: 'px-3 py-2 bg-slate-50 text-left',
        className: 'px-3 py-2 text-left font-mono font-medium text-slate-600',
        render: (item: any) => {
          if (!item.containers || item.containers.length === 0)
            return (
              <span className="text-[10px] text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded-sm border border-slate-200">
                Unassigned
              </span>
            );
          return (
            <div className="flex flex-col gap-0.5">
              {item.containers.map((c: any, idx: number) => (
                <span
                  key={idx}
                  className="bg-slate-100 rounded-sm px-1.5 py-0.5 whitespace-nowrap"
                >
                  {c.container_name || 'Unnamed'}{' '}
                  <strong className="text-slate-600">
                    ({c.qty_in_container})
                  </strong>
                </span>
              ))}
            </div>
          );
        },
      },
      {
        header: 'Container Details',
        accessor: 'details',
        headerClassName: 'px-3 py-2 bg-slate-50 text-left',
        className: 'px-3 py-2 text-left font-mono text-[11px] text-slate-500',
        render: (item: any) => {
          if (!item.containers || item.containers.length === 0)
            return <span className="text-[10px] text-slate-400">N/A</span>;
          return (
            <div className="flex flex-col gap-0.5">
              {item.containers.map((c: any, idx: number) => {
                const rawDate = c.estimated_arrival_date || c.received_date;
                const displayDate = rawDate ? rawDate.split('T')[0] : 'TBD';
                return (
                  <span
                    key={idx}
                    className="bg-slate-50 border border-slate-100 rounded-sm px-1.5 py-0.5 whitespace-nowrap"
                  >
                    ETA:{' '}
                    <strong className="text-indigo-600">{displayDate}</strong>
                  </span>
                );
              })}
            </div>
          );
        },
      },
      {
        header: 'Comments',
        accessor: 'id', // or just a placeholder
        headerClassName: 'px-3 py-2 bg-slate-50 text-center w-24',
        className: 'px-3 py-2 text-center',
        render: (item: any) => {
          const count =
            parseInt(
              item.commentsCount ||
                item.comments_count ||
                item.commentCount ||
                item.comment_count ||
                item.total_comments ||
                (Array.isArray(item.comments) ? item.comments.length : 0),
              10,
            ) || 0;
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (item.id !== undefined || item.sku) {
                  // Determine ID natively or fallback only if strictly missing
                  const resolvedId =
                    item.id !== undefined && item.id !== null
                      ? item.id
                      : item.sku;
                  const detailItem = { ...item, id: resolvedId };
                  const event = new CustomEvent('open-item-comments', {
                    detail: detailItem,
                  });
                  window.dispatchEvent(event);
                } else {
                  toast.error('This item lacks an identifier.');
                }
              }}
              className={`p-1.5 rounded-lg transition border relative inline-flex ${
                count > 0
                  ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 hover:border-blue-300'
                  : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'
              }`}
              title="Item Comments"
            >
              <MessageSquare className="w-4 h-4" />
              {count > 0 && (
                <span className="absolute -top-2 -right-2 flex min-w-[18px] h-[18px] px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-xs border border-white">
                  {count >= 1000 ? `${Math.floor(count / 1000)}K+` : count}
                </span>
              )}
            </button>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="space-y-6 flex flex-col flex-1 min-h-0 overflow-hidden relative">
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
            <span>kanban Overview</span>
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
            <>
              <button
                onClick={handleSyncSellerCloud}
                disabled={isSyncing}
                className="flex items-center gap-1 px-3 py-1.5 border border-indigo-200 text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`}
                />
                <span>
                  {isSyncing ? 'Syncing...' : 'Sync Order SellerCloud'}
                </span>
              </button>
              {onRefreshData && (
                <button
                  onClick={onRefreshData}
                  disabled={loading}
                  className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
                  />
                  <span>{loading ? 'Refreshing...' : 'Refresh Data'}</span>
                </button>
              )}
              <button
                onClick={handleExportCSVClick}
                className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-xs font-medium transition"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </button>
            </>
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
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col gap-3 flex-shrink-0">
        {/* Row 1: Search + Vendor filter */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
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
            {userRole !== 'Vendor' && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Filter className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-xs font-medium text-slate-500">
                    Vendor:
                  </span>
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
            {activeSubTab !== 'kanban' && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                    Order Date:
                  </span>
                </div>
                <input
                  type={dateFrom ? 'date' : 'text'}
                  placeholder="yyyy-mm-dd"
                  onFocus={(e) => (e.target.type = 'date')}
                  onBlur={(e) => {
                    if (!e.target.value) e.target.type = 'text';
                  }}
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    handlePageChange(1);
                  }}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500 focus:bg-white text-slate-700 transition"
                  title="Order Date Filter"
                />
                {dateFrom && (
                  <button
                    onClick={() => {
                      setDateFrom('');
                      handlePageChange(1);
                    }}
                    className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 px-1.5 py-1 rounded-lg hover:bg-rose-50 transition font-medium"
                    title="Clear date filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SUB-VIEW 1: MASTER GRID VIEW */}
      {activeSubTab === 'grid' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden flex-1 flex flex-col min-h-0 relative">
          {loading && <TableLoader message="Please wait a moment..." />}
          <DataTable
            columns={poColumns}
            data={paginatedPOs}
            keyField="id"
            containerClassName="flex-1 flex flex-col min-h-0 w-full relative"
            tableWrapperClassName="overflow-auto flex-1 custom-scrollbar scroll-smooth"
            theadClassName="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold sticky top-0 z-10"
            tableClassName="w-full min-w-max whitespace-nowrap text-left text-xs border-collapse"
            tbodyClassName="divide-y divide-slate-100"
            trClassName={(po: any) =>
              `transition ${isPoMatch(po, selectedPOId) ? 'bg-indigo-50/20 font-medium' : 'hover:bg-slate-50/75'}`
            }
            emptyMessage="No Purchase Orders found matching search or filter parameters."
            pagination={
              filteredPOs.length > 0 ? (
                <Pagination
                  currentPage={normalizedCurrentPage}
                  totalCount={validTotalCount}
                  pageSize={pageSize}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                />
              ) : null
            }
          />
        </div>
      )}

      {/* SUB-VIEW 2: KANBAN PRODUCTION STAGES */}
      {activeSubTab === 'kanban' && (
        <div className="flex-1 min-h-0 relative flex flex-col">
          {loading && <TableLoader message="Please wait a moment..." />}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 overflow-y-auto min-h-0 pb-4">
            {[
              { name: '1. New', key: 'new_without_invoice' },
              { name: '2. Invoice Delayed', key: 'invoice_delayed' },
              { name: '3. Delivery Delayed', key: 'delivery_overdue' },
              { name: '4. Remaining Order Items', key: 'remaining_items' },
            ].map(({ name: stage, key }) => {
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
      <SellerCloudSyncLoading
        isOpen={isSyncing}
        onForceClose={() => setIsSyncing(false)}
      />
      {/* PO DETAIL OVERLAY MODAL (Rule 2) */}
      {selectedPO && (
        <div
          onClick={() => {
            onSelectPO(null);
            setIsCommentOnlyView(false);
          }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`bg-white rounded-2xl border border-slate-100 shadow-xl ${isCommentOnlyView ? 'max-w-xl' : 'max-w-5xl'} w-full h-[85vh] max-h-[85vh] flex flex-col overflow-hidden animate-scaleUp`}
          >
            {/* Header */}
            {!isCommentOnlyView && (
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
                      Order ID:{' '}
                      {!selectedPO.orderId || selectedPO.orderId === 'N/A'
                        ? 'Stock'
                        : selectedPO.orderId}{' '}
                      • Created: {selectedPO.creationDate}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedPO.sellercloud_link && (
                    <button
                      onClick={() =>
                        window.open(selectedPO.sellercloud_link, '_blank')
                      }
                      className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm border border-indigo-100 mr-2"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open in Sellercloud
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onSelectPO(null);
                      setIsCommentOnlyView(false);
                    }}
                    className="p-1.5 hover:bg-slate-200 rounded-md text-slate-400"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            {isCommentOnlyView && (
              <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between z-20">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-bold text-slate-800">
                    {selectedPO.id} - Comments
                  </h3>
                </div>
                <button
                  onClick={() => {
                    onSelectPO(null);
                    setIsCommentOnlyView(false);
                  }}
                  className="p-1.5 hover:bg-slate-200 rounded-md text-slate-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            {/* Tab Selection inside Modal */}
            {!isCommentOnlyView && (
              <div className="flex border-b border-slate-100 bg-slate-50/50 z-20">
                {(['details', 'comments'] as const).map((section) => (
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
                ))}
              </div>
            )}

            <div className="p-6 flex-1 flex flex-col min-h-0">
              {/* TAB: DETAILS */}
              {activeDrawerSection === 'details' && !isCommentOnlyView && (
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
                            {!selectedPO.orderId || selectedPO.orderId === 'N/A'
                              ? 'Stock'
                              : selectedPO.orderId}
                          </strong>
                        </div>
                        <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-medium block">
                            Ordered Quantity
                          </span>
                          <strong className="text-sm font-bold text-slate-800 font-mono">
                            {selectedPO.orderedQty ||
                              allItemsForPO.reduce(
                                (sum: number, i: any) =>
                                  sum +
                                  (i.qty_ordered ?? i.qty ?? i.orderedQty ?? 0),
                                0,
                              )}{' '}
                            units
                          </strong>
                        </div>
                        <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-medium block">
                            Received Quantity
                          </span>
                          <strong className="text-sm font-bold text-slate-800 font-mono">
                            {selectedPO.receivedQty ||
                              allItemsForPO.reduce(
                                (sum: number, i: any) =>
                                  sum +
                                  (i.qty_received ??
                                    i.receivedQty ??
                                    i.received_qty ??
                                    0),
                                0,
                              )}{' '}
                            units
                          </strong>
                        </div>
                        <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-medium block">
                            Remaining Quantity
                          </span>
                          <strong className="text-sm font-bold text-slate-800 font-mono">
                            {Math.max(
                              0,
                              (selectedPO.orderedQty ||
                                allItemsForPO.reduce(
                                  (sum: number, i: any) =>
                                    sum +
                                    (i.qty_ordered ??
                                      i.qty ??
                                      i.orderedQty ??
                                      0),
                                  0,
                                )) -
                                (selectedPO.receivedQty ||
                                  allItemsForPO.reduce(
                                    (sum: number, i: any) =>
                                      sum +
                                      (i.qty_received ??
                                        i.receivedQty ??
                                        i.received_qty ??
                                        0),
                                    0,
                                  )),
                            )}{' '}
                            units
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
                                  await updatePOLeadTime(
                                    selectedPO.id.replace(/^PO-/i, ''),
                                    Number(leadTimeDays),
                                  );
                                  onAddActivity(
                                    `Updated Lead Time for ${selectedPO.id} to ${leadTimeDays} days`,
                                    'PO Updated',
                                  );
                                  toast.success(
                                    'Lead time updated successfully!',
                                  );
                                } catch (error) {
                                  console.error(error);
                                  toast.error('Failed to update lead time.');
                                }
                              }}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors"
                            >
                              {selectedPO.containerLeadTimeDays
                                ? 'Update'
                                : 'Save'}
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
                        <DataTable
                          columns={poItemColumns}
                          data={paginatedItems}
                          keyField="sku"
                          isLoading={
                            isLoadingComments || isItemsPaginationLoading
                          }
                          containerClassName="flex-1 flex flex-col min-h-0 rounded-lg border border-slate-100 bg-white w-full overflow-hidden"
                          tableWrapperClassName="overflow-auto flex-1 custom-scrollbar scroll-smooth"
                          theadClassName="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-widest font-semibold text-[9px] sticky top-0 z-10"
                          tableClassName="w-full min-w-max whitespace-nowrap text-left text-xs border-collapse"
                          tbodyClassName="divide-y divide-slate-100 text-slate-700"
                          trClassName={(item: any) =>
                            `transition ${Math.max(0, (item.qty || 0) - (item.receivedQty || 0)) > 0 ? 'bg-amber-50/50 hover:bg-amber-100/50' : 'hover:bg-slate-50/50'}`
                          }
                          emptyMessage="No items specified for this purchase order."
                        />
                        <div className="absolute top-0 left-0 w-0 h-0 z-[9999] overflow-visible">
                          <Tooltip
                            id="po-item-tooltip"
                            place="top"
                            positionStrategy="fixed"
                            style={{
                              backgroundColor: '#4f46e5',
                              color: '#ffffff',
                              fontWeight: 500,
                              fontSize: '11px',
                              zIndex: 100,
                              padding: '4px 8px',
                              borderRadius: '6px',
                              maxWidth: '300px',
                            }}
                          />
                        </div>
                        {totalItemsCount > 0 && (
                          <div className="mt-2 border border-slate-100 rounded-lg p-1 bg-white">
                            <Pagination
                              currentPage={itemsCurrentPage}
                              totalCount={totalItemsCount}
                              pageSize={itemsPageSize}
                              onPageChange={(page) => {
                                setIsItemsPaginationLoading(true);
                                setItemsCurrentPage(page);
                                setTimeout(
                                  () => setIsItemsPaginationLoading(false),
                                  300,
                                );
                              }}
                              onPageSizeChange={(newSize) => {
                                setIsItemsPaginationLoading(true);
                                setItemsPageSize(newSize);
                                setItemsCurrentPage(1);
                                setTimeout(
                                  () => setIsItemsPaginationLoading(false),
                                  300,
                                );
                              }}
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
                  {isCommentOnlyView && (
                    <div className="flex flex-col gap-2 shrink-0 bg-white p-3 rounded-xl border border-slate-200 shadow-sm mt-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        Discussion Scope
                      </label>
                      <div className="relative">
                        <button
                          onClick={() =>
                            setIsScopeDropdownOpen(!isScopeDropdownOpen)
                          }
                          className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-md p-2 flex items-center justify-between focus:outline-hidden focus:border-indigo-500 text-slate-700"
                        >
                          <span className="truncate">
                            {commentScope === 'po'
                              ? 'General PO Comments'
                              : selectedPO?.items?.find(
                                    (i: any) =>
                                      (i.id || i.sku) === selectedSkuId,
                                  )
                                ? `SKU: ${selectedPO?.items?.find((i: any) => (i.id || i.sku) === selectedSkuId)?.sku}`
                                : 'General PO Comments'}
                          </span>
                          <ChevronDown
                            className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isScopeDropdownOpen ? 'rotate-180' : ''}`}
                          />
                        </button>

                        {isScopeDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-50 overflow-hidden text-xs max-h-60 overflow-y-auto">
                            <button
                              className={`w-full text-left px-3 py-2 font-bold hover:bg-slate-50 transition-colors ${commentScope === 'po' ? 'bg-indigo-50/50 text-indigo-700' : 'text-slate-700'}`}
                              onClick={() => {
                                setCommentScope('po');
                                setSelectedSkuId(null);
                                setIsScopeDropdownOpen(false);
                              }}
                            >
                              General PO Comments
                            </button>

                            {selectedPO?.items?.length > 0 && (
                              <div className="px-3 py-1.5 bg-slate-50 border-y border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                SKU-wise Comments
                              </div>
                            )}

                            {selectedPO?.items?.map((item: any) => {
                              const itemId = item.id || item.sku;
                              const isSelected =
                                commentScope === 'sku' &&
                                selectedSkuId === itemId;
                              return (
                                <button
                                  key={`sku-${itemId}`}
                                  className={`w-full text-left px-3 py-2 transition-colors ${isSelected ? 'bg-indigo-50/50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                                  onClick={() => {
                                    setCommentScope('sku');
                                    setSelectedSkuId(itemId);
                                    setIsScopeDropdownOpen(false);
                                  }}
                                >
                                  SKU: {item.sku}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto pr-2 space-y-3.5 custom-scrollbar">
                    {(
                      isCommentOnlyView && commentScope === 'sku'
                        ? isLoadingSkuComments
                        : isLoadingComments
                    ) ? (
                      <div className="flex flex-col items-center justify-center py-12 space-y-3">
                        <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
                        <p className="text-xs text-slate-500 font-medium font-mono">
                          Loading messages...
                        </p>
                      </div>
                    ) : (
                      <>
                        {(() => {
                          const commentMap = new Map<string, any>();
                          (isCommentOnlyView && commentScope === 'sku'
                            ? fetchedSkuComments
                            : selectedPOComments
                          ).forEach((c) => {
                            commentMap.set(c.id, { ...c, children: [] });
                          });

                          const rootNodes: any[] = [];
                          (isCommentOnlyView && commentScope === 'sku'
                            ? fetchedSkuComments
                            : selectedPOComments
                          ).forEach((c) => {
                            const node = commentMap.get(c.id);
                            if (
                              node.parentId &&
                              commentMap.has(node.parentId)
                            ) {
                              commentMap.get(node.parentId).children.push(node);
                            } else {
                              rootNodes.push(node);
                            }
                          });

                          // Sort chronologically (assuming timestamp ordering natively or enforce here)
                          const sortNodes = (nodes: any[]) => {
                            return nodes.sort(
                              (a, b) =>
                                new Date(a.timestamp).getTime() -
                                new Date(b.timestamp).getTime(),
                            );
                          };

                          const renderCommentTree = (
                            node: any,
                            depth: number = 0,
                          ) => {
                            const isMeStr = (node.user || '').toLowerCase();
                            const isMe =
                              isMeStr === 'sourcing lead (you)' ||
                              (currentUser &&
                                (isMeStr ===
                                  `${currentUser.first_name || ''} ${currentUser.last_name || ''}`
                                    .trim()
                                    .toLowerCase() ||
                                  isMeStr ===
                                    String(
                                      currentUser.username || '',
                                    ).toLowerCase() ||
                                  isMeStr ===
                                    String(
                                      currentUser.email || '',
                                    ).toLowerCase() ||
                                  isMeStr ===
                                    String(
                                      currentUser.first_name || '',
                                    ).toLowerCase() ||
                                  (currentUser.id &&
                                    String(node.userId) ===
                                      String(currentUser.id))));

                            const isCollapsed =
                              collapsedComments[node.id] || false;

                            return (
                              <div
                                key={node.id}
                                className="flex flex-col relative mb-3"
                              >
                                <div className="flex gap-3 group relative transition-colors items-start">
                                  <div
                                    className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-sm border border-slate-100 ${isMe ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-700'}`}
                                  >
                                    {(node.user[0] || 'U').toUpperCase()}
                                  </div>
                                  <div
                                    className={`flex-1 min-w-0 flex flex-col p-3 rounded-2xl border ${isMe ? 'bg-indigo-50/30 border-indigo-100 shadow-sm' : 'bg-white border-slate-100/80 shadow-xs'}`}
                                  >
                                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                      <span className="font-bold text-[13px] text-slate-800">
                                        {node.user}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                                        {node.timestamp}
                                      </span>
                                      {!isMe && node.role && (
                                        <span className="text-[8px] uppercase font-bold text-slate-500 bg-slate-50 border border-slate-100 px-1 py-0.5 rounded-sm">
                                          {node.role}
                                        </span>
                                      )}
                                    </div>
                                    {editingCommentId === node.id ? (
                                      <div className="flex flex-col gap-2 w-full mt-1">
                                        <textarea
                                          value={editingCommentText}
                                          onChange={(e) =>
                                            setEditingCommentText(
                                              e.target.value,
                                            )
                                          }
                                          className="w-full text-[13px] text-slate-800 p-2 rounded border border-indigo-200 bg-white focus:outline-hidden focus:border-indigo-400"
                                          rows={2}
                                        />
                                        <div className="flex justify-end gap-2">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingCommentId(null);
                                              setEditingCommentText('');
                                            }}
                                            className="text-[11px] text-slate-500 hover:text-slate-700 px-2 py-1"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleUpdateSubmit(node.id)
                                            }
                                            className="text-[11px] bg-indigo-600 text-white font-semibold rounded px-3 py-1 hover:bg-indigo-700"
                                          >
                                            Save
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-[13px] text-slate-600 leading-relaxed break-words whitespace-pre-wrap">
                                        {node.message
                                          .split(/(@[\w.-]+)/g)
                                          .map((part: string, i: number) =>
                                            part.startsWith('@') ? (
                                              <span
                                                key={i}
                                                className="font-bold text-indigo-600"
                                              >
                                                {part}
                                              </span>
                                            ) : (
                                              part
                                            ),
                                          )}
                                      </p>
                                    )}

                                    {/* Action Bar */}
                                    <div className="flex items-center gap-4 mt-2">
                                      {isMe && editingCommentId !== node.id && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingCommentId(node.id);
                                            setEditingCommentText(node.message);
                                          }}
                                          className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 transition opacity-100"
                                        >
                                          <Pencil className="h-3 w-3" /> Edit
                                        </button>
                                      )}

                                      {!isMe && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setReplyToCommentId(node.id);
                                            setReplyToUser(node.user);
                                            setReplyToText(node.message);
                                          }}
                                          className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 transition opacity-100"
                                        >
                                          <Reply className="h-3 w-3" /> Reply
                                        </button>
                                      )}
                                      {node.children.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setCollapsedComments((prev) => ({
                                              ...prev,
                                              [node.id]: !prev[node.id],
                                            }))
                                          }
                                          className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-indigo-600 transition"
                                        >
                                          {isCollapsed ? (
                                            <>
                                              <MessageSquare className="h-3 w-3" />{' '}
                                              Expand {node.children.length}{' '}
                                              replies
                                            </>
                                          ) : (
                                            <>
                                              <ChevronUp className="h-3 w-3" />{' '}
                                              Collapse
                                            </>
                                          )}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Nested Children */}
                                {!isCollapsed && node.children.length > 0 && (
                                  <div className="mt-3 ml-4 sm:ml-6 pl-4 sm:pl-6 border-l-[1.5px] border-slate-200/80 flex flex-col relative">
                                    {sortNodes(node.children).map(
                                      (child: any) =>
                                        renderCommentTree(child, depth + 1),
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          };

                          return (
                            <div className="flex flex-col">
                              {sortNodes(rootNodes).map((root) =>
                                renderCommentTree(root, 0),
                              )}
                            </div>
                          );
                        })()}
                        {(commentScope === 'po'
                          ? selectedPOComments
                          : fetchedSkuComments
                        ).length === 0 && (
                          <div className="flex flex-col items-center justify-center py-8 space-y-2 opacity-70">
                            <MessageSquare className="h-8 w-8 text-slate-400" />
                            <p className="text-xs text-slate-500 font-medium font-mono">
                              No comment
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <form
                    onSubmit={handlePostComment}
                    className="flex flex-col gap-2 border-t border-slate-100 pt-3 shrink-0 relative"
                  >
                    {replyToUser && (
                      <div className="flex flex-col bg-slate-100 rounded-lg p-2.5 border-l-4 border-l-indigo-500 mb-1 animate-fadeIn relative group overflow-hidden">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-extrabold text-indigo-700">
                            {replyToUser}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setReplyToCommentId(null);
                              setReplyToUser(null);
                              setReplyToText(null);
                            }}
                            className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded p-1 transition"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1 italic pr-6 group-hover:line-clamp-2 transition-all">
                          {replyToText
                            ?.split(/(@[\w.-]+)/g)
                            .map((part: string, i: number) =>
                              part.startsWith('@') ? (
                                <span
                                  key={i}
                                  className="font-bold text-indigo-500 not-italic"
                                >
                                  {part}
                                </span>
                              ) : (
                                part
                              ),
                            )}
                        </p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        {showMentionDropdown && (
                          <div className="absolute bottom-full left-0 mb-1 w-64 bg-white border border-slate-200 shadow-xl rounded-xl z-50 flex flex-col animate-fadeIn">
                            <div className="max-h-48 overflow-y-auto py-1">
                              {(() => {
                                let taggableUsers = [...(reduxUsers || [])];
                                if (selectedPO?.vendorName) {
                                  taggableUsers.unshift({
                                    id: selectedPO.vendorId || 'vendor',
                                    full_name: selectedPO.vendorName,
                                    username: selectedPO.vendorName.replace(
                                      /\s+/g,
                                      '',
                                    ),
                                    email: 'Vendor (Owner)',
                                  });
                                }
                                // Remove current user safely by matching actual IDs
                                if (currentUser) {
                                  taggableUsers = taggableUsers.filter((u) => {
                                    if (
                                      currentUser.id &&
                                      u.id === currentUser.id
                                    )
                                      return false;
                                    if (
                                      currentUser.email &&
                                      u.email === currentUser.email
                                    )
                                      return false;
                                    if (
                                      currentUser.username &&
                                      u.username === currentUser.username
                                    )
                                      return false;
                                    return true;
                                  });
                                }

                                const filtered = taggableUsers.filter((u) => {
                                  const searchTargets = [
                                    (u.full_name || '').toLowerCase(),
                                    (u.username || '').toLowerCase(),
                                    (u.first_name || '').toLowerCase(),
                                    (u.last_name || '').toLowerCase(),
                                    (u.email || '').toLowerCase(),
                                  ];
                                  return (
                                    !mentionFilter ||
                                    searchTargets.some((t) =>
                                      t.includes(mentionFilter),
                                    )
                                  );
                                });

                                if (filtered.length === 0) {
                                  return (
                                    <div className="px-3 py-2 text-xs text-slate-400">
                                      No users found
                                    </div>
                                  );
                                }

                                return filtered.map((u) => {
                                  const displayName =
                                    u.full_name ||
                                    u.username ||
                                    `${u.first_name || ''} ${u.last_name || ''}`.trim() ||
                                    u.email;
                                  const initial = (
                                    displayName[0] || 'U'
                                  ).toUpperCase();
                                  return (
                                    <button
                                      key={u.id}
                                      type="button"
                                      onClick={() => handleSelectMention(u)}
                                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 transition"
                                    >
                                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                                        {initial}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-slate-700 truncate">
                                          {displayName}
                                        </div>
                                        <div className="text-[10px] text-slate-400 truncate">
                                          {u.email}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        )}
                        <input
                          type="text"
                          placeholder="Type a message... (Use @ to tag)"
                          value={newCommentText}
                          onChange={handleCommentTextChange}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white transition"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                      >
                        <Send className="h-3 w-3" />
                        <span>Comment</span>
                      </button>
                    </div>
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
                <label className="text-sm font-bold text-slate-700 block mb-2">
                  Filter Data
                </label>
                <select
                  value={exportFilterStatus}
                  onChange={(e) => setExportFilterStatus(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-indigo-500 focus:bg-white text-slate-700 transition"
                >
                  <option value="all">No Filter (All Data)</option>
                  <option value="invoice_delayed">
                    Invoice Delayed (Missing &gt; 10 days)
                  </option>
                  <option value="delivery_delayed">
                    Delivery Delayed (ETA Passed)
                  </option>
                  <option value="lefts_items">
                    Incomplete Receiving (Lefts Items)
                  </option>
                </select>
              </div>

              {/* Columns Selection */}
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-2">
                  Select Columns
                </label>
                <p className="text-xs text-slate-500 mb-4">
                  Choose the fields to include in your CSV export. Including
                  Item-Level columns will output one row per item.
                </p>

                <div className="space-y-5">
                  <div>
                    <h4 className="text-xs font-bold text-indigo-700 mb-2.5 uppercase tracking-wide border-b border-indigo-100 pb-1">
                      PO-Level Columns
                    </h4>
                    <div className="grid grid-cols-2 gap-2.5">
                      {PO_LEVEL_COLUMNS.map((col) => (
                        <label
                          key={col}
                          className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded transition select-none"
                        >
                          <input
                            type="checkbox"
                            checked={exportColumns.includes(col)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setExportColumns((C) => {
                                  const next = [...C, col];
                                  if (col === 'Comments') {
                                    if (!next.includes('PO ID'))
                                      next.push('PO ID');
                                    if (!next.includes('PO Title'))
                                      next.push('PO Title');
                                  }
                                  return next;
                                });
                              } else {
                                setExportColumns((C) =>
                                  C.filter((c) => c !== col),
                                );
                              }
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                          />
                          {col}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-emerald-700 mb-2.5 uppercase tracking-wide border-b border-emerald-100 pb-1">
                      Item-Level Columns
                    </h4>
                    <div className="grid grid-cols-2 gap-2.5">
                      {ITEM_LEVEL_COLUMNS.map((col) => (
                        <label
                          key={col}
                          className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded transition select-none"
                        >
                          <input
                            type="checkbox"
                            checked={exportColumns.includes(col)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setExportColumns((C) => {
                                  const next = [...C, col];
                                  if (!next.includes('PO ID'))
                                    next.push('PO ID');
                                  if (!next.includes('PO Title'))
                                    next.push('PO Title');
                                  return next;
                                });
                              } else {
                                setExportColumns((C) =>
                                  C.filter((c) => c !== col),
                                );
                              }
                            }}
                            className="rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                          />
                          {col}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-sky-700 mb-2.5 uppercase tracking-wide border-b border-sky-100 pb-1">
                      Container-Level Columns
                    </h4>
                    <div className="grid grid-cols-2 gap-2.5">
                      {CONTAINER_LEVEL_COLUMNS.map((col) => (
                        <label
                          key={col}
                          className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded transition select-none"
                        >
                          <input
                            type="checkbox"
                            checked={exportColumns.includes(col)}
                            onChange={(e) => {
                              if (e.target.checked)
                                setExportColumns((C) => [...C, col]);
                              else
                                setExportColumns((C) =>
                                  C.filter((c) => c !== col),
                                );
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
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Generate CSV
              </button>
            </div>
          </div>
        </div>
      )}
      {/* FullPageLoader removed in favor of localized TableLoaders for syncing */}

      {/* Modal Tooltips wrapper to prevent Flexbox flow interference */}
      <div className="absolute top-0 left-0 w-0 h-0 z-[9999] overflow-visible">
        <Tooltip
          id="po-metrics-tooltip"
          positionStrategy="fixed"
          place="top"
          className="max-w-xs z-[100] text-xs font-semibold leading-relaxed shadow-xl tracking-wide text-center"
          style={{
            backgroundColor: '#6366f1',
            color: '#ffffff',
            borderRadius: '8px',
            padding: '8px 12px',
          }}
        />
      </div>

      <ItemCommentModal
        isOpen={!!selectedItemForComments}
        onClose={() => setSelectedItemForComments(null)}
        targetItem={selectedItemForComments}
        selectedPO={selectedPO}
        onAddActivity={onAddActivity}
      />
    </div>
  );
}
