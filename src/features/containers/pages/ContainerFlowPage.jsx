import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useSelector, useDispatch } from 'react-redux';
import PODetailsModalStandalone from '../../purchaseOrders/components/PODetailsModalStandalone';
import {
  Package,
  Container,
  Plus,
  Save,
  Check,
  CheckCircle2,
  Info,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Search as SearchIcon,
  X,
  ExternalLink,
  Eye,
  FileDown,
  Download,
  Calendar,
  Edit,
  Trash2,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  FileSpreadsheet,
  Upload,
  ChevronDown,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'react-toastify';
import Select from 'react-select';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';

import InfiniteScrollDropdown from '../../../components/InfiniteScrollDropdown';
import Pagination from '../../../components/common/Pagination';
import DataTable from '../../../components/common/DataTable';
import ContainerDetailsModal from '../components/ContainerDetailsModal';
import ContainerCommentsModal from '../components/ContainerCommentsModal';
import ImportItemsModal from '../components/ImportItemsModal';
import FullPageLoader from '../../../components/common/FullPageLoader';
import TableLoader from '../../../components/common/TableLoader';
import SellerCloudSyncLoading from '../../../components/common/SellerCloudSyncLoading';
import DateFilterInput from '../../../components/common/DateFilterInput';
import WarehouseInfiniteDropdown from '../../../components/common/WarehouseInfiniteDropdown';
import { getWarehouses } from '../../../services/warehouse.service';
import {
  getPurchaseOrders,
  syncPOQuantities,
} from '../../purchaseOrders/services/purchaseOrder.service';
import { useCRM } from '../../../hooks/useCRM';
import ColumnsDropdown from '../../../components/common/ColumnsDropdown';
import { useColumnVisibility } from '../../../hooks/useColumnVisibility';

const CONTAINER_COLUMN_DEFS = [
  { key: 'id', label: 'Container ID' },
  { key: 'name', label: 'Container Name' },
  { key: 'comments', label: 'Comments' },
  { key: 'warehouse_name', label: 'Warehouse' },
  { key: 'po_numbers', label: 'PO Number' },
  { key: 'total_items', label: 'Total Items' },
  { key: 'total_qty_in_container', label: 'Total Qty' },
  { key: 'total_qty_received', label: 'Total Received' },
  { key: 'arrivalDate', label: 'ETA (Delivery)' },
  { key: 'received_date', label: 'Received Date' },
  { key: 'date_emptied', label: 'Unloaded' },
  { key: 'container_status', label: 'Status' },
  { key: 'actions', label: 'Actions', locked: true },
];
import {
  getContainers,
  getContainerPOItems,
  createContainer,
  updateContainer,
  deleteContainer,
  getContainerDetails,
  syncContainers,
  syncSingleContainer,
  updateContainerWarehouse,
  exportContainersCSV,
  searchContainerETA,
} from '../services/container.service';
import { setContainersList } from '../store/containerSlice';

// Display-only color/description lookup for the backend's container_status
// enum. The status itself is computed server-side — this only maps it to a
// badge color and a short explainer shown in the header tooltip.
const CONTAINER_STAGE_MAP = {
  FULLY_RECEIVED: {
    label: 'Fully Received',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-700',
    description: 'All items received in full.',
  },
  PARTIALLY_RECEIVED: {
    label: 'Partially Received',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-700',
    description: 'Some items received, not all.',
  },
  UNLOADED_EMPTIED: {
    label: 'Emptied',
    badgeClass: 'border-purple-200 bg-purple-50 text-purple-700',
    dotClass: 'bg-purple-500',
    textClass: 'text-purple-700',
    description: 'Container emptied, nothing received yet.',
  },
  PICKED_UP: {
    label: 'Picked Up',
    badgeClass: 'border-blue-200 bg-blue-50 text-blue-700',
    dotClass: 'bg-blue-500',
    textClass: 'text-blue-700',
    description: 'Dropped off, not yet unloaded.',
  },
  IN_TRANSIT: {
    label: 'In Transit',
    badgeClass: 'border-slate-200 bg-slate-100 text-slate-600',
    dotClass: 'bg-slate-400',
    textClass: 'text-slate-600',
    description: 'No activity recorded yet.',
  },
};

// container_status comes straight from the backend now — this just looks up
// its display styling, falling back to a neutral badge with the raw value
// for any status not in the map above.
function getContainerStageMeta(container) {
  const key = String(container.container_status || '')
    .trim()
    .toUpperCase();
  if (key && CONTAINER_STAGE_MAP[key]) {
    return CONTAINER_STAGE_MAP[key];
  }
  if (!key) return null;
  return {
    label: key.replace(/_/g, ' '),
    badgeClass: 'border-mc-beige-dark bg-mc-beige-light text-mc-black',
    dotClass: 'bg-slate-400',
    textClass: 'text-slate-600',
    description: 'Status reported by SellerCloud.',
  };
}

const CONTAINER_EXPORT_COLUMNS = [
  'container_name',
  'sellercloud_container_id',
  'estimated_arrival_date',
  'received_date',
  'warehouse_name',
  'sellercloud_po_id',
  'po_order_number',
  'sku',
  'item_name',
  'qty_ordered',
  'qty_in_container',
  'date_emptied',
];

const CONTAINER_EXPORT_COLUMNS_LABELS = {
  container_name: 'Container Name',
  sellercloud_container_id: 'System Container ID',
  estimated_arrival_date: 'ETA Delivery Date',
  received_date: 'Received Date',
  warehouse_name: 'Warehouse',
  sellercloud_po_id: 'System PO ID',
  po_order_number: 'PO Order Number',
  sku: 'SKU',
  item_name: 'Item Description',
  qty_ordered: 'Qty Ordered',
  qty_in_container: 'Qty In Container',
  date_emptied: 'Unloaded Date',
};

const highlightText = (text, query) => {
  if (!query || !query.trim() || text === undefined || text === null) {
    return <>{text}</>;
  }
  const safeText = String(text);
  const activeQuery = query.trim();
  const regex = new RegExp(
    `(${activeQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
    'gi',
  );
  const parts = safeText.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === activeQuery.toLowerCase() ? (
          <mark
            key={i}
            className="rounded-sm bg-yellow-200 px-0.5 font-bold text-slate-800"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
};

const POListCell = ({ rawPOs, listSearchQuery, setQuickViewPOId }) => {
  const [expanded, setExpanded] = useState(false);

  const uniquePOs = Array.from(new Set(rawPOs)).map((po) => {
    if (po === 'N/A') return po;
    return String(po)
      .replace(/^P[O0]-/i, '')
      .trim();
  });

  const MAX_VISIBLE = 2;
  const displayPOs = expanded ? uniquePOs : uniquePOs.slice(0, MAX_VISIBLE);

  return (
    <div className="flex max-w-[140px] flex-wrap items-center gap-[2px] leading-snug">
      {displayPOs.map((po, idx) => (
        <React.Fragment key={idx}>
          <button
            type="button"
            className="hover:text-mc-gold m-0 cursor-pointer border-none bg-transparent p-0 text-left transition-colors hover:underline"
            title={po}
            onClick={(e) => {
              e.stopPropagation();
              setQuickViewPOId(po);
            }}
          >
            {highlightText(po, listSearchQuery)}
          </button>
          {idx < displayPOs.length - 1 && (
            <span className="mr-1 text-slate-500">,</span>
          )}
        </React.Fragment>
      ))}

      {uniquePOs.length > MAX_VISIBLE && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="ml-1 text-[10px] font-bold text-slate-400 transition-colors hover:text-slate-600 focus:outline-none"
        >
          {expanded ? 'less' : `+${uniquePOs.length - MAX_VISIBLE} more`}
        </button>
      )}
    </div>
  );
};

export default function ContainerFlowPage() {
  const dispatch = useDispatch();
  const { user: currentUser } = useCRM();
  const isWarehouse = currentUser?.role?.toLowerCase() === 'warehouse';

  const {
    isVisible: isContainerColumnVisible,
    toggleColumn: toggleContainerColumn,
    saveVisibility: saveContainerColumnVisibility,
    saving: savingContainerColumns,
  } = useColumnVisibility('container', CONTAINER_COLUMN_DEFS, currentUser?.id);
  const rawPurchaseOrders = useSelector((state) => state.purchaseOrders?.list);
  const purchaseOrders = useMemo(
    () => rawPurchaseOrders || [],
    [rawPurchaseOrders],
  );

  // State for toggling between views
  const [showList, setShowList] = useState(true);
  const [quickViewPOId, setQuickViewPOId] = useState(null);
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(25);
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [isPaginating, setIsPaginating] = useState(false);
  const [listSortConfig, setListSortConfig] = useState({
    key: null,
    direction: 'asc',
  });
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const [totalListCount, setTotalListCount] = useState(0);
  const [receiveDateFrom, setReceiveDateFrom] = useState('');
  const [receiveDateTo, setReceiveDateTo] = useState('');
  const [etaFrom, setEtaFrom] = useState('');
  const [etaTo, setEtaTo] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');

  const containerTableRef = useRef(null);

  // Scroll containers table to top after pagination changes
  useEffect(() => {
    if (containerTableRef.current) {
      containerTableRef.current.scrollTop = 0;
    }
  }, [listPage, listPageSize]);

  const [showGlobalImport, setShowGlobalImport] = useState(false);

  // CSV Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportColumns, setExportColumns] = useState([]);
  const [exportFilterStatus, setExportFilterStatus] = useState('all');

  // State for the flow
  const [selectedPOIds, setSelectedPOIds] = useState([]);
  const [cachedPOs, setCachedPOs] = useState({});
  const [activePOTab, setActivePOTab] = useState(null);
  const [collapsedPOs, setCollapsedPOs] = useState({});
  const [containerName, setContainerName] = useState('');
  const [originalContainerName, setOriginalContainerName] = useState('');
  const [isManualContainerEntry, setIsManualContainerEntry] = useState(false);
  const [estimatedArrivalDate, setEstimatedArrivalDate] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  // Warehouse returned by the Get ETA API (/allways/search), stored as
  // { id, name }. Tracked separately from selectedWarehouseId so we can
  // compare the two — when they differ, selectedWarehouseId is updated to
  // match the ETA Warehouse (see handleFetchContainerEta).
  const [etaWarehouse, setEtaWarehouse] = useState(null);
  const [isFetchingEta, setIsFetchingEta] = useState(false);
  // True once Get ETA successfully returns a date — the Estimated Arrival
  // Date field is locked to that value. False (manual entry enabled) when
  // no ETA has been fetched yet, or the lookup failed / returned no date.
  const [isEtaDateAutoFilled, setIsEtaDateAutoFilled] = useState(false);
  const lastEtaLookupRef = useRef('');

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingContainerId, setEditingContainerId] = useState(null);
  const [viewingContainerDetails, setViewingContainerDetails] = useState(null);
  // Which tab ContainerDetailsModal should open on — 'details' by default,
  // 'comments' when opened via the table's Comments icon.
  const [containerDetailsInitialTab, setContainerDetailsInitialTab] =
    useState('details');
  // Container the standalone Comments popup (ContainerCommentsModal) is
  // currently open for — opened directly from the table's Comments icon.
  const [commentsModalContainer, setCommentsModalContainer] = useState(null);
  const { containerId: containerIdParam } = useParams();
  const [deepLinkSearchParams] = useSearchParams();
  const deepLinkNavigate = useNavigate();
  const deepLinkDispatchedRef = useRef(null);
  const [isViewContainerLoading, setIsViewContainerLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewPayload, setPreviewPayload] = useState(null);
  const [previewItems, setPreviewItems] = useState([]);

  // Items tracking
  const [selectedItems, setSelectedItems] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncMenu, setShowSyncMenu] = useState(false);
  const [showStageMenu, setShowStageMenu] = useState(false);
  const stageMenuRef = useRef(null);
  const [syncingContainerIds, setSyncingContainerIds] = useState(new Set());
  const [manualContainerInput, setManualContainerInput] = useState('');
  const [isSyncingManualContainer, setIsSyncingManualContainer] =
    useState(false);
  const syncMenuRef = useRef(null);

  useEffect(() => {
    const clickOutside = (e) => {
      if (syncMenuRef.current && !syncMenuRef.current.contains(e.target)) {
        setShowSyncMenu(false);
      }
      if (stageMenuRef.current && !stageMenuRef.current.contains(e.target)) {
        setShowStageMenu(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const handleSyncContainers = async (days = '25') => {
    setShowSyncMenu(false);
    try {
      setIsSyncing(true);
      await syncContainers(days);
      if (days === 'all') {
        toast.success('Successfully synced all containers from SellerCloud!');
      } else {
        toast.success(
          `Successfully synced containers for the past ${days} days from SellerCloud!`,
        );
      }
    } catch (error) {
      console.error('Error syncing containers:', error);
      toast.error('Failed to sync containers from SellerCloud.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncSingleContainer = async (container) => {
    const containerId = container?.id;
    if (!containerId) return;
    setSyncingContainerIds((prev) => new Set(prev).add(containerId));
    try {
      await syncSingleContainer(containerId);
      toast.success('Container synced successfully.');
      fetchTablePage();
    } catch (error) {
      console.error('Failed to sync container:', error);
      const errorMsg =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        'Failed to sync container.';
      toast.error(errorMsg);
    } finally {
      setSyncingContainerIds((prev) => {
        const next = new Set(prev);
        next.delete(containerId);
        return next;
      });
    }
  };

  const handleManualContainerSync = async (e) => {
    e?.preventDefault?.();
    const value = manualContainerInput.trim();
    if (!value || isSyncingManualContainer) return;

    setIsSyncingManualContainer(true);
    try {
      await syncSingleContainer(value);
      toast.success(`Container ${value} synced successfully.`);
      setManualContainerInput('');
      setShowSyncMenu(false);
      fetchTablePage();
    } catch (error) {
      console.error('Failed to sync container:', error);
      const errorMsg =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        `Failed to sync container ${value}.`;
      toast.error(errorMsg);
    } finally {
      setIsSyncingManualContainer(false);
    }
  };

  // Fetch warehouses
  const [warehousesList, setWarehousesList] = useState([]);
  useEffect(() => {
    getWarehouses()
      .then((data) => {
        const results = Array.isArray(data)
          ? data
          : data.results || data.data || [];
        setWarehousesList(results);
      })
      .catch((err) => console.error(err));
  }, []);
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const warehouseDropdownItems = useMemo(() => {
    let filtered = warehousesList;
    if (warehouseSearch) {
      const q = warehouseSearch.toLowerCase();
      filtered = filtered.filter(
        (wh) =>
          wh.name?.toLowerCase().includes(q) ||
          wh.warehouse_name?.toLowerCase().includes(q) ||
          wh.id?.toString().toLowerCase().includes(q),
      );
    }
    return filtered.map((wh) => ({
      value: wh.id,
      label: wh.name || wh.warehouse_name || wh.id,
    }));
  }, [warehousesList, warehouseSearch]);
  // ====== PO Dropdown Logic ======
  const [poList, setPoList] = useState([]);
  const [poSearch, setPoSearch] = useState('');
  const [poLoading, setPoLoading] = useState(false);
  const poSearchTimeout = useRef(null);

  const fetchPOs = useCallback(
    async (searchQuery = '') => {
      // POs are warehouse-scoped — nothing to show until a warehouse is
      // selected.
      if (!selectedWarehouseId) {
        setPoList([]);
        return;
      }
      // The PO list filter expects the SellerCloud warehouse ID, not our
      // internal warehouse UUID — look it up from the selected warehouse.
      const selectedWarehouse = warehousesList.find(
        (wh) => String(wh.id) === String(selectedWarehouseId),
      );
      const sellercloudWarehouseId =
        selectedWarehouse?.sellercloud_warehouse_id;
      if (!sellercloudWarehouseId) {
        console.warn(
          'Selected warehouse has no sellercloud_warehouse_id — skipping PO fetch.',
          selectedWarehouse,
        );
        setPoList([]);
        return;
      }
      try {
        setPoLoading(true);
        const data = await getPurchaseOrders({
          has_remaining_qty: true,
          warehouse_id: sellercloudWarehouseId,
          ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
        });
        const results = Array.isArray(data) ? data : data.results || [];
        setPoList(results);
      } catch (err) {
        console.error('Failed to fetch POs for dropdown', err);
      } finally {
        setPoLoading(false);
      }
    },
    [selectedWarehouseId, warehousesList],
  );

  useEffect(() => {
    setTimeout(() => {
      fetchPOs();
    }, 0);
  }, [fetchPOs]);

  const handlePoSearch = (query) => {
    setPoSearch(query);
    if (poSearchTimeout.current) clearTimeout(poSearchTimeout.current);
    poSearchTimeout.current = setTimeout(() => {
      fetchPOs(query);
    }, 400);
  };

  const vendorsList = useSelector((state) => state.vendors?.list || []);
  const poDropdownItems = useMemo(() => {
    // Only show what the warehouse-filtered API call actually returned —
    // the unfiltered Redux PO cache must never be merged in here, or it
    // defeats the warehouse filter.
    const rawList = [];
    if (Array.isArray(poList)) {
      rawList.push(...poList);
    }

    // Ensure selected POs are always in the list
    if (selectedPOIds && selectedPOIds.length > 0) {
      selectedPOIds.forEach((id) => {
        if (!rawList.some((p) => String(p.id) === String(id))) {
          const reduxPO =
            purchaseOrders?.find((p) => String(p.id) === String(id)) ||
            cachedPOs[id];
          if (reduxPO) rawList.unshift(reduxPO);
        }
      });
    }

    const finalItems = [];
    const seenLabels = new Set();

    rawList.forEach((po) => {
      const vendorName =
        po.vendor?.name ||
        vendorsList.find((v) => v.id === po.vendor_id)?.name ||
        po.vendorName ||
        po.vendor_name ||
        'Unknown Vendor';

      const pos = po.sellercloud_po_id
        ? po.sellercloud_po_id.toString().replace(/^PO-/, '')
        : String(po.order_number || po.id).replace(/^PO-/i, '');
      const label = `${po.sellercloud_po_id ? `${po.sellercloud_po_id.toString().replace(/^PO-/, '')}` : String(po.order_number || po.id).replace(/^PO-/i, '')} - ${vendorName}`;

      if (!seenLabels.has(label)) {
        seenLabels.add(label);
        finalItems.push({
          value: po.id,
          label,
          chipLabel: `PO-${pos}`,
        });
      }
    });

    return finalItems;
  }, [
    poList,
    purchaseOrders,
    vendorsList,
    selectedPOIds,
    poSearch,
    selectedWarehouseId,
    cachedPOs,
  ]);

  // ====== Container Infinite Scroll Logic ======
  const reduxContainers = useSelector((state) => state.containers?.list || []);
  const reduxContainersRef = useRef(reduxContainers);
  useEffect(() => {
    reduxContainersRef.current = reduxContainers;
  }, [reduxContainers]);

  const [containerList, setContainerList] = useState([]);
  const [containerPage, setContainerPage] = useState(1);
  const [containerSearch, setContainerSearch] = useState('');
  const [containerLoading, setContainerLoading] = useState(false);
  const [containerHasMore, setContainerHasMore] = useState(true);

  const fetchContainerAPI = useCallback(async (page, search, append = true) => {
    try {
      setContainerLoading(true);
      const data = await getContainers({ page, page_size: 25, search });
      const results = Array.isArray(data)
        ? data
        : data.results || data.data || data.items || [];

      if (data && data.has_next !== undefined) {
        setContainerHasMore(data.has_next);
      } else if (results.length < 25) {
        setContainerHasMore(false);
      } else {
        setContainerHasMore(true);
      }

      setContainerList((prev) => (append ? [...prev, ...results] : results));
    } catch (err) {
      console.error('Failed to fetch containers', err);
    } finally {
      setContainerLoading(false);
    }
  }, []);

  const fetchTablePage = useCallback(async () => {
    try {
      setListLoading(true);
      const params = {
        page: listPage,
        page_size: listPageSize,
        search: listSearchQuery,
      };
      if (receiveDateFrom) params.receive_date_from = receiveDateFrom;
      if (receiveDateTo) params.receive_date_to = receiveDateTo;
      if (etaFrom) params.eta_from = etaFrom;
      if (etaTo) params.eta_to = etaTo;
      if (warehouseFilter && warehouseFilter !== 'all') {
        params.sellercloud_warehouse_id = warehouseFilter;
      }
      if (stageFilter && stageFilter !== 'all') {
        params.container_status = stageFilter;
      }

      if (listSortConfig.key) {
        let sort_by = '';
        if (listSortConfig.key === 'arrivalDate') sort_by = 'eta_delivery';
        else if (listSortConfig.key === 'received_date')
          sort_by = 'receive_date';
        else if (listSortConfig.key === 'is_received') sort_by = 'status';
        else if (listSortConfig.key === 'date_emptied')
          sort_by = 'date_emptied';

        if (sort_by) {
          params.sort_by = sort_by;
          params.sort_order = listSortConfig.direction || 'desc';
        }
      }

      const data = await getContainers(params);
      const results = Array.isArray(data)
        ? data
        : data.results || data.data || data.items || [];

      const count =
        data.count !== undefined
          ? data.count
          : data.total ||
            data.total_count ||
            data.totalElements ||
            results.length;
      setTotalListCount(count);

      dispatch(setContainersList(results));
    } catch (err) {
      console.error('Failed to fetch table containers', err);
    } finally {
      setListLoading(false);
      setHasLoadedInitial(true);
    }
  }, [
    dispatch,
    listPage,
    listPageSize,
    listSearchQuery,
    receiveDateFrom,
    receiveDateTo,
    etaFrom,
    etaTo,
    warehouseFilter,
    stageFilter,
    listSortConfig,
  ]);

  const handleContainerPageChange = (newPage) => {
    setIsPaginating(true);
    setTimeout(() => {
      setListPage(newPage);
      setIsPaginating(false);
    }, 300);
  };

  const executeExportCSV = async () => {
    try {
      const toastId = toast.loading('Generating Export CSV...');

      const payload = {
        columns:
          exportColumns.length > 0 ? exportColumns : CONTAINER_EXPORT_COLUMNS,
      };

      if (exportFilterStatus === 'received') {
        payload.is_received = true;
      } else if (exportFilterStatus === 'pending') {
        payload.is_received = false;
      }

      await exportContainersCSV(payload);

      toast.update(toastId, {
        render: 'Export downloaded successfully!',
        type: 'success',
        isLoading: false,
        autoClose: 3000,
      });
      setShowExportModal(false);
    } catch (err) {
      console.error('Failed to export CSV', err);
      toast.dismiss();
      toast.error('Failed to generate export file');
    }
  };

  useEffect(() => {
    setTimeout(() => {
      fetchContainerAPI(1, '', false);
    }, 0);
  }, [fetchContainerAPI]);

  useEffect(() => {
    let timeoutId;
    if (showList) {
      timeoutId = setTimeout(() => {
        fetchTablePage();
      }, 400);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [showList, fetchTablePage]);

  const loadMoreContainers = () => {
    if (!containerLoading && containerHasMore) {
      const nextPage = containerPage + 1;
      setContainerPage(nextPage);
      fetchContainerAPI(nextPage, containerSearch, true);
    }
  };

  const containerSearchTimeout = useRef(null);

  const handleContainerSearch = (query) => {
    setContainerSearch(query);
    setContainerPage(1);
    if (containerSearchTimeout.current)
      clearTimeout(containerSearchTimeout.current);
    containerSearchTimeout.current = setTimeout(() => {
      fetchContainerAPI(1, query, false);
    }, 400);
  };

  const containerDropdownItems = useMemo(() => {
    // Show redux data first, then after set field show matching list
    const map = new Map();
    if (Array.isArray(reduxContainers)) {
      reduxContainers.forEach((c) =>
        map.set(
          String(c.id || c.container_name || c.name || c.container_number),
          c,
        ),
      );
    }
    if (Array.isArray(containerList)) {
      containerList.forEach((c) =>
        map.set(
          String(c.id || c.container_name || c.name || c.container_number),
          c,
        ),
      );
    }

    let displayList = containerSearch
      ? containerList
      : Array.from(map.values());

    if (
      containerName &&
      !displayList.some(
        (c) =>
          (c.container_name || c.name || c.container_number || c.id) ===
          containerName,
      ) &&
      !isManualContainerEntry
    ) {
      const existing = Array.from(map.values()).find(
        (c) =>
          (c.container_name || c.name || c.container_number || c.id) ===
          containerName,
      );
      if (existing) {
        displayList = [existing, ...displayList];
      }
    }

    const derived = displayList.map((c) => {
      const displayValue =
        c.container_name ||
        c.name ||
        c.container_number ||
        c.containerNumber ||
        c.id ||
        'Unnamed Container';
      return {
        value: displayValue,
        label: displayValue,
      };
    });

    const uniqueDerived = [];
    const valSet = new Set();
    derived.forEach((item) => {
      if (!valSet.has(item.value)) {
        valSet.add(item.value);
        uniqueDerived.push(item);
      }
    });

    uniqueDerived.unshift({
      value: '__CREATE_NEW__',
      label: '+ Add New Container Manually',
    });
    // Allow custom creation if not matching
    if (
      containerSearch &&
      !uniqueDerived.some(
        (c) => c.label.toLowerCase() === containerSearch.toLowerCase(),
      )
    ) {
      uniqueDerived.unshift({
        value: containerSearch,
        label: `+ Create "${containerSearch}"`,
      });
    }
    return uniqueDerived;
  }, [
    reduxContainers,
    containerList,
    containerSearch,
    containerName,
    isManualContainerEntry,
  ]);

  // Derived data
  const selectedPOs = useMemo(() => {
    return selectedPOIds
      .map(
        (id) =>
          poList?.find((po) => po.id === id) ||
          purchaseOrders?.find((po) => po.id === id) ||
          cachedPOs[id],
      )
      .filter(Boolean);
  }, [selectedPOIds, poList, purchaseOrders, cachedPOs]);

  const [fetchedPOItems, setFetchedPOItems] = useState([]);
  const [loadingPOItems, setLoadingPOItems] = useState(false);

  // qty_remaining is the single source of truth for what's left to
  // allocate — no other field or derived calculation is used.
  const getRawRemainingQty = (item) => item.qty_remaining || 0;

  const computeRemainingQty = (item) => getRawRemainingQty(item);

  useEffect(() => {
    async function fetchItems() {
      if (selectedPOs.length === 0) {
        setFetchedPOItems([]);
        return;
      }
      try {
        setLoadingPOItems(true);
        const allItems = [];

        await Promise.all(
          selectedPOs.map(async (po) => {
            const rawPoId = po.sellercloud_po_id || po.id;
            if (!rawPoId) return;
            const poId = rawPoId.toString().replace(/^PO-/, '');

            // Sync this PO's quantities first — items are only fetched once
            // sync-quantities responds with success (loadingPOItems stays
            // true for the whole sequence, so the item list shows as
            // loading throughout).
            let syncSucceeded = false;
            try {
              const syncResult = await syncPOQuantities(poId);
              syncSucceeded =
                syncResult?.success === true ||
                syncResult?.status === true ||
                syncResult?.status === 'success';
              if (!syncSucceeded) {
                console.warn(
                  `Quantity sync for PO ${poId} did not report success`,
                  syncResult,
                );
              }
            } catch (syncErr) {
              console.error(`Failed to sync quantities for PO ${poId}`, syncErr);
            }

            if (syncSucceeded) {
              try {
                const data = await getContainerPOItems(poId);
                let items = Array.isArray(data)
                  ? data
                  : data.results || data.data || data.items || [];
                if (items.length === 0 && po.items) {
                  items = po.items;
                }
                const cloned = items.map((i) => ({ ...i, bound_po_id: rawPoId }));
                allItems.push(...cloned);
              } catch (e) {
                const fallbackItems = po.items || [];
                const cloned = fallbackItems.map((i) => ({
                  ...i,
                  bound_po_id: rawPoId,
                }));
                allItems.push(...cloned);
              }
            } else {
              // Sync didn't succeed — don't call the items API, fall back
              // to whatever item data the PO already carries (if any).
              const fallbackItems = po.items || [];
              const cloned = fallbackItems.map((i) => ({
                ...i,
                bound_po_id: rawPoId,
              }));
              allItems.push(...cloned);
            }
          }),
        );

        setFetchedPOItems(allItems);
      } catch (err) {
        console.error('Failed to fetch detailed PO items', err);
      } finally {
        setLoadingPOItems(false);
      }
    }
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPOs.length, selectedPOIds.join(',')]);

  // Once a fresh (post-sync) item list lands, reconcile any rows already
  // allocated — their maxQty was frozen at add-time and otherwise never
  // reflects newer remaining-qty data (e.g. another container claiming
  // stock in the meantime), which is what showed a stale "/ N" limit.
  useEffect(() => {
    if (fetchedPOItems.length === 0) return;
    setSelectedItems((prev) =>
      prev.map((selected) => {
        const fresh = fetchedPOItems.find(
          (i) =>
            (i.po_item_id || i.id || i.uuid || i.poItemId) === selected.id,
        );
        if (!fresh) return selected;
        const maxQty = computeRemainingQty(fresh);
        return {
          ...selected,
          maxQty,
          allocateQty:
            selected.allocateQty !== '' && Number(selected.allocateQty) > maxQty
              ? maxQty
              : selected.allocateQty,
        };
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchedPOItems]);

  const availableItems = useMemo(() => {
    const items = fetchedPOItems.length > 0 ? fetchedPOItems : [];
    if (!items) return [];
    return items.filter(
      (item) =>
        !selectedItems.some(
          (sItem) =>
            sItem.id ===
            (item.po_item_id || item.id || item.uuid || item.poItemId),
        ) && getRawRemainingQty(item) > 0,
    );
  }, [selectedItems, fetchedPOItems]);

  const [itemSearchQuery, setItemSearchQuery] = useState('');

  const itemDropdownItems = useMemo(() => {
    return availableItems
      .filter((item) => {
        if (!itemSearchQuery) return true;
        const itemName = item.product_name || item.name || '';
        const lowerSearch = itemSearchQuery.toLowerCase();
        return (
          item.sku.toLowerCase().includes(lowerSearch) ||
          itemName.toLowerCase().includes(lowerSearch)
        );
      })
      .map((item) => ({
        value: item.po_item_id || item.id || item.uuid || item.poItemId,
        label:
          `${item.sku} ${item.product_name || item.name ? `- ${item.product_name || item.name}` : ''}`.trim(),
        bound_po_id: item.bound_po_id,
      }));
  }, [availableItems, itemSearchQuery]);

  const allContainers = useMemo(() => {
    // Map redux containers to the expected table format
    return reduxContainers.map((c) => {
      // Collect PO IDs: check po_numbers first (new API format), then purchase_orders, then po_id
      let poIds = [];
      if (c.po_numbers && c.po_numbers.length > 0) {
        poIds = c.po_numbers.map((n) => String(n));
      } else if (c.purchase_orders?.length > 0) {
        poIds = c.purchase_orders.map(
          (p) => p.po_number || p.sellercloud_po_id || String(p.id),
        );
      } else if (c.po_id) {
        poIds = [String(c.po_id)];
      }

      const totalItems =
        c.total_qty_in_container ||
        c.details?.reduce(
          (acc, curr) => acc + (curr.qty || curr.allocateQty || 0),
          0,
        ) ||
        c.totalItems ||
        c.total_items ||
        0;

      let rawDate = c.estimated_arrival_date || c.arrivalDate;
      let formattedDate = 'Pending';
      if (rawDate && rawDate !== 'Pending' && rawDate !== 'N/A') {
        formattedDate = String(rawDate).split('T')[0];
      }

      const rawRecvDate = c.received_date;
      let formattedRecvDate = 'N/A';
      if (rawRecvDate && rawRecvDate !== 'Pending' && rawRecvDate !== 'N/A') {
        formattedRecvDate = String(rawRecvDate).split('T')[0];
      }

      return {
        id: c.id,
        sellercloud_container_id: c.sellercloud_container_id || c.id,
        name:
          c.container_name ||
          c.name ||
          c.container_number ||
          'Unnamed Container',
        poIds: poIds.length > 0 ? poIds : ['N/A'],
        po_numbers: poIds.length > 0 ? poIds : [],
        totalItems: totalItems,
        arrivalDate: formattedDate,
        items: c.details || c.items || [],
        isApiOriginated: true,
        raw: c,
        warehouse_name:
          c.warehouse?.name || c.warehouse_name || c.warehouse || 'N/A',
        total_items: c.total_items || 0,
        total_qty_in_container: c.total_qty_in_container || 0,
        total_qty_received: c.total_qty_received || 0,
        is_received: !!c.is_received,
        received_date: formattedRecvDate,
        date_emptied: c.date_emptied,
        date_dropped_off: c.date_dropped_off,
        container_status: c.container_status || null,
        sellercloud_link: c.sellercloud_link || null,
        comments_count:
          c.comments_count ??
          c.comment_count ??
          c.total_comments_count ??
          c.commentsCount ??
          0,
      };
    });
  }, [reduxContainers]);

  // Server already applies received_date filtering via date_from/date_to
  const handleListSort = useCallback((key) => {
    setListSortConfig((prev) => {
      let direction = 'asc';
      if (prev.key === key && prev.direction === 'asc') {
        direction = 'desc';
      }
      return { key, direction };
    });
  }, []);

  const paginatedContainers = useMemo(() => {
    let sorted = [...allContainers];
    if (listSortConfig.key) {
      sorted.sort((a, b) => {
        let aVal = a[listSortConfig.key];
        let bVal = b[listSortConfig.key];

        if (listSortConfig.key === 'is_received') {
          aVal = aVal ? 1 : 0;
          bVal = bVal ? 1 : 0;
        }

        if (aVal < bVal) return listSortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return listSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [allContainers, listSortConfig]);

  const handlePOChange = (selections) => {
    const ids = selections ? selections.map((s) => s.value) : [];
    setSelectedPOIds(ids);

    if (ids.length > 0) {
      const newCached = {};
      ids.forEach((id) => {
        const found =
          poList?.find((p) => String(p.id) === String(id)) ||
          purchaseOrders?.find((p) => String(p.id) === String(id)) ||
          cachedPOs[id];
        if (found) newCached[id] = found;
      });
      setCachedPOs((prev) => ({ ...prev, ...newCached }));
    }

    const rawIds = ids.map((id) => {
      const po =
        poList?.find((p) => String(p.id) === String(id)) ||
        purchaseOrders?.find((p) => String(p.id) === String(id)) ||
        cachedPOs[id];
      return po ? po.sellercloud_po_id || po.order_number || po.id : id;
    });

    if (ids.length === 0) {
      setContainerName('');
      setOriginalContainerName('');
      setSelectedItems([]);
      setEstimatedArrivalDate('');
    } else {
      // Retain items only for POs still selected
      setSelectedItems((prev) =>
        prev.filter((item) =>
          rawIds.map(String).includes(String(item.bound_po_id)),
        ),
      );
    }

    setActivePOTab((currentTab) => {
      if (ids.length === 0) return null;
      if (currentTab && rawIds.map(String).includes(String(currentTab))) {
        return currentTab;
      }
      return rawIds[0];
    });

    if (ids.length > 0) {
      const firstPoId = ids[0];
      const po =
        poList.find((p) => p.id === firstPoId) ||
        purchaseOrders.find((p) => p.id === firstPoId);
      if (
        po &&
        (po.expected_delivery_date || po.eta) &&
        (po.expected_delivery_date || po.eta) !== 'Pending' &&
        (po.expected_delivery_date || po.eta) !== 'N/A'
      ) {
        const dateStr = (po.expected_delivery_date || po.eta).split('T')[0];
        setEstimatedArrivalDate((prev) => prev || dateStr);
      }
    }
  };

  const handleRemovePOTab = (poToRemove, event) => {
    event.stopPropagation();
    if (!poToRemove) return;

    const poRawId = poToRemove.sellercloud_po_id || poToRemove.id;

    // 1. Remove from PO selection lists
    const newPoIds = selectedPOIds.filter(
      (id) => String(id) !== String(poToRemove.id),
    );
    setSelectedPOIds(newPoIds);

    // 2. Erase the mapped items natively tied to this PO
    setSelectedItems((prev) =>
      prev.filter((item) => String(item.bound_po_id) !== String(poRawId)),
    );

    // 3. Keep Active POTab healthy
    setActivePOTab((currentTab) => {
      if (newPoIds.length === 0) return null;
      if (String(currentTab) === String(poRawId)) {
        const nextPoId = newPoIds[0];
        const nextPo =
          poList?.find((p) => String(p.id) === String(nextPoId)) ||
          purchaseOrders?.find((p) => String(p.id) === String(nextPoId));
        return nextPo ? nextPo.sellercloud_po_id || nextPo.id : nextPoId;
      }
      return currentTab;
    });

    if (newPoIds.length === 0) {
      setEstimatedArrivalDate('');
    }
  };

  const handleAddItem = (itemId) => {
    const item = availableItems.find(
      (i) => (i.po_item_id || i.id || i.uuid || i.poItemId) === itemId,
    );
    if (item) {
      setSelectedItems([
        ...selectedItems,
        {
          id:
            item.po_item_id ||
            item.id ||
            item.uuid ||
            item.poItemId ||
            item.po_item_uuid,
          sku: item.sku,
          name: item.product_name || item.name || 'Unknown Item',
          image:
            item.image_url ||
            item.imageUrl ||
            item.image ||
            item.imageSource ||
            item.product_image ||
            null,
          allocateQty: 0,
          maxQty: computeRemainingQty(item),
          bound_po_id: item.bound_po_id,
        },
      ]);
    }
  };

  const handleRemoveItem = (id) => {
    setSelectedItems(selectedItems.filter((item) => item.id !== id));
  };

  const handleQtyChange = (id, val) => {
    setSelectedItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          let numVal = val === '' ? '' : Number(val);
          return { ...item, allocateQty: numVal };
        }
        return item;
      }),
    );
  };

  const handleFetchContainerEta = useCallback(async (rawContainerNumber) => {
    const containerNumber = (rawContainerNumber || '').trim();
    if (!containerNumber) {
      toast.error('Enter a container number first.');
      return;
    }
    // Guard against duplicate/overlapping calls (e.g. Enter pressed right
    // after clicking Get ETA) firing two requests for the same lookup.
    if (isFetchingEta) {
      return;
    }
    lastEtaLookupRef.current = containerNumber;

    try {
      setIsFetchingEta(true);
      const data = await searchContainerETA(containerNumber);
      const result = Array.isArray(data) ? data[0] : data?.data || data;
      const rawEta =
        result?.eta ||
        result?.estimated_arrival_date ||
        result?.arrivalDate ||
        result?.eta_delivery_date;

      // Store the warehouse returned by the ETA API (/allways/search) as the
      // "ETA Warehouse" for display only — the user's Warehouse dropdown
      // selection is never changed automatically based on this lookup.
      const etaWarehouseId = result?.warehouse_id || null;
      const etaWarehouseName = result?.warehouse_name || null;

      if (etaWarehouseId || etaWarehouseName) {
        setEtaWarehouse({ id: etaWarehouseId, name: etaWarehouseName });
      } else {
        setEtaWarehouse(null);
      }

      if (rawEta && rawEta !== 'Pending' && rawEta !== 'N/A') {
        setEstimatedArrivalDate(String(rawEta).split('T')[0]);
        setIsEtaDateAutoFilled(true);
        toast.success('Estimated Arrival Date auto-filled from container lookup.');
      } else {
        // No ETA returned — leave the field enabled for manual entry.
        setIsEtaDateAutoFilled(false);
        toast.info('No ETA found for this container number yet.');
      }

    } catch (error) {
      console.error('Failed to fetch container ETA', error);
      toast.error('Failed to fetch ETA for this container number.');
      lastEtaLookupRef.current = '';
      setIsEtaDateAutoFilled(false);
    } finally {
      setIsFetchingEta(false);
    }
  }, [isFetchingEta]);

  const handleSave = async () => {
    if (selectedPOIds.length === 0) {
      toast.error('Please select a Purchase Order first.');
      return;
    }
    if (!estimatedArrivalDate) {
      toast.error('Please select an Estimated Arrival Date.');
      return;
    }
    if (!containerName.trim()) {
      toast.error('Please enter a container name.');
      return;
    }
    const itemsToSave = selectedItems.filter(
      (item) => item.allocateQty && Number(item.allocateQty) > 0,
    );

    const missingPOs = [];
    for (const po of selectedPOs) {
      const poRawId = po.sellercloud_po_id || po.id;
      const hasAllocatedItems = itemsToSave.some(
        (item) =>
          String(item.bound_po_id) === String(poRawId) ||
          String(item.bound_po_id) === String(po.id),
      );
      if (!hasAllocatedItems) {
        const poDisplay = po.sellercloud_po_id
          ? String(po.sellercloud_po_id).replace(/^PO-/, '')
          : String(po.order_number || po.id).replace(/^PO-/i, '');
        missingPOs.push(`PO-${poDisplay}`);
      }
    }

    if (missingPOs.length > 0) {
      toast.error(
        `Please allocate at least one item with a quantity greater than 0 for: ${missingPOs.join(', ')}.`,
      );
      return;
    }

    if (selectedItems.length === 0) {
      toast.error('Please add at least one item to the container.');
      return;
    }

    if (itemsToSave.length === 0) {
      toast.error(
        'Please allocate at least one item with a quantity greater than 0.',
      );
      return;
    }

    const overMaxItems = selectedItems.filter(
      (item) => item.allocateQty > item.maxQty,
    );
    if (overMaxItems.length > 0) {
      toast.error('Quantity cannot exceed the maximum available amount.');
      return;
    }

    // Construct the payload that would be sent to an API
    const apiPayload = {
      container_name: containerName.trim(),
      warehouse_id: selectedWarehouseId || null,
      estimated_arrival_date: estimatedArrivalDate
        ? `${estimatedArrivalDate}T00:00:00Z`
        : null,
      received_date: null,
      items: itemsToSave.map((item) => ({
        po_item_id: item.id || item.po_item_id || item.uuid || item.poItemId,
        qty_in_container: item.allocateQty,
      })),
    };

    setPreviewPayload(apiPayload);
    setPreviewItems(itemsToSave);
    setShowPreviewModal(true);
  };

  const handleConfirmSave = async () => {
    if (!previewPayload) return;
    try {
      setIsSaving(true);

      if (isEditMode && editingContainerId) {
        await updateContainer(editingContainerId, previewPayload);
        toast.success('Container updated successfully!');
      } else {
        const createdContainer = await createContainer(previewPayload);
        toast.success('Container created and items allocated successfully!');

        // If the ETA lookup returned a different warehouse than the one the
        // container was just created with, update the newly created
        // container's warehouse to match it.
        const newContainerId =
          createdContainer?.id ||
          createdContainer?.container_id ||
          createdContainer?.data?.id ||
          createdContainer?.data?.container_id ||
          createdContainer?.container?.id ||
          createdContainer?.data?.container?.id;
        const etaWarehouseId = etaWarehouse?.id;

        if (etaWarehouseId) {
          if (!newContainerId) {
            console.error(
              'Could not determine the new container ID from the create response — skipping warehouse update.',
              createdContainer,
            );
          } else if (
            String(etaWarehouseId) !== String(selectedWarehouseId || '')
          ) {
            try {
              await updateContainerWarehouse(newContainerId, etaWarehouseId);
            } catch (warehouseUpdateError) {
              console.error(
                'Failed to update container warehouse',
                warehouseUpdateError,
              );
              toast.error('Failed to update the container warehouse.');
            }
          }
        }
      }

      // Refresh the API list
      fetchContainerAPI(1, '', false);
      fetchTablePage(listPage, listPageSize);
      setShowPreviewModal(false);

      setContainerName('');
      setOriginalContainerName('');
      setSelectedWarehouseId('');
      setEtaWarehouse(null);
      setIsEtaDateAutoFilled(false);
      setEditingContainerId(null);
      setSelectedItems([]);
      setSelectedPOIds([]);
      setShowList(true); // Switch back to Assign Container Table
    } catch (error) {
      console.error('Error saving container', error);
      toast.error('Failed to save container data to server.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateContainer = () => {
    setIsEditMode(false);
    setEditingContainerId(null);
    setSelectedPOIds([]);
    setContainerName('');
    setOriginalContainerName('');
    setSelectedWarehouseId('');
    setEtaWarehouse(null);
    setEstimatedArrivalDate('');
    setIsEtaDateAutoFilled(false);
    setIsManualContainerEntry(true); // Default manual on create
    setSelectedItems([]);
    lastEtaLookupRef.current = '';
    setShowList(false);
  };

  const handleDeleteContainer = async (container) => {
    if (
      window.confirm(
        `Are you sure you want to delete container ${container.name}?`,
      )
    ) {
      if (container.id) {
        try {
          await deleteContainer(container.id);
          toast.success('Container deleted successfully');
          fetchContainerAPI(1, '', false);
          fetchTablePage(listPage, listPageSize);
        } catch (error) {
          console.error('Error deleting container', error);
          toast.error('Failed to delete container');
        }
      }
    }
  };

  const handleViewContainer = async (container, tab = 'details') => {
    if (!container.id) {
      toast.error('Invalid container ID');
      return;
    }
    setContainerDetailsInitialTab(tab);

    // Instantly pop open the modal using the basic data we already have from the table
    const initialMappedContainer = {
      ...container,
      details: container.items || [],
      po_id: container.poIds?.[0] || 'N/A',
    };

    setViewingContainerDetails(initialMappedContainer);
    setIsViewContainerLoading(true);

    try {
      // Background fetch to hydrate the view with rich details
      const detailsResp = await getContainerDetails(container.id);
      const data = Array.isArray(detailsResp) ? detailsResp[0] : detailsResp;

      setViewingContainerDetails((prev) => ({
        ...prev,
        ...container,
        ...data,
        details: data?.details || data?.items || container.items || [],
        po_id:
          data?.po_id ||
          data?.purchase_orders?.[0]?.id ||
          container.poIds?.[0] ||
          'N/A',
      }));
    } catch (e) {
      console.error(
        'Failed to view full container details (fallback applied):',
        e,
      );
      toast.warning('Displaying basic container details (server unavailable)');
    } finally {
      setIsViewContainerLoading(false);
    }
  };

  const handleViewContainerComments = (container) => {
    if (!container?.id) {
      toast.error('Invalid container ID');
      return;
    }
    setCommentsModalContainer(container);
  };

  // Reflects a freshly-added/removed comment's total count on the main
  // table row instantly, without waiting for a full list refetch.
  const handleContainerCommentsCountChange = (containerId, count) => {
    setCommentsModalContainer((prev) =>
      prev && prev.id === containerId ? { ...prev, comments_count: count } : prev,
    );
    dispatch(
      setContainersList(
        reduxContainers.map((c) =>
          c.id === containerId ? { ...c, comments_count: count } : c,
        ),
      ),
    );
  };

  // Closing the standalone Comments popup drops the viewer back into the
  // full Details modal for that same container — but only when the
  // container actually has comments; otherwise just close the popup.
  const handleCloseContainerComments = () => {
    const container = commentsModalContainer;
    setCommentsModalContainer(null);
    const count =
      parseInt(
        container?.comments_count ??
          container?.comment_count ??
          container?.total_comments_count ??
          container?.commentsCount,
        10,
      ) || 0;
    if (container?.id && count > 0) {
      handleViewContainer(container);
    }
  };

  // Email "View Comment" deep-link support. Two URL shapes are accepted:
  //   /container-flow/:containerId?category=...&comment_id=...
  //   /container-flow?container_id=...&category=...&comment_id=...
  // Opens the Container Details modal on the Comments tab for the given
  // container, then broadcasts a 'container-deep-link' event so the modal
  // can scroll to / highlight the specific comment (and auto-open its
  // image attachment, if any) once it has rendered.
  useEffect(() => {
    // The email link format may embed the id as "container_id=3491" or
    // "container_id:3861" inside a path segment, or as a plain
    // "?container_id=3491" query param.
    const rawContainerId =
      containerIdParam || deepLinkSearchParams.get('container_id');
    if (!rawContainerId) return;

    const cleanContainerId = decodeURIComponent(rawContainerId).replace(
      /^container_id[:=]/i,
      '',
    );
    if (!cleanContainerId) return;

    const category = deepLinkSearchParams.get('category');
    const commentId = deepLinkSearchParams.get('comment_id');
    const deepLinkKey = `${cleanContainerId}-${category}-${commentId}`;

    if (deepLinkDispatchedRef.current === deepLinkKey) return;
    deepLinkDispatchedRef.current = deepLinkKey;

    const openAndBroadcast = (container) => {
      // The email's "View Comment" link maps to the standalone Comments
      // popup (Discussion Scope dropdown), not the Details modal's tab.
      handleViewContainerComments(container);

      if (commentId || category) {
        // Only need to wait for the popup/modal to actually mount before
        // the comment sections can pick up the event — the sections
        // themselves poll while their own comments are still loading, so
        // this no longer needs to wait for the network fetch too.
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('container-deep-link', {
              detail: { containerId: container.id, category, commentId },
            }),
          );
          // Once the comment has had time to scroll into view/highlight,
          // drop the deep-link params so the address bar is clean again
          // and a later refresh doesn't keep re-triggering the same jump.
          setTimeout(() => {
            deepLinkNavigate('/container-flow', { replace: true });
          }, 4000);
        }, 50);
      }
    };

    // The email's `container_id` is usually the human-facing SellerCloud
    // container id, not the internal DB id `getContainerDetails` expects.
    // Resolve it first: check what's already loaded, then fall back to an
    // API search (so a container from another page still deep-links).
    const alreadyLoaded = (reduxContainersRef.current || []).find(
      (c) =>
        String(c.id) === String(cleanContainerId) ||
        String(c.sellercloud_container_id) === String(cleanContainerId),
    );

    if (alreadyLoaded) {
      openAndBroadcast(alreadyLoaded);
      return;
    }

    getContainers({ search: cleanContainerId, page: 1, page_size: 25 })
      .then((data) => {
        const results = Array.isArray(data) ? data : data?.results || [];
        const found =
          results.find(
            (c) =>
              String(c.id) === String(cleanContainerId) ||
              String(c.sellercloud_container_id) === String(cleanContainerId),
          ) || results[0];
        openAndBroadcast(found || { id: cleanContainerId });
      })
      .catch((err) => {
        console.error('Failed to resolve deep-linked container:', err);
        // Fall back to treating the value as the internal id directly.
        openAndBroadcast({ id: cleanContainerId });
      });
  }, [containerIdParam, deepLinkSearchParams]);

  const handleEditContainer = async (container) => {
    if (!container.id) {
      toast.error('Invalid container ID');
      return;
    }

    try {
      const detailsResp = await getContainerDetails(container.id);
      const data = Array.isArray(detailsResp) ? detailsResp[0] : detailsResp;
      const details = data?.details || data?.items || container.items || [];
      let rawPoIds = data?.purchase_orders?.map((po) => po.id) || [];
      let fallbackArray = container.po_numbers || container.poIds;
      if (
        rawPoIds.length === 0 &&
        fallbackArray &&
        fallbackArray[0] !== 'N/A'
      ) {
        rawPoIds = fallbackArray;
      }
      if (rawPoIds.length === 0 && data?.po_id) {
        rawPoIds = [data.po_id];
      }

      const finalPoIds = [];
      rawPoIds.forEach((raw) => {
        const found =
          poList.find(
            (p) =>
              p.id === raw || p.sellercloud_po_id == raw || p.po_number == raw,
          ) ||
          purchaseOrders.find(
            (p) =>
              p.id === raw || p.sellercloud_po_id == raw || p.po_number == raw,
          );
        if (found && !finalPoIds.includes(found.id)) finalPoIds.push(found.id);
      });

      setEditingContainerId(container.id);
      setContainerName(container.name);
      setOriginalContainerName(container.name);
      if (
        container.arrivalDate &&
        container.arrivalDate !== 'Pending' &&
        container.arrivalDate !== 'N/A'
      ) {
        setEstimatedArrivalDate(container.arrivalDate);
      } else {
        setEstimatedArrivalDate('');
      }
      setIsManualContainerEntry(false);

      setSelectedPOIds(finalPoIds);
      if (finalPoIds.length > 0) {
        setActivePOTab(finalPoIds[0]);
      } else {
        setActivePOTab(null);
      }

      if (details.length > 0) {
        setSelectedItems(
          details.map((item) => ({
            id: item.po_item_id || item.id || item.uuid || item.poItemId,
            sku: item.sku,
            name: item.product_name || item.name || 'Unknown Item',
            image:
              item.image_url ||
              item.imageUrl ||
              item.image ||
              item.imageSource ||
              item.product_image ||
              null,
            allocateQty:
              item.qty_in_container || item.qty || item.allocateQty || 0,
            // The API's remaining-qty already excludes this container's own
            // current allocation (it was subtracted when that qty was
            // committed) — add it back so the max reflects what the user can
            // actually raise this row's qty to, not less than what's already set.
            maxQty:
              (item.qty_remaining !== undefined
                ? item.qty_remaining
                : item.remaining_qty !== undefined
                  ? item.remaining_qty
                  : item.qty_ordered || item.maxQty || 9999) +
              (item.qty_in_container || item.qty || item.allocateQty || 0),
          })),
        );
      } else {
        setSelectedItems([]);
      }

      setIsEditMode(true);
      setShowList(false);
    } catch (err) {
      console.error('Failed to fetch container details', err);
      toast.error('Could not load container details for editing');
    }
  };

  const currentStep =
    !selectedWarehouseId || selectedPOIds.length === 0
      ? 1
      : selectedItems.length === 0
        ? 2
        : !containerName || !estimatedArrivalDate
          ? 3
          : 3;

  const containerColumns = useMemo(
    () => [
      {
        header: 'Container ID',
        accessor: 'id',
        className: 'px-6 py-4 font-mono font-medium text-slate-700 text-xs',
        render: (c) => (
          <div className="flex items-center gap-1.5">
            <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5">
              {highlightText(
                c.sellercloud_container_id || c.id,
                listSearchQuery,
              )}
            </span>
            {c.sellercloud_link && (
              <a
                title="Open in Sellercloud (Container)"
                href={c.sellercloud_link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="hover:text-mc-black inline-flex shrink-0 items-center text-slate-400 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleViewContainer(c);
              }}
              title="View container details"
              className="hover:text-mc-black inline-flex shrink-0 items-center text-slate-400 transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      },
      {
        header: 'Container Name',
        accessor: 'name',
        className: 'px-6 py-4 font-semibold text-slate-800',
        render: (c) => highlightText(c.name, listSearchQuery),
      },
      {
        header: 'Comments',
        accessor: 'comments',
        headerClassName: 'px-4 py-3 text-center',
        className: 'px-4 py-4 text-center',
        render: (c) => {
          const count =
            parseInt(
              c.comments_count ??
                c.comment_count ??
                c.total_comments_count ??
                c.commentsCount,
              10,
            ) || 0;
          const hasComments = count > 0;
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleViewContainerComments(c);
              }}
              className={`relative inline-flex rounded-xl border p-2 transition ${
                hasComments
                  ? 'border-mc-gold/50 bg-mc-gold/10 text-mc-black hover:bg-mc-gold/20 hover:border-mc-gold'
                  : 'border-mc-beige-dark bg-mc-white hover:bg-mc-beige-light/50 hover:text-mc-black text-slate-400'
              }`}
              title="View Comments"
            >
              <MessageSquare className="h-4 w-4" />
              {hasComments && (
                <span className="absolute -top-2 -right-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-white bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs">
                  {count >= 1000 ? `${Math.floor(count / 1000)}K+` : count}
                </span>
              )}
            </button>
          );
        },
      },
      {
        header: 'Warehouse',
        accessor: 'warehouse_name',
        className: 'px-6 py-4 font-medium text-slate-600',
        render: (c) =>
          highlightText(c.warehouse_name || 'N/A', listSearchQuery),
      },
      {
        header: 'PO Number',
        accessor: 'po_numbers',
        className: 'px-6 py-4 font-mono text-xs text-slate-600',
        render: (c) => {
          const rawPOs = c.po_numbers || c.poIds || [];
          if (
            !rawPOs ||
            rawPOs.length === 0 ||
            (rawPOs.length === 1 && rawPOs[0] === 'N/A')
          )
            return <span className="text-slate-400">N/A</span>;

          return (
            <POListCell
              rawPOs={rawPOs}
              listSearchQuery={listSearchQuery}
              setQuickViewPOId={setQuickViewPOId}
            />
          );
        },
      },
      {
        header: 'Total Items',
        accessor: 'total_items',
        headerClassName: 'px-4 py-3',
        className: 'px-4 py-4 font-bold text-slate-700',
      },
      {
        header: 'Total Qty',
        accessor: 'total_qty_in_container',
        headerClassName: 'px-4 py-3',
        className: 'px-4 py-4 font-bold text-slate-700',
      },
      {
        header: 'Total Received',
        accessor: 'total_qty_received',
        headerClassName: 'px-4 py-3',
        className: 'px-4 py-4 font-bold text-slate-700',
      },
      {
        header: (
          <div
            className="flex cursor-pointer items-center gap-1"
            onClick={() => handleListSort('arrivalDate')}
          >
            <span>ETA (Delivery)</span>
            <span className="group-hover:text-mc-black text-slate-400">
              {listSortConfig.key === 'arrivalDate' ? (
                listSortConfig.direction === 'asc' ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )
              ) : (
                <ArrowUpDown className="h-3 w-3 opacity-50 transition hover:opacity-100" />
              )}
            </span>
          </div>
        ),
        accessor: 'arrivalDate',
        headerClassName: 'px-4 py-3 select-none group',
        className: 'px-4 py-4 text-slate-600 font-medium text-xs',
      },
      // {
      //   header: (
      //     <div
      //       className="flex cursor-pointer items-center justify-center gap-1"
      //       onClick={() => handleListSort('is_received')}
      //     >
      //       <span>Shipping Status</span>
      //       <span className="group-hover:text-mc-black text-slate-400">
      //         {listSortConfig.key === 'is_received' ? (
      //           listSortConfig.direction === 'asc' ? (
      //             <ArrowUp className="h-3 w-3" />
      //           ) : (
      //             <ArrowDown className="h-3 w-3" />
      //           )
      //         ) : (
      //           <ArrowUpDown className="h-3 w-3 opacity-50 transition hover:opacity-100" />
      //         )}
      //       </span>
      //     </div>
      //   ),
      //   accessor: 'is_received',
      //   headerClassName: 'px-4 py-3 text-center select-none group',
      //   className: 'px-4 py-4 text-center',
      //   render: (c) =>
      //     c.is_received ? (
      //       <span className="inline-flex items-center gap-1 rounded-sm border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold tracking-wider text-emerald-700 uppercase">
      //         <CheckCircle2 className="h-3 w-3" /> Yes
      //       </span>
      //     ) : (
      //       <span className="inline-flex items-center gap-1 rounded-sm border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold tracking-wider text-amber-700 uppercase">
      //         No
      //       </span>
      //     ),
      // },
      {
        header: (
          <div
            className="flex cursor-pointer items-center gap-1"
            onClick={() => handleListSort('received_date')}
          >
            <span>Received Date</span>
            <span className="group-hover:text-mc-black text-slate-400">
              {listSortConfig.key === 'received_date' ? (
                listSortConfig.direction === 'asc' ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )
              ) : (
                <ArrowUpDown className="h-3 w-3 opacity-50 transition hover:opacity-100" />
              )}
            </span>
          </div>
        ),
        accessor: 'received_date',
        headerClassName: 'px-4 py-3 select-none group',
        className: 'px-4 py-4 text-slate-600 font-medium text-xs',
      },
      {
        header: (
          <div className="flex items-center justify-center gap-1">
            <span>Status</span>
            <div
              data-tooltip-id="container-stage-tooltip"
              data-tooltip-content="Status legend"
              className="text-slate-400 hover:text-slate-600 flex cursor-pointer items-center justify-center outline-hidden transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Info className="h-3.5 w-3.5" />
            </div>
          </div>
        ),
        accessor: 'container_status',
        headerClassName: 'px-4 py-3 select-none text-center',
        className: 'px-4 py-4 text-center',
        render: (c) => {
          const meta = getContainerStageMeta(c);
          if (!meta) {
            return <span className="text-slate-300">-</span>;
          }
          return (
            <span
              className={`rounded-sm border px-2 py-1 text-[10px] font-bold tracking-wider uppercase ${meta.badgeClass}`}
            >
              {meta.label}
            </span>
          );
        },
      },
      {
        header: (
          <div
            className="flex cursor-pointer items-center justify-center gap-1"
            onClick={() => handleListSort('date_emptied')}
          >
            <span>Unloaded</span>
            <span className="group-hover:text-mc-black text-slate-400">
              {listSortConfig.key === 'date_emptied' ? (
                listSortConfig.direction === 'asc' ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )
              ) : (
                <ArrowUpDown className="h-3 w-3 opacity-50 transition hover:opacity-100" />
              )}
            </span>
          </div>
        ),
        accessor: 'date_emptied',
        headerClassName: 'px-4 py-3 select-none text-center group',
        className: 'px-4 py-4 text-center',
        render: (c) => {
          const hasDate =
            c.date_emptied &&
            c.date_emptied !== 'N/A' &&
            c.date_emptied !== 'Pending';
          return hasDate ? (
            <span className="inline-flex items-center gap-1 rounded-sm border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold tracking-wider text-emerald-700 uppercase">
              <CheckCircle2 className="h-3 w-3" /> Yes
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-sm border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold tracking-wider text-amber-700 uppercase">
              No
            </span>
          );
        },
      },
      {
        header: 'Actions',
        accessor: 'actions',
        headerClassName: 'px-6 py-3 text-right',
        className: 'px-6 py-4 text-right',
        render: (c) => {
          const isSyncingThisContainer = syncingContainerIds.has(c.id);
          return (
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSyncSingleContainer(c);
                }}
                disabled={isSyncingThisContainer}
                className="text-mc-black inline-flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                title={isSyncingThisContainer ? 'Syncing...' : 'Sync Container'}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isSyncingThisContainer ? 'text-mc-gold animate-spin' : ''}`}
                />
              </button>
              <button
                onClick={() => handleViewContainer(c)}
                className="text-mc-black inline-flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-slate-100"
                title="View Details"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        },
      },
    ],
    [listSortConfig, handleListSort, listSearchQuery, syncingContainerIds],
  );

  const visibleContainerColumns = useMemo(
    () =>
      containerColumns.filter((col) => isContainerColumnVisible(col.accessor)),
    [containerColumns, isContainerColumnVisible],
  );

  if (showList) {
    return (
      <div className="bg-mc-beige-light/30 relative flex h-full w-full flex-col overflow-hidden">
        {/* Header */}
        <div className="border-mc-beige-dark bg-mc-white sticky top-0 z-30 flex flex-shrink-0 items-center justify-between border-b px-5 py-3 shadow-none">
          <div className="flex items-center gap-3">
            <div className="bg-mc-beige-light text-mc-black flex h-8 w-8 items-center justify-center rounded-lg">
              <Container className="h-4 w-4" />
            </div>
            <div>
              <h1 className="font-display text-mc-black text-lg font-bold">
                Container Management
              </h1>
              <p className="text-mc-gray-soft text-xs font-medium">
                Manage all shipping containers and PO allocations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative" ref={syncMenuRef}>
              <button
                onClick={() => setShowSyncMenu(!showSyncMenu)}
                disabled={isSyncing}
                className="border-mc-beige-dark bg-mc-beige-light text-mc-black hover:bg-mc-beige-dark flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`}
                />
                <span>
                  {isSyncing ? 'Syncing...' : 'Sync Container SellerCloud'}
                </span>
                <ChevronDown className="ml-0.5 h-3.5 w-3.5 text-slate-500" />
              </button>

              {showSyncMenu && (
                <div className="border-mc-beige-dark animate-fadeIn absolute top-full right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border bg-white shadow-lg">
                  <div className="border-mc-beige-dark border-b bg-slate-50 px-3 py-2">
                    <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                      Select timeframe
                    </span>
                  </div>
                  <div className="flex flex-col py-1">
                    <button
                      onClick={() => handleSyncContainers('1')}
                      className="text-mc-black hover:bg-mc-beige-light px-4 py-2 text-left text-xs font-medium transition"
                    >
                      Past 1 Day
                    </button>
                    <button
                      onClick={() => handleSyncContainers('3')}
                      className="text-mc-black hover:bg-mc-beige-light px-4 py-2 text-left text-xs font-medium transition"
                    >
                      Past 3 Days
                    </button>
                    <button
                      onClick={() => handleSyncContainers('7')}
                      className="text-mc-black hover:bg-mc-beige-light px-4 py-2 text-left text-xs font-medium transition"
                    >
                      Past 7 Days
                    </button>
                    <button
                      onClick={() => handleSyncContainers('all')}
                      className="text-mc-black hover:bg-mc-beige-light px-4 py-2 text-left text-xs font-medium transition"
                    >
                      Fetch All
                    </button>
                  </div>

                  {/* Manual Container Sync */}
                  <div className="border-t border-slate-100 bg-slate-50/70 p-3">
                    <span className="mb-1.5 block text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                      Or Sync Specific Container
                    </span>
                    <form
                      onSubmit={handleManualContainerSync}
                      className="flex items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        placeholder="Enter Container ID"
                        value={manualContainerInput}
                        onChange={(e) =>
                          setManualContainerInput(e.target.value)
                        }
                        className="focus:border-mc-gold focus:ring-mc-gold w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:ring-1 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={
                          !manualContainerInput.trim() ||
                          isSyncingManualContainer
                        }
                        className="bg-mc-black flex items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSyncingManualContainer ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          'Sync'
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => fetchTablePage()}
              disabled={listLoading}
              className="border-mc-beige-dark hover:bg-mc-beige-light hover:text-mc-black text-mc-gray-soft flex items-center gap-1 rounded-lg border bg-transparent px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${listLoading ? 'animate-spin' : ''}`}
              />
              <span>{listLoading ? 'Refreshing...' : 'Refresh Data'}</span>
            </button>
            {!isWarehouse && (
              <button
                onClick={() => setShowGlobalImport(true)}
                className="border-mc-beige-dark hover:bg-mc-beige-light hover:text-mc-black text-mc-gray-soft flex items-center gap-1.5 rounded-lg border bg-transparent px-3 py-1.5 text-xs font-bold transition"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Import CSV</span>
              </button>
            )}
            <button
              onClick={() => {
                setExportColumns([]);
                setExportFilterStatus('all');
                setShowExportModal(true);
              }}
              className="border-mc-beige-dark hover:bg-mc-beige-light hover:text-mc-black text-mc-gray-soft flex items-center gap-1.5 rounded-lg border bg-transparent px-3 py-1.5 text-xs font-bold transition"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
            {!isWarehouse && (
              <button
                onClick={handleCreateContainer}
                className="bg-mc-gold text-mc-black flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-bold shadow-none transition-colors hover:opacity-80"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Container
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="relative flex min-h-0 w-full flex-1 flex-col gap-4 p-4">
          <div className="border-mc-beige-dark bg-mc-white flex flex-shrink-0 flex-col gap-3 rounded-xl border p-4 shadow-none">
            {/* Search bar */}
            <div className="flex w-full items-center gap-3">
              <div className="relative flex-1">
                <Search className="text-mc-gray-soft absolute top-2.5 left-3 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Smart Search: Container Id,Container number..."
                  value={listSearchQuery}
                  onChange={(e) => {
                    setListSearchQuery(e.target.value);
                    setListPage(1);
                  }}
                  className="border-mc-beige-dark bg-mc-white focus:border-mc-black w-full rounded-lg border py-2 pr-8 pl-9 text-sm transition focus:outline-none"
                />
                {listSearchQuery && (
                  <button
                    onClick={() => {
                      setListSearchQuery('');
                      setListPage(1);
                    }}
                    className="text-mc-gray-soft hover:bg-mc-beige-light hover:text-mc-black absolute top-2.5 right-3 rounded-full p-0.5 transition"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex-shrink-0">
                <ColumnsDropdown
                  columns={CONTAINER_COLUMN_DEFS}
                  isVisible={isContainerColumnVisible}
                  onToggle={toggleContainerColumn}
                  onSave={saveContainerColumnVisibility}
                  saving={savingContainerColumns}
                />
              </div>
            </div>

            {/* Filters (New Line) */}
            <div className="flex w-full flex-wrap items-center gap-3">
              {/* Warehouse Filter - hidden for warehouse role */}
              {!isWarehouse && (
                <div className="flex flex-shrink-0 items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <Filter className="text-mc-gray-soft h-3.5 w-3.5" />
                    <span className="text-mc-gray-soft text-xs font-bold whitespace-nowrap">
                      Warehouse:
                    </span>
                  </div>
                  <div className="w-48">
                    <WarehouseInfiniteDropdown
                      value={warehouseFilter}
                      onChange={(val) => {
                        setWarehouseFilter(val);
                        setListPage(1);
                      }}
                      showAllOption={true}
                      className="border-mc-beige-dark bg-mc-white text-mc-black focus:border-mc-gold focus:ring-mc-gold w-full rounded-lg border p-2 text-xs focus:ring-1 focus:outline-none"
                    />
                  </div>
                </div>
              )}
              {/* Receipt Date Range Picker */}
              <div className="flex flex-shrink-0 items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Calendar className="text-mc-gray-soft h-3.5 w-3.5" />
                  <span className="text-mc-gray-soft text-xs font-bold whitespace-nowrap">
                    Received Date:
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <DateFilterInput
                    value={receiveDateFrom || ''}
                    onChange={(val) => {
                      setReceiveDateFrom(val);
                      if (
                        val &&
                        receiveDateTo &&
                        new Date(val) > new Date(receiveDateTo)
                      ) {
                        setReceiveDateTo('');
                      }
                      setListPage(1);
                    }}
                    title="Received Date From"
                  />
                  <span className="text-mc-gray-soft font-bold">-</span>
                  <DateFilterInput
                    value={receiveDateTo || ''}
                    onChange={(val) => {
                      setReceiveDateTo(val);
                      setListPage(1);
                    }}
                    minDate={receiveDateFrom}
                    title="Received Date To"
                  />
                </div>
              </div>

              {/* ETA Date Range Picker */}
              <div className="flex flex-shrink-0 items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Calendar className="text-mc-gray-soft h-3.5 w-3.5" />
                  <span className="text-mc-gray-soft text-xs font-bold whitespace-nowrap">
                    ETA:
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <DateFilterInput
                    value={etaFrom || ''}
                    onChange={(val) => {
                      setEtaFrom(val);
                      if (val && etaTo && new Date(val) > new Date(etaTo)) {
                        setEtaTo('');
                      }
                      setListPage(1);
                    }}
                    title="ETA From"
                  />
                  <span className="text-mc-gray-soft font-bold">-</span>
                  <DateFilterInput
                    value={etaTo || ''}
                    onChange={(val) => {
                      setEtaTo(val);
                      setListPage(1);
                    }}
                    minDate={etaFrom}
                    title="ETA To"
                  />
                </div>
              </div>

              {/* Status (container stage) Filter */}
              <div
                className="relative flex flex-shrink-0 items-center gap-2"
                ref={stageMenuRef}
              >
                <div className="flex items-center gap-1.5">
                  <Filter className="text-mc-gray-soft h-3.5 w-3.5" />
                  <span className="text-mc-gray-soft text-xs font-bold whitespace-nowrap">
                    Status:
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStageMenu((prev) => !prev)}
                  className="border-mc-beige-dark bg-mc-white text-mc-black focus:border-mc-gold focus:ring-mc-gold flex w-44 items-center justify-between rounded-lg border p-2 text-xs focus:ring-1 focus:outline-none"
                >
                  <span className="truncate">
                    {stageFilter === 'all'
                      ? 'All Statuses'
                      : CONTAINER_STAGE_MAP[stageFilter]?.label || stageFilter}
                  </span>
                  {stageFilter !== 'all' ? (
                    <X
                      className="h-3.5 w-3.5 flex-shrink-0 text-slate-400 transition-colors hover:text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStageFilter('all');
                        setShowStageMenu(false);
                        setListPage(1);
                      }}
                    />
                  ) : (
                    <ChevronDown
                      className={`h-3.5 w-3.5 flex-shrink-0 text-slate-400 transition-transform ${showStageMenu ? 'rotate-180' : ''}`}
                    />
                  )}
                </button>
                {showStageMenu && (
                  <div className="bg-mc-white border-mc-beige-dark animate-scaleUp absolute top-full left-0 z-50 mt-1 w-56 rounded-xl border p-2 shadow-lg">
                    <div className="max-h-60 space-y-0.5 overflow-y-auto">
                      {[
                        { value: 'all', label: 'All Statuses' },
                        { value: 'IN_TRANSIT', label: 'In Transit' },
                        { value: 'PICKED_UP', label: 'Picked Up' },
                        { value: 'UNLOADED_EMPTIED', label: 'Emptied' },
                        {
                          value: 'PARTIALLY_RECEIVED',
                          label: 'Partially Received',
                        },
                        { value: 'FULLY_RECEIVED', label: 'Fully Received' },
                      ].map((opt) => {
                        const isSelected = stageFilter === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setStageFilter(opt.value);
                              setShowStageMenu(false);
                              setListPage(1);
                            }}
                            className={`flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-xs transition ${
                              isSelected
                                ? 'bg-mc-beige-light text-mc-black font-bold'
                                : 'text-mc-black hover:bg-mc-beige-light/50'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {isSelected && (
                              <Check className="h-3.5 w-3.5" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {(() => {
                const hasActiveFilters =
                  !!listSearchQuery ||
                  (warehouseFilter && warehouseFilter !== 'all') ||
                  !!receiveDateFrom ||
                  !!receiveDateTo ||
                  !!etaFrom ||
                  !!etaTo ||
                  (stageFilter && stageFilter !== 'all');
                return (
                  <button
                    type="button"
                    disabled={!hasActiveFilters}
                    onClick={() => {
                      setListSearchQuery('');
                      setWarehouseFilter('all');
                      setReceiveDateFrom('');
                      setReceiveDateTo('');
                      setEtaFrom('');
                      setEtaTo('');
                      setStageFilter('all');
                      setListPage(1);
                    }}
                    className="border-mc-beige-dark flex flex-shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold text-slate-500 transition hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-slate-500"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear All
                  </button>
                );
              })()}
            </div>
          </div>
          <div className="border-mc-beige-dark bg-mc-white relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border shadow-xs">
            {(listLoading || isPaginating) && !isSyncing && (
              <TableLoader message={'Please wait a moment...'} />
            )}
            <DataTable
              columns={visibleContainerColumns}
              data={paginatedContainers}
              keyField="id"
              containerClassName="flex-1 flex flex-col min-h-0 w-full"
              tableWrapperClassName="overflow-auto flex-1 custom-scrollbar scroll-smooth"
              tableWrapperRef={containerTableRef}
              defaultThClassName="px-6 py-3 bg-transparent"
              theadClassName="bg-mc-beige-light border-b border-mc-beige-dark text-mc-black uppercase tracking-widest text-[10px] font-extrabold sticky top-0 z-10"
              tableClassName="w-full min-w-max whitespace-nowrap text-left text-xs border-collapse"
              tbodyClassName="divide-y divide-mc-beige-dark/40 bg-mc-white"
              trClassName="hover:bg-mc-beige-light/30 transition bg-mc-white"
              emptyMessage={
                listSearchQuery
                  ? 'No containers found matching your search.'
                  : 'No containers assigned yet. Click "Add Container" to start.'
              }
              pagination={
                totalListCount > 5 ? (
                  <Pagination
                    currentPage={listPage}
                    totalCount={totalListCount}
                    pageSize={listPageSize}
                    onPageChange={handleContainerPageChange}
                    onPageSizeChange={(size) => {
                      setListPageSize(size);
                      handleContainerPageChange(1);
                    }}
                  />
                ) : null
              }
            />
          </div>
        </div>

        <Tooltip
          id="container-stage-tooltip"
          positionStrategy="fixed"
          place="top"
          className="z-[100] max-w-md text-left leading-snug shadow-xl"
          style={{
            backgroundColor: '#F4EFE8',
            color: '#151717',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '10.5px',
          }}
          render={() => (
            <div className="flex flex-col gap-1">
              {Object.values(CONTAINER_STAGE_MAP).map((s) => (
                <div key={s.label} className="flex items-start gap-1.5">
                  <span
                    className={`mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${s.dotClass}`}
                  />
                  <span>
                    <span className={`font-bold ${s.textClass}`}>
                      {s.label}:
                    </span>{' '}
                    {s.description}
                  </span>
                </div>
              ))}
            </div>
          )}
        />

        <SellerCloudSyncLoading
          isOpen={isSyncing}
          onForceClose={() => setIsSyncing(false)}
        />

        {/* View Container Overlay Modal — must be inside this return block */}
        <ContainerDetailsModal
          container={viewingContainerDetails}
          onClose={() => setViewingContainerDetails(null)}
          initialTab={containerDetailsInitialTab}
          onRefresh={() => {
            fetchContainerAPI(1, '', false);
            fetchTablePage();
            if (viewingContainerDetails?.id) {
              handleViewContainer(
                { id: viewingContainerDetails.id },
                containerDetailsInitialTab,
              );
            }
          }}
        />

        {/* Standalone Container Comments Popup — must be inside this return block */}
        {commentsModalContainer && (
          <ContainerCommentsModal
            container={commentsModalContainer}
            onClose={handleCloseContainerComments}
            onTotalCountChange={(count) =>
              handleContainerCommentsCountChange(commentsModalContainer.id, count)
            }
          />
        )}

        {/* Export CSV Modal */}
        {showExportModal && (
          <div className="animate-in fade-in fixed inset-0 z-50 flex h-full w-full items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-xs">
            <div className="border-mc-beige-dark bg-mc-white relative my-auto flex w-full max-w-xl flex-col rounded-2xl border shadow-2xl">
              <div className="border-mc-beige-dark flex items-center justify-between border-b p-5">
                <div>
                  <h3 className="text-mc-black text-sm font-bold">
                    Export Container Data (CSV)
                  </h3>
                  <p className="text-mc-gray-soft mt-1 text-xs">
                    Select the filters and columns to include in your export.
                  </p>
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="text-mc-gray-soft rounded-lg p-2 transition hover:bg-rose-50 hover:text-rose-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="custom-scrollbar flex max-h-[60vh] flex-col gap-6 overflow-y-auto p-5">
                {/* Filter Section */}
                <div>
                  <h4 className="text-mc-black mb-3 text-xs font-bold tracking-wider uppercase">
                    Status Filter
                  </h4>
                  <div className="flex flex-col gap-2">
                    <label className="group flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="container-export-filter"
                        checked={exportFilterStatus === 'all'}
                        onChange={() => setExportFilterStatus('all')}
                        className="text-mc-black border-mc-beige-dark focus:ring-mc-gold accent-black"
                      />
                      <span className="text-mc-black group-hover:text-mc-gold text-mc-black text-sm font-medium transition-colors">
                        All Containers (Pending & Received)
                      </span>
                    </label>
                    <label className="group flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="container-export-filter"
                        checked={exportFilterStatus === 'pending'}
                        onChange={() => setExportFilterStatus('pending')}
                        className="text-mc-black border-mc-beige-dark focus:ring-mc-gold accent-black"
                      />
                      <span className="text-mc-black group-hover:text-mc-gold text-sm font-medium transition-colors">
                        Pending/Pick up Only
                      </span>
                    </label>
                    <label className="group flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="container-export-filter"
                        checked={exportFilterStatus === 'received'}
                        onChange={() => setExportFilterStatus('received')}
                        className="text-mc-black border-mc-beige-dark focus:ring-mc-gold accent-black"
                      />
                      <span className="text-mc-black group-hover:text-mc-gold text-sm font-medium transition-colors">
                        Received Containers Only
                      </span>
                    </label>
                  </div>
                </div>

                {/* Columns Section */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-mc-black text-xs font-bold tracking-wider uppercase">
                      Columns to Include
                    </h4>
                    <button
                      onClick={() => setExportColumns(CONTAINER_EXPORT_COLUMNS)}
                      className="text-mc-black hover:bg-mc-beige-light hover:border-mc-beige-dark rounded border border-transparent px-2 py-1 text-[10px] font-bold uppercase transition"
                    >
                      Select All
                    </button>
                  </div>
                  <div className="border-mc-beige-dark bg-mc-white grid grid-cols-2 gap-2 rounded-xl border p-4">
                    {CONTAINER_EXPORT_COLUMNS.map((col) => (
                      <label
                        key={col}
                        className="group flex cursor-pointer items-start gap-2"
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
                          className="border-mc-beige-dark text-mc-black focus:ring-mc-gold mt-0.5 rounded accent-black"
                        />
                        <span className="text-mc-black group-hover:text-mc-gold text-xs leading-tight font-medium transition-colors">
                          {CONTAINER_EXPORT_COLUMNS_LABELS[col] || col}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-mc-beige-dark bg-mc-white flex shrink-0 justify-end gap-2 rounded-b-2xl border-t p-5">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="border-mc-beige-dark bg-mc-white text-mc-black hover:bg-mc-beige-light rounded-lg border px-4 py-2 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={executeExportCSV}
                  className="bg-mc-black text-mc-white flex items-center gap-2 rounded-lg px-5 py-2 text-xs font-bold shadow-xs transition hover:bg-black"
                >
                  <Upload className="h-4 w-4" />
                  Generate CSV
                </button>
              </div>
            </div>
          </div>
        )}

        {showGlobalImport && (
          <ImportItemsModal
            containerId={null}
            containers={paginatedContainers}
            onClose={() => setShowGlobalImport(false)}
            onSuccess={() => {
              fetchContainerAPI(1, '', false);
              fetchTablePage();
            }}
          />
        )}

        {/* Modals for List View */}
        <ContainerDetailsModal
          container={viewingContainerDetails}
          isLoading={isViewContainerLoading}
          onClose={() => setViewingContainerDetails(null)}
          initialTab={containerDetailsInitialTab}
          onRefresh={() => {
            fetchContainerAPI(1, '', false);
            fetchTablePage();
            if (viewingContainerDetails?.id) {
              handleViewContainer(
                { id: viewingContainerDetails.id },
                containerDetailsInitialTab,
              );
            }
          }}
        />

        {/* PO Details Modal */}
        {quickViewPOId && (
          <PODetailsModalStandalone
            poId={quickViewPOId}
            onClose={() => setQuickViewPOId(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="animate-in fade-in bg-mc-beige-light/30 flex h-full w-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="border-mc-beige-dark bg-mc-white sticky top-0 z-30 flex flex-shrink-0 items-center justify-between border-b px-5 py-3 shadow-none">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowList(true)}
            className="text-mc-gray-soft hover:bg-mc-beige-light mr-1 rounded-md p-1.5 transition-colors"
            title="Back to Container List"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="bg-mc-beige-light text-mc-gray-soft flex h-8 w-8 items-center justify-center rounded-lg">
            <Container className="h-4 w-4" />
          </div>
          <div>
            <h1 className="font-display text-mc-black text-lg font-bold">
              {isEditMode ? 'Edit Container Flow' : 'Add Container Flow'}
            </h1>
            <p className="text-mc-gray-soft text-xs font-medium">
              Create and manage container allocations for Purchase Orders
            </p>
          </div>
        </div>
      </div>

      {/* Visual Stepper */}
      <div className="mx-auto mt-6 mb-2 w-full max-w-6xl px-4">
        <div className="relative flex items-center justify-between">
          <div className="absolute top-1/2 left-0 z-0 h-1 w-full -translate-y-1/2 rounded-full bg-slate-200"></div>
          <div
            className="bg-mc-gold absolute top-1/2 left-0 z-0 h-1 -translate-y-1/2 rounded-full transition-all duration-500 ease-in-out"
            style={{
              width:
                currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%',
            }}
          ></div>

          {/* Step 1 */}
          <div className="group relative z-10 flex flex-col items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-500 ${currentStep > 1 ? 'border-mc-gold bg-mc-gold text-mc-black' : currentStep === 1 ? 'border-mc-gold text-mc-gold shadow-mc-gold/20 bg-mc-white shadow-none' : 'border-mc-beige-dark bg-mc-white text-mc-gray-soft'}`}
            >
              {currentStep > 1 ? <CheckCircle2 className="h-4 w-4" /> : '1'}
            </div>
            <span
              className={`absolute -bottom-5 w-32 text-center text-[10px] font-bold whitespace-nowrap transition-colors ${currentStep >= 1 ? 'text-mc-black' : 'text-mc-gray-soft'}`}
            >
              Select Warehouse & PO
            </span>
          </div>

          {/* Step 2 */}
          <div className="group relative z-10 flex flex-col items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-500 ${currentStep > 2 ? 'border-mc-gold bg-mc-gold text-mc-black' : currentStep === 2 ? 'border-mc-gold text-mc-gold shadow-mc-gold/20 bg-mc-white shadow-none' : 'border-mc-beige-dark bg-mc-white text-mc-gray-soft'}`}
            >
              {currentStep > 2 ? <CheckCircle2 className="h-4 w-4" /> : '2'}
            </div>
            <span
              className={`absolute -bottom-5 w-32 text-center text-[10px] font-bold transition-colors ${currentStep >= 2 ? 'text-mc-black' : 'text-mc-gray-soft'}`}
            >
              Allocate Items
            </span>
          </div>

          {/* Step 3 */}
          <div className="group relative z-10 flex flex-col items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-500 ${currentStep === 3 ? 'border-mc-gold text-mc-gold shadow-mc-gold/20 bg-mc-white shadow-none' : 'border-mc-beige-dark bg-mc-white text-mc-gray-soft'}`}
            >
              3
            </div>
            <span
              className={`absolute -bottom-5 w-32 text-center text-[10px] font-bold transition-colors ${currentStep >= 3 ? 'text-mc-black' : 'text-mc-gray-soft'}`}
            >
              Container Details
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mx-auto w-full max-w-7xl space-y-4 p-4 pb-10">
        {/* Step 1: Select Warehouse & POs */}
        <div className="border-mc-beige-dark bg-mc-white relative z-[60] rounded-xl border p-4 shadow-none">
          <div className="mb-4 flex items-center gap-2">
            <span className="bg-mc-beige-light text-mc-black flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold">
              1
            </span>
            <h2 className="text-mc-black text-base font-bold">
              Select Warehouse & Purchase Orders
            </h2>
          </div>

          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
            <div>
              <label className="text-mc-black mb-1.5 block text-xs font-semibold">
                Select Warehouse
              </label>
              <div className="relative z-[50]">
                <InfiniteScrollDropdown
                  value={selectedWarehouseId}
                  onChange={(val) => {
                    if (val !== selectedWarehouseId) {
                      // Changing the warehouse should not disturb the
                      // already-selected POs, container name, allocated
                      // items/quantities, or ETA — only the warehouse
                      // itself updates.
                      setSelectedWarehouseId(val);
                    }
                  }}
                  onSearch={(q) => setWarehouseSearch(q)}
                  items={warehouseDropdownItems}
                  disabled={isEditMode}
                  placeholder="-- Choose Warehouse --"
                  searchPlaceholder="Search warehouses..."
                  hasMore={false}
                  isLoading={false}
                />
              </div>
            </div>

            {selectedWarehouseId && (
              <div className="animate-in fade-in slide-in-from-top-2 md:slide-in-from-left-4 duration-300">
                <label className="text-mc-black mb-1.5 block text-xs font-semibold">
                  Select Purchase Orders
                </label>
                <div className="relative z-[40]">
                  <InfiniteScrollDropdown
                    isMulti
                    value={selectedPOIds}
                    onChange={(newVals) =>
                      handlePOChange(newVals.map((val) => ({ value: val })))
                    }
                    onSearch={handlePoSearch}
                    onOpen={() => fetchPOs(poSearch)}
                    onLoadMore={() => {}}
                    hasMore={false}
                    isLoading={poLoading}
                    items={poDropdownItems}
                    disabled={isEditMode}
                    placeholder="-- Choose Purchase Orders --"
                    searchPlaceholder="Search POs..."
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedPOs.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col gap-4 duration-300 md:flex-row">
            {/* Left Sidebar for PO Tabs */}
            <div className="border-mc-beige-dark bg-mc-white flex h-auto w-full shrink-0 flex-col rounded-xl border p-4 shadow-none md:h-[525px] md:w-48 lg:w-56">
              <div className="mb-4 flex items-center gap-2">
                <span className="bg-mc-beige-light text-mc-black flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold">
                  2
                </span>
                <h2 className="text-mc-black text-base font-bold">
                  Selected POs
                </h2>
              </div>
              <div className="custom-scrollbar flex max-h-full w-full gap-2 overflow-x-auto overflow-y-auto pr-1 pb-2 md:flex-col md:pb-0">
                {selectedPOs.map((po) => {
                  const poRawId = po.sellercloud_po_id || po.id;
                  const poIdStr = String(poRawId).replace(/^PO-/, '');
                  const isActive = activePOTab === poRawId;
                  const thisPoAllocated = selectedItems.filter(
                    (item) => item.bound_po_id == poRawId,
                  ).length;
                  const vendorName =
                    po.vendor?.name ||
                    po.vendorName ||
                    po.vendor_name ||
                    vendorsList?.find?.((v) => v.id === po.vendor_id)?.name ||
                    'Unknown Vendor';

                  return (
                    <button
                      key={poRawId}
                      onClick={() => setActivePOTab(poRawId)}
                      className={`flex min-w-[140px] flex-col items-start gap-1 rounded-xl border p-3 text-left whitespace-nowrap transition-all outline-none ${
                        isActive
                          ? 'border-mc-gold ring-mc-gold bg-mc-white text-mc-black shadow-md ring-1 ring-inset'
                          : 'border-mc-beige-dark bg-mc-beige-light/30 text-mc-gray-soft hover:border-mc-gold/50 hover:bg-mc-white shadow-sm'
                      }`}
                    >
                      <div className="flex w-full items-start justify-between">
                        <span className="mt-0.5 font-mono text-sm font-bold">
                          PO-{poIdStr}
                        </span>
                        <div
                          className="hover:text-mc-red -mt-1 -mr-1 flex cursor-pointer items-center justify-center rounded-full p-1 text-slate-300 transition-colors hover:bg-rose-100/80"
                          onClick={(e) => handleRemovePOTab(po, e)}
                          title="Remove Purchase Order"
                        >
                          <X className="h-3.5 w-3.5" strokeWidth={3} />
                        </div>
                      </div>
                      <span
                        className="text-mc-gold -mt-1 w-full truncate text-[9px] font-bold tracking-wide uppercase opacity-90"
                        data-tooltip-id="vendor-tooltip"
                        data-tooltip-content={vendorName}
                      >
                        {vendorName}
                      </span>
                      <span
                        className={`text-[10px] font-bold tracking-wider uppercase ${isActive ? 'text-mc-gold' : ''}`}
                      >
                        {thisPoAllocated} items
                      </span>
                    </button>
                  );
                })}
              </div>
              <Tooltip
                id="vendor-tooltip"
                place="bottom-start"
                delayShow={300}
                style={{
                  zIndex: 100,
                  maxWidth: '250px',
                  fontSize: '11px',
                  backgroundColor: '#1a1a1a',
                  color: '#ffffff',
                  borderRadius: '6px',
                }}
              />
            </div>

            {/* Main Grid for Allocate Items & Container Details */}
            <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-3">
              {/* Step 2: Item Allocation */}
              <div className="border-mc-beige-dark bg-mc-white relative flex h-[525px] flex-col rounded-xl border p-4 shadow-none md:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-mc-black ml-1 text-base font-bold">
                      Allocate Items{' '}
                      {activePOTab ? (
                        <span className="text-mc-gold ml-2 font-mono text-sm tracking-wide">
                          PO-{String(activePOTab).replace(/^PO-/, '')}
                        </span>
                      ) : (
                        ''
                      )}
                    </h2>
                  </div>

                  {/* Scope dropdown items to the active tab po */}
                  {(() => {
                    if (!activePOTab) return null;
                    const activeItemsToAdd = itemDropdownItems.filter(
                      (opt) => opt.bound_po_id == activePOTab,
                    );
                    const allAllocated =
                      !loadingPOItems && activeItemsToAdd.length === 0;
                    return (
                      <div className="flex flex-col items-end gap-1">
                        <div className="relative z-[40] w-64">
                          <InfiniteScrollDropdown
                            value=""
                            onChange={(val) => {
                              if (val) handleAddItem(val);
                            }}
                            onSearch={(query) => setItemSearchQuery(query)}
                            onLoadMore={() => {}}
                            hasMore={false}
                            isLoading={loadingPOItems}
                            items={activeItemsToAdd}
                            disabled={isEditMode || allAllocated}
                            placeholder={
                              loadingPOItems
                                ? 'Loading items...'
                                : allAllocated
                                  ? 'All items allocated'
                                  : '+ Add items'
                            }
                            searchPlaceholder="Search items..."
                          />
                        </div>
                        {allAllocated && (
                          <span className="text-mc-gold flex items-center gap-1 text-[10px] font-semibold">
                            <CheckCircle2 className="h-3 w-3" />
                            All items from this PO have been added.
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {!activePOTab ? (
                  <div className="border-mc-beige-dark bg-mc-beige-light/30 flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                    <Container className="text-mc-beige-dark mb-3 h-10 w-10" />
                    <h3 className="text-mc-black mb-1 text-sm font-bold">
                      No PO Selected
                    </h3>
                    <p className="text-mc-gray-soft max-w-sm text-xs">
                      Please select a PO from the left panel to allocate its
                      items.
                    </p>
                  </div>
                ) : (
                  (() => {
                    const activeAllocatedItems = selectedItems.filter(
                      (item) => item.bound_po_id == activePOTab,
                    );
                    return activeAllocatedItems.length === 0 ? (
                      <div className="border-mc-beige-dark bg-mc-beige-light/30 flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                        <Container className="text-mc-beige-dark mb-3 h-10 w-10" />
                        <h3 className="text-mc-black mb-1 text-sm font-bold">
                          No items allocated
                        </h3>
                        <p className="text-mc-gray-soft max-w-sm text-xs">
                          Select items from the right dropdown to add them to
                          this container from this PO.
                        </p>
                      </div>
                    ) : (
                      <div className="custom-scrollbar flex-1 overflow-y-auto pr-2">
                        <div className="space-y-3">
                          {activeAllocatedItems.map((item) => (
                            <div
                              key={item.id || item.sku}
                              className="hover:border-mc-gold border-mc-beige-dark bg-mc-white flex flex-col justify-between gap-4 rounded-lg border p-3 shadow-sm transition-colors sm:flex-row sm:items-center"
                            >
                              <div className="flex items-start gap-3 overflow-hidden">
                                <div className="mt-0.5">
                                  {item.image ? (
                                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200">
                                      <img
                                        src={item.image}
                                        alt={item.sku}
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="bg-mc-beige-light text-mc-gray-soft flex h-8 w-8 flex-shrink-0 items-center justify-center rounded">
                                      <Container className="h-4 w-4" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-mc-black font-mono text-[13px] font-bold">
                                      {item.sku}
                                    </span>
                                  </div>
                                  <p
                                    className="text-mc-gray-soft truncate text-[11px]"
                                    title={item.name}
                                  >
                                    {item.name}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-start gap-3">
                                <div className="flex flex-col items-end">
                                  <label className="text-mc-gray-soft mb-1 text-[10px] font-bold tracking-wider uppercase">
                                    Quantity
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min="0"
                                      max={item.maxQty}
                                      value={
                                        item.allocateQty === ''
                                          ? ''
                                          : item.allocateQty
                                      }
                                      onChange={(e) =>
                                        handleQtyChange(item.id, e.target.value)
                                      }
                                      className={`focus:border-mc-gold focus:ring-mc-gold/20 w-20 rounded-md border px-2 py-1 text-right text-sm shadow-sm transition-colors focus:ring-2 ${
                                        Number(item.allocateQty) >
                                          item.maxQty ||
                                        Number(item.allocateQty) < 0
                                          ? 'border-mc-red text-mc-red bg-mc-red/10'
                                          : 'border-mc-beige-dark text-mc-black'
                                      }`}
                                      placeholder="0"
                                    />
                                    <span className="text-mc-gray-soft w-8 text-xs font-medium whitespace-nowrap">
                                      / {item.maxQty}
                                    </span>
                                  </div>
                                  {/* Inline Validation Messages */}
                                  {Number(item.allocateQty) > item.maxQty && (
                                    <span className="mt-1 text-[10px] font-bold text-rose-500">
                                      Exceeds max ({item.maxQty})
                                    </span>
                                  )}
                                  {item.allocateQty !== '' &&
                                    Number(item.allocateQty) < 0 && (
                                      <span className="mt-1 text-[10px] font-bold text-rose-500">
                                        Must be &gt;= 0
                                      </span>
                                    )}
                                </div>
                                <button
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="text-mc-gray-soft mt-4 ml-2 flex-shrink-0 rounded-lg p-1.5 transition-colors hover:bg-rose-50 hover:text-rose-500"
                                  title="Remove item"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Step 3: Container Details */}
              <div className="border-mc-beige-dark bg-mc-white rounded-xl border p-5 shadow-none md:col-span-1">
                <div className="mb-5 flex items-center gap-2">
                  <span className="bg-mc-beige-light text-mc-black flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold">
                    3
                  </span>
                  <h2 className="text-mc-black text-base font-bold">
                    Container Details
                  </h2>
                </div>

                <div className="space-y-5">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-mc-black block text-xs font-semibold">
                        Container Number
                      </label>
                      {isEditMode && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsManualContainerEntry(!isManualContainerEntry);
                            setContainerName('');
                          }}
                          className="text-mc-gold text-[10px] font-bold hover:underline"
                        >
                          {isManualContainerEntry
                            ? 'Select Existing'
                            : 'Enter Manually'}
                        </button>
                      )}
                    </div>
                    {isManualContainerEntry ? (
                      <div className="flex items-stretch gap-1.5">
                        <input
                          type="text"
                          value={containerName}
                          onChange={(e) => setContainerName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (!isFetchingEta) {
                                handleFetchContainerEta(containerName);
                              }
                            }
                          }}
                          placeholder="e.g. TCLU1234567"
                          className="focus:ring-mc-gold border-mc-beige-dark bg-mc-beige-light/30 text-mc-black w-full min-w-0 flex-1 rounded-md border px-3 py-1.5 font-mono text-sm font-bold focus:ring-2 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleFetchContainerEta(containerName)}
                          disabled={isFetchingEta || !containerName.trim()}
                          title="Fetch ETA for this container number"
                          className="border-mc-beige-dark bg-mc-beige-light text-mc-black hover:bg-mc-beige-dark flex flex-shrink-0 items-center gap-1 rounded-md border px-2.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isFetchingEta ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <SearchIcon className="h-3.5 w-3.5" />
                          )}
                          <span>Get ETA</span>
                        </button>
                      </div>
                    ) : (
                      <InfiniteScrollDropdown
                        value={containerName}
                        onChange={(val) => {
                          if (val === '__CREATE_NEW__') {
                            setIsManualContainerEntry(true);
                            setContainerName('');
                          } else {
                            setContainerName(val);
                          }
                        }}
                        onSearch={handleContainerSearch}
                        onLoadMore={loadMoreContainers}
                        hasMore={containerHasMore}
                        isLoading={containerLoading}
                        items={containerDropdownItems}
                        placeholder="e.g. TCNU 1234567"
                        searchPlaceholder="Search or create containers..."
                      />
                    )}
                    <p className="text-mc-gray-soft mt-1.5 text-[10px] leading-snug">
                      Note: Only use the container number as listed on{' '}
                      <span className="font-semibold">All Ways USA</span> for
                      ETA lookup to work correctly.
                    </p>
                  </div>

                  <div>
                    <label className="text-mc-black mb-1.5 block text-xs font-semibold">
                      Estimated Arrival Date
                    </label>
                    {isEtaDateAutoFilled ? (
                      // Get ETA returned a date — show it locked, no manual editing.
                      <div className="focus-within:ring-mc-gold relative rounded-md focus-within:ring-2">
                        <input
                          type="text"
                          value={estimatedArrivalDate}
                          disabled
                          readOnly
                          title="Date auto-filled from Get ETA."
                          className="border-mc-beige-dark bg-mc-beige-light/30 text-mc-black w-full cursor-not-allowed rounded-md border px-3 py-1.5 pr-8 text-sm font-medium opacity-70 outline-none"
                        />
                        <Calendar className="text-mc-black pointer-events-none absolute top-1/2 right-2.5 h-[15px] w-[15px] -translate-y-1/2" />
                      </div>
                    ) : (
                      // No ETA date returned — let the user pick one manually.
                      <div className="focus-within:ring-mc-gold relative rounded-md focus-within:ring-2">
                        <input
                          type="date"
                          value={estimatedArrivalDate}
                          onChange={(e) => setEstimatedArrivalDate(e.target.value)}
                          className={`border-mc-beige-dark bg-mc-beige-light/30 w-full rounded-md border px-3 py-1.5 pr-8 text-sm font-medium outline-none ${
                            !estimatedArrivalDate
                              ? 'text-mc-gray-soft font-normal'
                              : 'text-mc-black'
                          }`}
                        />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={
                      selectedItems.length === 0 ||
                      !estimatedArrivalDate ||
                      !selectedWarehouseId ||
                      isSaving
                    }
                    className={`mt-2 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold shadow-none transition-colors ${
                      selectedItems.length === 0 ||
                      !estimatedArrivalDate ||
                      !selectedWarehouseId ||
                      isSaving
                        ? 'cursor-not-allowed bg-slate-400 text-white'
                        : 'bg-mc-gold text-mc-black hover:opacity-80'
                    }`}
                  >
                    {isSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    {isSaving
                      ? isEditMode
                        ? 'Updating...'
                        : 'Creating...'
                      : isEditMode
                        ? 'Update Container'
                        : 'Create Container'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* View Container Overlay Modal */}
      <ContainerDetailsModal
        container={viewingContainerDetails}
        isLoading={isViewContainerLoading}
        onClose={() => setViewingContainerDetails(null)}
        initialTab={containerDetailsInitialTab}
        onRefresh={() => {
          fetchContainerAPI(1, '', false);
          fetchTablePage();
          if (viewingContainerDetails?.id) {
            handleViewContainer(
              { id: viewingContainerDetails.id },
              containerDetailsInitialTab,
            );
          }
        }}
      />

      {/* Preview Confirmation Modal */}
      {showPreviewModal && previewPayload && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4 font-sans backdrop-blur-sm">
          <div className="bg-mc-white border-mc-gold/20 flex max-h-[75vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border-2 p-5 shadow-2xl">
            <div className="mb-4 flex shrink-0 items-center justify-between">
              <h2 className="text-mc-black text-lg font-bold">
                Confirm Container Details
              </h2>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-mc-gray-soft hover:bg-mc-beige hover:border-mc-gold flex h-8 w-8 items-center justify-center rounded-full border border-transparent transition-colors"
                disabled={isSaving}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-mc-beige-light/40 border-mc-beige-dark mb-4 grid shrink-0 grid-cols-2 gap-3 rounded-lg border p-3 shadow-sm">
              <div>
                <label className="text-mc-gray-soft text-[9px] font-bold tracking-wider uppercase">
                  Container Name
                </label>
                <p className="text-mc-black font-mono text-xs font-bold">
                  {previewPayload.container_name}
                </p>
              </div>
              <div>
                <label className="text-mc-gray-soft text-[9px] font-bold tracking-wider uppercase">
                  Warehouse
                </label>
                <p className="text-mc-black font-mono text-xs font-bold">
                  {warehousesList.find(
                    (w) => w.id === previewPayload.warehouse_id,
                  )?.name || 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <h3 className="text-mc-black mb-1.5 shrink-0 text-[11px] font-bold tracking-wide uppercase">
                Items to Allocate
              </h3>
              <div className="border-mc-beige-dark custom-scrollbar flex-1 overflow-y-auto rounded-xl border shadow-sm">
                <div className="divide-mc-beige-dark bg-mc-white divide-y">
                  {previewItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-3 py-1.5 transition-colors hover:bg-slate-50"
                    >
                      <div className="flex flex-col">
                        <span className="text-mc-black font-mono text-[11px] font-bold">
                          {item.sku}
                        </span>
                        <span className="text-mc-gray-soft max-w-[350px] truncate text-[10px]">
                          {item.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-mc-gray-soft mr-2 text-[9px] font-bold uppercase">
                          Allocating
                        </span>
                        <span className="text-mc-gold font-mono text-xs font-bold">
                          {item.allocateQty}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-mc-beige-light border-mc-gold/40 shadow-mc-gold/10 mt-3 flex shrink-0 items-center justify-between rounded-lg border p-3 shadow-sm">
                <span className="text-mc-black text-xs font-bold tracking-wider uppercase">
                  Total Items Allocated
                </span>
                <span className="text-mc-gold font-mono text-lg font-bold">
                  {previewItems.reduce(
                    (acc, curr) => acc + (Number(curr.allocateQty) || 0),
                    0,
                  )}
                </span>
              </div>
            </div>

            <div className="border-mc-beige-dark mt-4 flex shrink-0 items-center justify-end gap-2 border-t pt-3">
              <button
                onClick={() => setShowPreviewModal(false)}
                disabled={isSaving}
                className="hover:bg-mc-beige border-mc-beige-dark text-mc-gray hover:text-mc-black rounded-md border px-4 py-1.5 text-[11px] font-bold transition-colors"
                type="button"
              >
                Back to Edit
              </button>
              <button
                onClick={handleConfirmSave}
                disabled={isSaving}
                className="bg-mc-gold text-mc-black shadow-mc-gold/20 flex min-w-[120px] items-center justify-center gap-2 rounded-md px-4 py-1.5 text-[11px] font-bold shadow-sm transition-all hover:brightness-110"
                type="button"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {isSaving
                  ? 'Processing...'
                  : isEditMode
                    ? 'Confirm Update'
                    : 'Confirm & Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FullPageLoader removed in favor of localized TableLoader */}
      {/* PO Details Modal */}
      {quickViewPOId && (
        <PODetailsModalStandalone
          poId={quickViewPOId}
          onClose={() => setQuickViewPOId(null)}
        />
      )}

      {/* Standalone Container Comments Popup (opened via the table's Comments icon) */}
      {commentsModalContainer && (
        <ContainerCommentsModal
          container={commentsModalContainer}
          onClose={handleCloseContainerComments}
          onTotalCountChange={(count) =>
            handleContainerCommentsCountChange(commentsModalContainer.id, count)
          }
        />
      )}
    </div>
  );
}
