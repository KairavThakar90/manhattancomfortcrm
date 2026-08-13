import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Package,
  Container,
  Plus,
  Save,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Edit,
  Trash2,
  Calendar,
  Eye,
  X,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  FileSpreadsheet,
  Download,
  Upload,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'react-toastify';

import InfiniteScrollDropdown from '../../../components/InfiniteScrollDropdown';
import Pagination from '../../../components/common/Pagination';
import DataTable from '../../../components/common/DataTable';
import ContainerDetailsModal from '../components/ContainerDetailsModal';
import ImportItemsModal from '../components/ImportItemsModal';
import FullPageLoader from '../../../components/common/FullPageLoader';
import TableLoader from '../../../components/common/TableLoader';
import SellerCloudSyncLoading from '../../../components/common/SellerCloudSyncLoading';
import DateFilterInput from '../../../components/common/DateFilterInput';
import WarehouseInfiniteDropdown from '../../../components/common/WarehouseInfiniteDropdown';
import { getWarehouses } from '../../../services/warehouse.service';
import { getPurchaseOrders } from '../../purchaseOrders/services/purchaseOrder.service';
import {
  getContainers,
  getContainerPOItems,
  createContainer,
  updateContainer,
  deleteContainer,
  getContainerDetails,
  syncContainers,
  exportContainersCSV,
} from '../services/container.service';
import { setContainersList } from '../store/containerSlice';

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

export default function ContainerFlowPage() {
  const dispatch = useDispatch();
  const rawPurchaseOrders = useSelector((state) => state.purchaseOrders?.list);
  const purchaseOrders = useMemo(
    () => rawPurchaseOrders || [],
    [rawPurchaseOrders],
  );

  // State for toggling between views
  const [showList, setShowList] = useState(true);
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
  const [dateFrom, setDateFrom] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');

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
  const [selectedPOId, setSelectedPOId] = useState('');
  const [containerName, setContainerName] = useState('');
  const [originalContainerName, setOriginalContainerName] = useState('');
  const [isManualContainerEntry, setIsManualContainerEntry] = useState(false);
  const [estimatedArrivalDate, setEstimatedArrivalDate] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingContainerId, setEditingContainerId] = useState(null);
  const [viewingContainerDetails, setViewingContainerDetails] = useState(null);
  const [isViewContainerLoading, setIsViewContainerLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Items tracking
  const [selectedItems, setSelectedItems] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncMenu, setShowSyncMenu] = useState(false);
  const syncMenuRef = useRef(null);

  useEffect(() => {
    const clickOutside = (e) => {
      if (syncMenuRef.current && !syncMenuRef.current.contains(e.target)) {
        setShowSyncMenu(false);
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

  const fetchPOs = useCallback(async (searchQuery = '') => {
    try {
      setPoLoading(true);
      const data = await getPurchaseOrders({
        ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
      });
      const results = Array.isArray(data) ? data : data.results || [];
      setPoList(results);
    } catch (err) {
      console.error('Failed to fetch POs for dropdown', err);
    } finally {
      setPoLoading(false);
    }
  }, []);

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
    // Show Redux data first, merge with API poList
    const rawList = [];
    // Only merge the full Redux cache if the user is not actively searching
    if (!poSearch && Array.isArray(purchaseOrders)) {
      rawList.push(...purchaseOrders);
    }
    if (Array.isArray(poList)) {
      rawList.push(...poList);
    }

    // Ensure selected PO is always in the list
    if (
      selectedPOId &&
      !rawList.some((p) => String(p.id) === String(selectedPOId))
    ) {
      const reduxPO = purchaseOrders?.find(
        (p) => String(p.id) === String(selectedPOId),
      );
      if (reduxPO) rawList.unshift(reduxPO);
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

      const label = `${po.sellercloud_po_id ? `${po.sellercloud_po_id.toString().replace(/^PO-/, '')}` : String(po.order_number || po.id).replace(/^PO-/i, '')} - ${vendorName}`;

      if (!seenLabels.has(label)) {
        seenLabels.add(label);
        finalItems.push({
          value: po.id,
          label,
        });
      }
    });

    return finalItems;
  }, [poList, purchaseOrders, vendorsList, selectedPOId, poSearch]);

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
      if (dateFrom) {
        params.date_from = dateFrom;
      }
      if (warehouseFilter && warehouseFilter !== 'all') {
        params.sellercloud_warehouse_id = warehouseFilter;
      }

      if (listSortConfig.key) {
        let sort_by = '';
        if (listSortConfig.key === 'arrivalDate') sort_by = 'eta_delivery';
        else if (listSortConfig.key === 'received_date')
          sort_by = 'receive_date';
        else if (listSortConfig.key === 'is_received') sort_by = 'status';

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
    dateFrom,
    warehouseFilter,
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
  const selectedPO = useMemo(() => {
    return (
      poList.find((po) => po.id === selectedPOId) ||
      purchaseOrders.find((po) => po.id === selectedPOId) ||
      null
    );
  }, [selectedPOId, poList, purchaseOrders]);

  const [fetchedPOItems, setFetchedPOItems] = useState([]);
  const [loadingPOItems, setLoadingPOItems] = useState(false);

  useEffect(() => {
    async function fetchItems() {
      if (!selectedPO) {
        setFetchedPOItems([]);
        return;
      }
      const rawPoId = selectedPO.sellercloud_po_id || selectedPO.id;
      if (!rawPoId) return;
      const poId = rawPoId.toString().replace(/^PO-/, '');

      try {
        setLoadingPOItems(true);
        const data = await getContainerPOItems(poId);
        let items = Array.isArray(data)
          ? data
          : data.results || data.data || data.items || [];

        if (items.length === 0 && selectedPO.items) {
          items = selectedPO.items;
        }

        setFetchedPOItems(items);
      } catch (err) {
        console.error('Failed to fetch detailed PO items', err);
        setFetchedPOItems(selectedPO?.items || []);
      } finally {
        setLoadingPOItems(false);
      }
    }
    fetchItems();
  }, [selectedPO]);

  const availableItems = useMemo(() => {
    const items =
      fetchedPOItems.length > 0 ? fetchedPOItems : selectedPO?.items || [];
    if (!items) return [];
    return items.filter(
      (item) => !selectedItems.some((sItem) => sItem.sku === item.sku),
    );
  }, [selectedPO, selectedItems, fetchedPOItems]);

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
        value: item.sku,
        label:
          `${item.sku} ${item.product_name || item.name ? `- ${item.product_name || item.name}` : ''}`.trim(),
      }));
  }, [availableItems, itemSearchQuery]);

  const allContainers = useMemo(() => {
    // Map redux containers to the expected table format
    return reduxContainers.map((c) => {
      const poIds =
        c.purchase_orders?.map((p) => p.po_number || p.sellercloud_po_id) || [];
      if (poIds.length === 0 && c.po_id) poIds.push(c.po_id);

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
        sellercloud_link: c.sellercloud_link || null,
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

  const handlePOChange = (val) => {
    setSelectedPOId(val);
    setContainerName('');
    setOriginalContainerName('');
    setSelectedItems([]);

    const po =
      poList.find((p) => p.id === val) ||
      purchaseOrders.find((p) => p.id === val);
    if (
      po &&
      (po.expected_delivery_date || po.eta) &&
      (po.expected_delivery_date || po.eta) !== 'Pending' &&
      (po.expected_delivery_date || po.eta) !== 'N/A'
    ) {
      const dateStr = (po.expected_delivery_date || po.eta).split('T')[0];
      setEstimatedArrivalDate(dateStr);
    } else {
      setEstimatedArrivalDate('');
    }
  };

  const handleAddItem = (sku) => {
    const item = availableItems.find((i) => i.sku === sku);
    if (item) {
      const remainingQty =
        item.qty_remaining !== undefined
          ? item.qty_remaining
          : item.remaining_qty !== undefined
            ? item.remaining_qty
            : (item.qty_ordered || item.qty || 0) -
              (item.qty_in_container ||
                item.qty_received ||
                item.receivedQty ||
                0);

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
          allocateQty: 0,
          maxQty:
            remainingQty > 0 ? remainingQty : item.qty_ordered || item.qty || 0,
        },
      ]);
    }
  };

  const handleRemoveItem = (sku) => {
    setSelectedItems(selectedItems.filter((item) => item.sku !== sku));
  };

  const handleQtyChange = (sku, val) => {
    setSelectedItems((prev) =>
      prev.map((item) => {
        if (item.sku === sku) {
          let numVal = val === '' ? '' : Number(val);
          return { ...item, allocateQty: numVal };
        }
        return item;
      }),
    );
  };

  const handleSave = async () => {
    if (!selectedPOId) {
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
    if (selectedItems.length === 0) {
      toast.error('Please add at least one item to the container.');
      return;
    }

    const itemsToSave = selectedItems.filter(
      (item) => item.allocateQty && item.allocateQty > 0,
    );
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

    try {
      setIsSaving(true);
      if (isEditMode && editingContainerId) {
        await updateContainer(editingContainerId, apiPayload);
        toast.success('Container updated successfully!');
      } else {
        await createContainer(apiPayload);
        toast.success('Container created and items allocated successfully!');
      }

      // Refresh the API list
      fetchContainerAPI(1, '', false);
      fetchTablePage(listPage, listPageSize);
    } catch (error) {
      console.error('Error saving container', error);
      toast.error('Failed to save container data to server.');
    } finally {
      setIsSaving(false);
    }

    setContainerName('');
    setOriginalContainerName('');
    setSelectedWarehouseId('');
    setEditingContainerId(null);
    setSelectedItems([]);
    setSelectedPOId('');
    setShowList(true); // Switch back to Assign Container Table
  };

  const handleCreateContainer = () => {
    setIsEditMode(false);
    setEditingContainerId(null);
    setSelectedPOId('');
    setContainerName('');
    setOriginalContainerName('');
    setSelectedWarehouseId('');
    setEstimatedArrivalDate('');
    setIsManualContainerEntry(true); // Default manual on create
    setSelectedItems([]);
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

  const handleViewContainer = async (container) => {
    if (!container.id) {
      toast.error('Invalid container ID');
      return;
    }

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

  const handleEditContainer = async (container) => {
    if (!container.id) {
      toast.error('Invalid container ID');
      return;
    }

    try {
      const detailsResp = await getContainerDetails(container.id);
      const data = Array.isArray(detailsResp) ? detailsResp[0] : detailsResp;
      const details = data?.details || data?.items || container.items || [];
      const rawPoId =
        data?.po_id ||
        data?.purchase_orders?.[0]?.id ||
        data?.purchase_orders?.[0]?.uuid ||
        data?.purchase_orders?.[0]?.po_number ||
        data?.purchase_orders?.[0]?.sellercloud_po_id ||
        (container.poIds?.[0] !== 'N/A' ? container.poIds?.[0] : '');

      let finalPoId = rawPoId;
      if (rawPoId) {
        const found =
          poList.find(
            (p) =>
              p.id === rawPoId ||
              p.sellercloud_po_id == rawPoId ||
              p.po_number == rawPoId,
          ) ||
          purchaseOrders.find(
            (p) =>
              p.id === rawPoId ||
              p.sellercloud_po_id == rawPoId ||
              p.po_number == rawPoId,
          );
        if (found) {
          finalPoId = found.id;
        }
      }

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

      setSelectedPOId(finalPoId);

      if (details.length > 0) {
        setSelectedItems(
          details.map((item) => ({
            id: item.po_item_id || item.id || item.uuid || item.poItemId,
            sku: item.sku,
            name: item.product_name || item.name || 'Unknown Item',
            allocateQty:
              item.qty_in_container || item.qty || item.allocateQty || 0,
            maxQty:
              item.qty_remaining !== undefined
                ? item.qty_remaining
                : item.remaining_qty !== undefined
                  ? item.remaining_qty
                  : item.qty_ordered || item.maxQty || 9999,
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

  const currentStep = !selectedPOId
    ? 1
    : selectedItems.length === 0
      ? 2
      : !containerName || !estimatedArrivalDate
        ? 3
        : !selectedWarehouseId
          ? 4
          : 4;

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
        header: 'Warehouse',
        accessor: 'warehouse_name',
        className: 'px-6 py-4 font-medium text-slate-600',
        render: (c) =>
          highlightText(c.warehouse_name || 'N/A', listSearchQuery),
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
      {
        header: (
          <div
            className="flex cursor-pointer items-center justify-center gap-1"
            onClick={() => handleListSort('is_received')}
          >
            <span>Shipping Status</span>
            <span className="group-hover:text-mc-black text-slate-400">
              {listSortConfig.key === 'is_received' ? (
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
        accessor: 'is_received',
        headerClassName: 'px-4 py-3 text-center select-none group',
        className: 'px-4 py-4 text-center',
        render: (c) =>
          c.is_received ? (
            <span className="inline-flex items-center gap-1 rounded-sm border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold tracking-wider text-emerald-700 uppercase">
              <CheckCircle2 className="h-3 w-3" /> Yes
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-sm border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold tracking-wider text-amber-700 uppercase">
              No
            </span>
          ),
      },
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
        header: 'Actions',
        accessor: 'actions',
        headerClassName: 'px-6 py-3 text-right',
        className: 'px-6 py-4 text-right',
        render: (c) => (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => handleViewContainer(c)}
              className="hover:text-mc-black inline-flex items-center text-slate-400 transition-colors"
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [listSortConfig, handleListSort, listSearchQuery],
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
                <div className="border-mc-beige-dark animate-fadeIn absolute top-full right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border bg-white shadow-lg">
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
            <button
              onClick={() => setShowGlobalImport(true)}
              className="border-mc-beige-dark hover:bg-mc-beige-light hover:text-mc-black text-mc-gray-soft flex items-center gap-1.5 rounded-lg border bg-transparent px-3 py-1.5 text-xs font-bold transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Import CSV</span>
            </button>
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
            <button
              onClick={handleCreateContainer}
              className="bg-mc-gold text-mc-black flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-bold shadow-none transition-colors hover:opacity-80"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Container
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative flex min-h-0 w-full flex-1 flex-col gap-4 p-4">
          <div className="border-mc-beige-dark bg-mc-white flex flex-shrink-0 flex-col justify-between gap-3 rounded-xl border p-4 shadow-none md:flex-row md:items-center">
            <div className="flex w-full items-center gap-3">
              {/* Search bar */}
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
              {/* Warehouse Filter */}
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
              {/* Order Date Filter - inline */}
              <div className="flex flex-shrink-0 items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Calendar className="text-mc-gray-soft h-3.5 w-3.5" />
                  <span className="text-mc-gray-soft text-xs font-bold whitespace-nowrap">
                    Received Date:
                  </span>
                </div>
                <DateFilterInput
                  value={dateFrom || ''}
                  onChange={(val) => {
                    setDateFrom(val);
                    setListPage(1);
                  }}
                  title="Received Date Filter"
                />
              </div>
            </div>
          </div>
          <div className="border-mc-beige-dark bg-mc-white relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border shadow-xs">
            {(listLoading || isPaginating) && !isSyncing && (
              <TableLoader message={'Please wait a moment...'} />
            )}
            <DataTable
              columns={containerColumns}
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

        <SellerCloudSyncLoading
          isOpen={isSyncing}
          onForceClose={() => setIsSyncing(false)}
        />

        {/* View Container Overlay Modal — must be inside this return block */}
        <ContainerDetailsModal
          container={viewingContainerDetails}
          onClose={() => setViewingContainerDetails(null)}
          onRefresh={() => {
            fetchContainerAPI(1, '', false);
            fetchTablePage();
            if (viewingContainerDetails?.id) {
              handleViewContainer({ id: viewingContainerDetails.id });
            }
          }}
        />

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
                        Pending/In-Transit Only
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
          onRefresh={() => {
            fetchContainerAPI(1, '', false);
            fetchTablePage();
            if (viewingContainerDetails?.id) {
              handleViewContainer({ id: viewingContainerDetails.id });
            }
          }}
        />
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
        <button
          onClick={handleSave}
          disabled={
            selectedItems.length === 0 ||
            !estimatedArrivalDate ||
            !selectedWarehouseId ||
            isSaving
          }
          className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-bold shadow-none transition-colors ${
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

      {/* Visual Stepper */}
      <div className="mx-auto mt-6 mb-2 w-full max-w-6xl px-4">
        <div className="relative flex items-center justify-between">
          <div className="absolute top-1/2 left-0 z-0 h-1 w-full -translate-y-1/2 rounded-full bg-slate-200"></div>
          <div
            className="bg-mc-gold absolute top-1/2 left-0 z-0 h-1 -translate-y-1/2 rounded-full transition-all duration-500 ease-in-out"
            style={{
              width:
                currentStep === 1
                  ? '0%'
                  : currentStep === 2
                    ? '33%'
                    : currentStep === 3
                      ? '66%'
                      : '100%',
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
              className={`absolute -bottom-5 w-32 text-center text-[10px] font-bold transition-colors ${currentStep >= 1 ? 'text-mc-black' : 'text-mc-gray-soft'}`}
            >
              Select PO
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
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-500 ${currentStep > 3 ? 'border-mc-gold bg-mc-gold text-mc-black' : currentStep === 3 ? 'border-mc-gold text-mc-gold shadow-mc-gold/20 bg-mc-white shadow-none' : 'border-mc-beige-dark bg-mc-white text-mc-gray-soft'}`}
            >
              {currentStep > 3 ? <CheckCircle2 className="h-4 w-4" /> : '3'}
            </div>
            <span
              className={`absolute -bottom-5 w-32 text-center text-[10px] font-bold transition-colors ${currentStep >= 3 ? 'text-mc-black' : 'text-mc-gray-soft'}`}
            >
              Container Details
            </span>
          </div>

          {/* Step 4 */}
          <div className="group relative z-10 flex flex-col items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-500 ${currentStep === 4 ? 'border-mc-gold text-mc-gold shadow-mc-gold/20 bg-mc-white shadow-none' : 'border-mc-beige-dark bg-mc-white text-mc-gray-soft'}`}
            >
              4
            </div>
            <span
              className={`absolute -bottom-5 w-32 text-center text-[10px] font-bold transition-colors ${currentStep === 4 ? 'text-mc-black' : 'text-mc-gray-soft'}`}
            >
              Select Warehouse
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mx-auto w-full max-w-7xl space-y-4 p-4 pb-10">
        {/* Step 1: Select PO */}
        <div className="border-mc-beige-dark bg-mc-white rounded-xl border p-4 shadow-none">
          <div className="mb-3 flex items-center gap-2">
            <span className="bg-mc-beige-light text-mc-black flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold">
              1
            </span>
            <h2 className="text-mc-black text-base font-bold">
              Select Purchase Order
            </h2>
          </div>

          <div className="relative">
            <InfiniteScrollDropdown
              value={selectedPOId}
              onChange={handlePOChange}
              onSearch={handlePoSearch}
              onLoadMore={() => {}}
              hasMore={false}
              isLoading={poLoading}
              items={poDropdownItems}
              disabled={isEditMode}
              placeholder="-- Choose a Purchase Order --"
              searchPlaceholder="Search POs..."
            />
          </div>
        </div>

        {selectedPO && (
          <div className="animate-in fade-in slide-in-from-bottom-4 grid grid-cols-1 gap-4 duration-300 md:grid-cols-3">
            {/* Step 2: Item Allocation */}
            <div className="border-mc-beige-dark bg-mc-white flex h-[525px] flex-col rounded-xl border p-4 shadow-none md:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-mc-beige-light text-mc-black flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold">
                    2
                  </span>
                  <h2 className="text-mc-black text-base font-bold">
                    Allocate Items
                  </h2>
                </div>

                {(availableItems.length > 0 || loadingPOItems) && (
                  <div className="relative w-64">
                    <InfiniteScrollDropdown
                      value=""
                      onChange={(val) => {
                        if (val) {
                          handleAddItem(val);
                        }
                      }}
                      onSearch={(query) => setItemSearchQuery(query)}
                      onLoadMore={() => {}}
                      hasMore={false}
                      isLoading={loadingPOItems}
                      items={itemDropdownItems}
                      placeholder={
                        loadingPOItems
                          ? 'Loading items...'
                          : isEditMode
                            ? '+ Add item from PO...'
                            : '+ Add items'
                      }
                      searchPlaceholder="Search items..."
                    />
                  </div>
                )}
              </div>

              {selectedItems.length === 0 ? (
                <div className="border-mc-beige-dark bg-mc-beige-light/30 flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                  <Container className="text-mc-beige-dark mb-3 h-10 w-10" />
                  <h3 className="text-mc-black mb-1 text-sm font-bold">
                    No items selected
                  </h3>
                  <p className="text-mc-gray-soft max-w-sm text-xs">
                    Select a PO from the dropdown above to start adding items to
                    this container.
                  </p>
                </div>
              ) : (
                <div className="custom-scrollbar flex-1 overflow-y-auto pr-2">
                  <div className="space-y-3">
                    {selectedItems.map((item) => (
                      <div
                        key={item.sku}
                        className="hover:border-mc-gold border-mc-beige-dark bg-mc-white flex flex-col justify-between gap-4 rounded-lg border p-3 transition-colors sm:flex-row sm:items-center"
                      >
                        <div className="flex items-start gap-3 overflow-hidden">
                          <div className="mt-0.5">
                            <div className="bg-mc-beige-light text-mc-gray-soft flex h-8 w-8 flex-shrink-0 items-center justify-center rounded">
                              <Container className="h-4 w-4" />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className="text-mc-black truncate text-sm font-bold"
                              title={item.sku}
                            >
                              {item.sku}
                            </p>
                            <p className="text-mc-gray-soft mt-0.5 truncate text-xs">
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
                                  handleQtyChange(item.sku, e.target.value)
                                }
                                className={`bg-mc-beige-light/30 w-20 rounded border px-2 py-1 text-right font-mono text-sm font-bold focus:ring-1 focus:outline-none ${
                                  item.allocateQty > item.maxQty ||
                                  item.allocateQty < 0
                                    ? 'border-rose-300 bg-rose-50 text-rose-700 focus:ring-rose-500'
                                    : 'focus:ring-mc-gold border-mc-beige-dark text-mc-black'
                                }`}
                                placeholder="0"
                              />
                              <span className="text-mc-gray-soft w-8 text-xs font-medium whitespace-nowrap">
                                / {item.maxQty}
                              </span>
                            </div>
                            {/* Inline Validation Messages */}
                            {item.allocateQty > item.maxQty && (
                              <span className="mt-1 text-[10px] font-bold text-rose-500">
                                Exceeds max ({item.maxQty})
                              </span>
                            )}
                            {item.allocateQty !== '' &&
                              item.allocateQty < 0 && (
                                <span className="mt-1 text-[10px] font-bold text-rose-500">
                                  Must be &gt;= 0
                                </span>
                              )}
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item.sku)}
                            className="text-mc-beige-dark mt-4 ml-2 flex-shrink-0 rounded-lg p-1.5 transition-colors hover:bg-rose-50 hover:text-rose-500"
                            title="Remove item"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Container Details */}
            <div className="border-mc-beige-dark bg-mc-white rounded-xl border p-4 shadow-none md:col-span-1">
              <div className="mb-4 flex items-center gap-2">
                <span className="bg-mc-beige-light text-mc-black flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold">
                  3
                </span>
                <h2 className="text-mc-black text-base font-bold">
                  Container Details
                </h2>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-mc-black block text-xs font-semibold">
                      Container Number / Name
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
                    <input
                      type="text"
                      value={containerName}
                      onChange={(e) => setContainerName(e.target.value)}
                      placeholder="e.g. TCNU 1234567"
                      className="focus:ring-mc-gold border-mc-beige-dark bg-mc-beige-light/30 text-mc-black w-full rounded-md border px-3 py-1.5 font-mono text-sm font-bold focus:ring-2 focus:outline-none"
                    />
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
                </div>

                <div className="mt-3">
                  <label className="text-mc-black mb-1 block text-xs font-semibold">
                    Estimated Arrival Date
                  </label>
                  <div className="focus-within:ring-mc-gold relative rounded-md focus-within:ring-2">
                    <input
                      type="text"
                      placeholder="yyyy-mm-dd"
                      value={estimatedArrivalDate}
                      readOnly
                      className={`border-mc-beige-dark bg-mc-beige-light/30 w-full rounded-md border px-3 py-1.5 text-sm font-medium outline-none ${
                        !estimatedArrivalDate
                          ? 'text-mc-gray-soft font-normal'
                          : 'text-mc-black'
                      }`}
                    />
                    <Calendar
                      className={`pointer-events-none absolute top-1/2 right-2.5 h-[15px] w-[15px] -translate-y-1/2 ${
                        !estimatedArrivalDate
                          ? 'text-mc-gray-soft'
                          : 'text-mc-black'
                      }`}
                    />
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={estimatedArrivalDate}
                      onChange={(e) => setEstimatedArrivalDate(e.target.value)}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="text-mc-black mb-1 block text-xs font-semibold">
                    Select Warehouse
                  </label>
                  <InfiniteScrollDropdown
                    value={selectedWarehouseId}
                    onChange={(val) => setSelectedWarehouseId(val)}
                    onSearch={(q) => setWarehouseSearch(q)}
                    items={warehouseDropdownItems}
                    placeholder="Select a warehouse..."
                    searchPlaceholder="Search warehouses..."
                    hasMore={false}
                    isLoading={false}
                  />
                </div>

                <div className="border-mc-beige-dark bg-mc-beige-light mt-3 rounded-lg border p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="text-mc-gold mt-0.5 h-4 w-4 flex-shrink-0" />
                    <div>
                      <h4 className="text-mc-black text-xs font-bold">
                        PO Status
                      </h4>
                      <p className="text-mc-black text-opacity-80 mt-0.5 text-[10px]">
                        Currently allocating items for{' '}
                        <span className="font-mono font-bold">
                          {selectedPO.sellercloud_po_id
                            ? `PO-${selectedPO.sellercloud_po_id.toString().replace(/^PO-/, '')}`
                            : selectedPO.id}
                        </span>
                        .
                      </p>
                    </div>
                  </div>
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
        onRefresh={() => {
          fetchContainerAPI(1, '', false);
          fetchTablePage();
          if (viewingContainerDetails?.id) {
            handleViewContainer({ id: viewingContainerDetails.id });
          }
        }}
      />

      {/* FullPageLoader removed in favor of localized TableLoader */}
    </div>
  );
}
