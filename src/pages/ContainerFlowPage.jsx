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
  Plus,
  Save,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  Copy,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';

import InfiniteScrollDropdown from '../components/InfiniteScrollDropdown';
import Pagination from '../components/common/Pagination';
import { getPurchaseOrders } from '../services/purchaseOrder.service';
import {
  getContainers,
  getContainerPOItems,
  createContainer,
  updateContainer,
  deleteContainer,
  getContainerDetails,
} from '../services/container.service';
import { setContainersList } from '../store/containerSlice';

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
  const [listPageSize, setListPageSize] = useState(10);
  const [totalListCount, setTotalListCount] = useState(0);

  // State for the flow
  const [selectedPOId, setSelectedPOId] = useState('');
  const [containerName, setContainerName] = useState('');
  const [originalContainerName, setOriginalContainerName] = useState('');
  const [isManualContainerEntry, setIsManualContainerEntry] = useState(false);
  const [estimatedArrivalDate, setEstimatedArrivalDate] = useState('');

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingContainerId, setEditingContainerId] = useState(null);

  // Items tracking
  const [selectedItems, setSelectedItems] = useState([]);

  // ====== PO Infinite Scroll Logic ======
  const [poList, setPoList] = useState([]);
  const [poPage, setPoPage] = useState(1);
  const [poSearch, setPoSearch] = useState('');
  const [poLoading, setPoLoading] = useState(false);
  const [poHasMore, setPoHasMore] = useState(true);

  const fetchPOs = useCallback(async (page, search, append = true) => {
    try {
      setPoLoading(true);
      const data = await getPurchaseOrders({ page, page_size: 25, search });
      const results = Array.isArray(data) ? data : data.results || [];
      if (results.length < 25) setPoHasMore(false);
      else setPoHasMore(true);

      setPoList((prev) => (append ? [...prev, ...results] : results));
    } catch (err) {
      console.error('Failed to fetch POs for dropdown', err);
    } finally {
      setPoLoading(false);
    }
  }, []);

  useEffect(() => {
    setTimeout(() => {
      fetchPOs(1, '', false);
    }, 0);
  }, [fetchPOs]);

  const loadMorePOs = () => {
    if (!poLoading && poHasMore) {
      const nextPage = poPage + 1;
      setPoPage(nextPage);
      fetchPOs(nextPage, poSearch, true);
    }
  };

  const handlePoSearch = (query) => {
    setPoSearch(query);
    setPoPage(1);
    fetchPOs(1, query, false);
  };

  const vendorsList = useSelector((state) => state.vendors?.list || []);
  const poDropdownItems = useMemo(() => {
    // Show Redux data first, merge with API poList
    const map = new Map();
    if (Array.isArray(purchaseOrders)) {
      purchaseOrders.forEach((po) => map.set(po.id, po));
    }
    if (Array.isArray(poList)) {
      poList.forEach((po) => map.set(po.id, po));
    }

    const displayList = poSearch ? poList : Array.from(map.values());

    // Ensure selected PO is always in the list
    if (selectedPOId && !displayList.some((p) => p.id === selectedPOId)) {
      const reduxPO = purchaseOrders.find((p) => p.id === selectedPOId);
      if (reduxPO) displayList.unshift(reduxPO);
    }

    return displayList.map((po) => {
      const vendorName =
        po.vendor?.name ||
        vendorsList.find((v) => v.id === po.vendor_id)?.name ||
        po.vendorName ||
        po.vendor_name ||
        'Unknown Vendor';

      return {
        value: po.id,
        label: `${po.sellercloud_po_id ? `PO-${po.sellercloud_po_id.toString().replace(/^PO-/, '')}` : po.order_number || po.id} - ${vendorName}`,
      };
    });
  }, [poList, purchaseOrders, poSearch, vendorsList, selectedPOId]);

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

  const fetchTablePage = useCallback(
    async (page, pageSize) => {
      try {
        const data = await getContainers({ page, page_size: pageSize });
        const results = Array.isArray(data)
          ? data
          : data.results || data.data || data.items || [];
        if (data && data.total !== undefined) {
          setTotalListCount(data.total);
        } else if (data && data.count !== undefined) {
          setTotalListCount(data.count);
        } else if (page === 1) {
          setTotalListCount(results.length);
        }
        dispatch(setContainersList(results));
      } catch (err) {
        console.error('Failed to fetch table containers', err);
      }
    },
    [dispatch],
  );

  useEffect(() => {
    setTimeout(() => {
      fetchContainerAPI(1, '', false);
    }, 0);
  }, [fetchContainerAPI]);

  useEffect(() => {
    if (showList) {
      setTimeout(() => {
        fetchTablePage(listPage, listPageSize);
      }, 0);
    }
  }, [listPage, listPageSize, showList, fetchTablePage]);

  const loadMoreContainers = () => {
    if (!containerLoading && containerHasMore) {
      const nextPage = containerPage + 1;
      setContainerPage(nextPage);
      fetchContainerAPI(nextPage, containerSearch, true);
    }
  };

  const handleContainerSearch = (query) => {
    setContainerSearch(query);
    setContainerPage(1);
    fetchContainerAPI(1, query, false);
  };

  const containerDropdownItems = useMemo(() => {
    // Show redux data first, then after set field show matching list
    const map = new Map();
    if (Array.isArray(reduxContainers)) {
      reduxContainers.forEach((c) =>
        map.set(c.id || c.container_name || c.name || c.container_number, c),
      );
    }
    if (Array.isArray(containerList)) {
      containerList.forEach((c) =>
        map.set(c.id || c.container_name || c.name || c.container_number, c),
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
        total_items: c.total_items || 0,
        total_qty_in_container: c.total_qty_received || 0,
        total_qty_received: c.total_qty_in_container || 0,
        is_received: !!c.is_received,
        received_date: formattedRecvDate,
      };
    });
  }, [reduxContainers]);

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
        item.remaining_qty !== undefined
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
    }

    setContainerName('');
    setOriginalContainerName('');
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
            maxQty: item.qty_ordered || item.maxQty || 9999,
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

  const currentStep = !selectedPOId ? 1 : selectedItems.length === 0 ? 2 : 3;

  if (showList) {
    return (
      <div className="flex flex-col h-full bg-slate-50 w-full overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-slate-800">
                Container Management
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Manage all shipping containers and PO allocations
              </p>
            </div>
          </div>
          <button
            onClick={handleCreateContainer}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg font-semibold text-xs transition-colors shadow-sm flex items-center gap-2"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Container
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 w-full min-h-0 flex flex-col">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px] sticky top-0 z-10">
                    <th className="px-6 py-4 bg-slate-50">Container ID</th>
                    <th className="px-6 py-4 bg-slate-50">Container Name</th>
                    <th className="px-4 py-4 bg-slate-50">Total Items</th>
                    <th className="px-4 py-4 bg-slate-50">Total Qty</th>
                    <th className="px-4 py-4 bg-slate-50">Total Received</th>
                    <th className="px-4 py-4 bg-slate-50">ETA (Delivery)</th>
                    <th className="px-4 py-4 bg-slate-50 text-center">
                      Is Received?
                    </th>
                    <th className="px-4 py-4 bg-slate-50">Received Date</th>
                    <th className="px-6 py-4 bg-slate-50 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allContainers.length === 0 ? (
                    <tr>
                      <td
                        colSpan="9"
                        className="px-6 py-12 text-center text-slate-400 italic text-sm"
                      >
                        No containers assigned yet. Click &quot;Add
                        Container&quot; to start.
                      </td>
                    </tr>
                  ) : (
                    allContainers.map((c, i) => (
                      <tr
                        key={i}
                        className="hover:bg-slate-50/75 transition-colors"
                      >
                        <td className="px-6 py-4 font-mono font-medium text-slate-700 text-xs">
                          <div className="flex items-center gap-2 group">
                            <span
                              data-tooltip-id="container-id-tooltip"
                              data-tooltip-content={c.id}
                              className="cursor-pointer"
                            >
                              {c.id && c.id.toString().length > 8
                                ? `${c.id.toString().substring(0, 8)}...`
                                : c.id}
                            </span>
                            {c.id && (
                              <button
                                data-tooltip-id="container-id-tooltip"
                                data-tooltip-content="Copy full ID"
                                onClick={() => {
                                  navigator.clipboard.writeText(c.id);
                                  toast.success('Container ID copied!');
                                }}
                                className="text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-indigo-50 rounded"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          {c.name}
                        </td>
                        <td className="px-4 py-4 font-bold text-slate-700">
                          {c.total_items}
                        </td>
                        <td className="px-4 py-4 font-bold text-slate-700">
                          {c.total_qty_in_container}
                        </td>
                        <td className="px-4 py-4 font-bold text-indigo-600">
                          {c.total_qty_received}
                        </td>
                        <td className="px-4 py-4 text-slate-600 font-medium text-xs">
                          {c.arrivalDate}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {c.is_received ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Yes
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider border border-amber-200">
                              No
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-slate-600 font-medium text-xs">
                          {c.received_date}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditContainer(c)}
                              className="text-indigo-600 hover:text-indigo-800 p-1.5 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                              title="Edit Container"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteContainer(c)}
                              className="text-rose-600 hover:text-rose-800 p-1.5 bg-rose-50 hover:bg-rose-100 rounded transition-colors"
                              title="Delete Container"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {(totalListCount > 0 || allContainers.length > 0) && (
              <Pagination
                currentPage={listPage}
                totalCount={totalListCount || allContainers.length}
                pageSize={listPageSize}
                onPageChange={setListPage}
                onPageSizeChange={(size) => {
                  setListPageSize(size);
                  setListPage(1);
                }}
              />
            )}
          </div>
        </div>
        <Tooltip
          id="container-id-tooltip"
          place="top"
          style={{
            backgroundColor: '#6366f1',
            color: '#ffffff',
            fontWeight: '600',
            borderRadius: '6px',
            padding: '8px 12px',
          }}
          className="z-50 text-xs shadow-md"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto w-full animate-in fade-in">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowList(true)}
            className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 mr-1 transition-colors"
            title="Back to Container List"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-8 w-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
            <Package className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-slate-800">
              {isEditMode ? 'Edit Container Flow' : 'Add Container Flow'}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Create and manage container allocations for Purchase Orders
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={selectedItems.length === 0 || !estimatedArrivalDate}
          className={`px-4 py-1.5 rounded-lg font-semibold text-xs transition-colors shadow-sm flex items-center gap-2 text-white ${
            selectedItems.length === 0 || !estimatedArrivalDate
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          <Save className="h-3.5 w-3.5" />
          {isEditMode ? 'Update Container' : 'Create Container'}
        </button>
      </div>

      {/* Visual Stepper */}
      <div className="w-full max-w-6xl mx-auto px-4 mt-6 mb-2">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 rounded-full z-0"></div>
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-500 rounded-full z-0 transition-all duration-500 ease-in-out"
            style={{
              width:
                currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%',
            }}
          ></div>

          {/* Step 1 */}
          <div className="relative z-10 flex flex-col items-center group">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-500 border-2 ${currentStep > 1 ? 'bg-indigo-500 border-indigo-500 text-white' : currentStep === 1 ? 'bg-white border-indigo-500 text-indigo-600 shadow-md shadow-indigo-500/20' : 'bg-white border-slate-300 text-slate-400'}`}
            >
              {currentStep > 1 ? <CheckCircle2 className="h-4 w-4" /> : '1'}
            </div>
            <span
              className={`absolute -bottom-5 w-32 text-center text-[10px] font-bold transition-colors ${currentStep >= 1 ? 'text-indigo-900' : 'text-slate-400'}`}
            >
              Select PO
            </span>
          </div>

          {/* Step 2 */}
          <div className="relative z-10 flex flex-col items-center group">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-500 border-2 ${currentStep > 2 ? 'bg-indigo-500 border-indigo-500 text-white' : currentStep === 2 ? 'bg-white border-indigo-500 text-indigo-600 shadow-md shadow-indigo-500/20' : 'bg-white border-slate-300 text-slate-400'}`}
            >
              {currentStep > 2 ? <CheckCircle2 className="h-4 w-4" /> : '2'}
            </div>
            <span
              className={`absolute -bottom-5 w-32 text-center text-[10px] font-bold transition-colors ${currentStep >= 2 ? 'text-indigo-900' : 'text-slate-400'}`}
            >
              Allocate Items
            </span>
          </div>

          {/* Step 3 */}
          <div className="relative z-10 flex flex-col items-center group">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-500 border-2 ${currentStep === 3 ? 'bg-white border-indigo-500 text-indigo-600 shadow-md shadow-indigo-500/20' : 'bg-white border-slate-300 text-slate-400'}`}
            >
              3
            </div>
            <span
              className={`absolute -bottom-5 w-32 text-center text-[10px] font-bold transition-colors ${currentStep === 3 ? 'text-indigo-900' : 'text-slate-400'}`}
            >
              Container Details
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 max-w-7xl mx-auto w-full space-y-4 pb-10">
        {/* Step 1: Select PO */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
              1
            </span>
            <h2 className="text-base font-bold text-slate-800">
              Select Purchase Order
            </h2>
          </div>

          <div className="relative">
            <InfiniteScrollDropdown
              value={selectedPOId}
              onChange={handlePOChange}
              onSearch={handlePoSearch}
              onLoadMore={loadMorePOs}
              hasMore={poHasMore}
              isLoading={poLoading}
              items={poDropdownItems}
              disabled={isEditMode}
              placeholder="-- Choose a Purchase Order --"
              searchPlaceholder="Search POs..."
            />
          </div>
        </div>

        {selectedPO && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Step 2: Item Allocation */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:col-span-2 flex flex-col h-[525px]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                    2
                  </span>
                  <h2 className="text-base font-bold text-slate-800">
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
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                  <Package className="h-10 w-10 text-slate-300 mb-3" />
                  <h3 className="text-sm font-bold text-slate-700 mb-1">
                    No items selected
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Select a PO from the dropdown above to start adding items to
                    this container.
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <div className="space-y-3">
                    {selectedItems.map((item) => (
                      <div
                        key={item.sku}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-200 transition-colors"
                      >
                        <div className="flex items-start gap-3 overflow-hidden">
                          <div className="mt-0.5">
                            <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-400">
                              <Package className="h-4 w-4" />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className="text-sm font-bold text-slate-800 truncate"
                              title={item.sku}
                            >
                              {item.sku}
                            </p>
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {item.name}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-end">
                            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">
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
                                className={`w-20 px-2 py-1 text-right font-mono font-bold text-sm bg-slate-50 border rounded focus:outline-none focus:ring-1 ${
                                  item.allocateQty > item.maxQty ||
                                  item.allocateQty < 0
                                    ? 'border-rose-300 focus:ring-rose-500 bg-rose-50 text-rose-700'
                                    : 'border-slate-200 focus:ring-indigo-500 text-slate-800'
                                }`}
                                placeholder="0"
                              />
                              <span className="text-xs text-slate-400 font-medium whitespace-nowrap w-8">
                                / {item.maxQty}
                              </span>
                            </div>
                            {/* Inline Validation Messages */}
                            {item.allocateQty > item.maxQty && (
                              <span className="text-[10px] text-rose-500 font-bold mt-1">
                                Exceeds max ({item.maxQty})
                              </span>
                            )}
                            {item.allocateQty !== '' &&
                              item.allocateQty < 0 && (
                                <span className="text-[10px] text-rose-500 font-bold mt-1">
                                  Must be &gt;= 0
                                </span>
                              )}
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item.sku)}
                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors ml-2 mt-4 flex-shrink-0"
                            title="Remove item"
                          >
                            <svg
                              className="w-4 h-4"
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
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                  3
                </span>
                <h2 className="text-base font-bold text-slate-800">
                  Container Details
                </h2>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Container Number / Name
                    </label>
                    {isEditMode && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsManualContainerEntry(!isManualContainerEntry);
                          setContainerName('');
                        }}
                        className="text-[10px] text-indigo-600 font-bold hover:underline"
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
                      className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-slate-800"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estimated Arrival Date
                  </label>
                  <div className="relative focus-within:ring-2 focus-within:ring-indigo-500 rounded-md">
                    <input
                      type="text"
                      placeholder="yyyy-mm-dd"
                      value={estimatedArrivalDate}
                      readOnly
                      className={`w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-md outline-none font-medium ${
                        !estimatedArrivalDate
                          ? 'text-slate-400 font-normal'
                          : 'text-slate-800'
                      }`}
                    />
                    <Calendar
                      className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-[15px] h-[15px] pointer-events-none ${
                        !estimatedArrivalDate
                          ? 'text-slate-500'
                          : 'text-slate-800'
                      }`}
                    />
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={estimatedArrivalDate}
                      onChange={(e) => setEstimatedArrivalDate(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 mt-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-blue-900">
                        PO Status
                      </h4>
                      <p className="text-[10px] text-blue-700 mt-0.5">
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
    </div>
  );
}
