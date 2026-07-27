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
} from 'lucide-react';
import { toast } from 'react-toastify';

import InfiniteScrollDropdown from '../components/InfiniteScrollDropdown';
import { getPurchaseOrders } from '../services/purchaseOrder.service';
import { getContainers } from '../services/container.service';
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

  // State for the flow
  const [selectedPOId, setSelectedPOId] = useState('');
  const [containerName, setContainerName] = useState('');
  const [originalContainerName, setOriginalContainerName] = useState('');
  const [isManualContainerEntry, setIsManualContainerEntry] = useState(false);
  const [estimatedArrivalDate, setEstimatedArrivalDate] = useState('');

  const [localContainers, setLocalContainers] = useState([]);
  const [deletedContainers, setDeletedContainers] = useState(new Set());
  const [isEditMode, setIsEditMode] = useState(false);

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
  const STATIC_VENDOR_MAP = useMemo(
    () => ({
      '3f5551f4-186e-467d-9340-5b74d8e7b766': 'ABC Manufacturing',
      '4ce542cd-5b23-4653-a884-53391edd9f0f': 'XYZ Logistics & Textiles',
      'e38f467c-f483-46a4-8172-bce5bb862247': 'Global Tech Sourcing',
      'c17e8a34-eaf3-4a0b-89ac-7b4e640b61e3': 'Shenzhen Electronics Corp',
    }),
    [],
  );

  const poDropdownItems = useMemo(() => {
    return poList.map((po) => {
      const vendorName =
        po.vendor?.name ||
        STATIC_VENDOR_MAP[po.vendor_id] ||
        vendorsList.find((v) => v.id === po.vendor_id)?.name ||
        po.vendorName ||
        po.vendor_name ||
        'Unknown Vendor';

      return {
        value: po.id,
        label: `${po.sellercloud_po_id ? `PO-${po.sellercloud_po_id}` : po.order_number || po.id} - ${vendorName}`,
      };
    });
  }, [poList, vendorsList, STATIC_VENDOR_MAP]);

  // ====== Container Infinite Scroll Logic ======
  const reduxContainers = useSelector((state) => state.containers?.list || []);
  const reduxContainersRef = useRef(reduxContainers);
  useEffect(() => {
    reduxContainersRef.current = reduxContainers;
  }, [reduxContainers]);

  const [containerPage, setContainerPage] = useState(1);
  const [containerSearch, setContainerSearch] = useState('');
  const [containerLoading, setContainerLoading] = useState(false);
  const [containerHasMore, setContainerHasMore] = useState(true);

  const fetchContainerAPI = useCallback(
    async (page, search, append = true) => {
      try {
        setContainerLoading(true);
        const data = await getContainers({ page, page_size: 25, search });
        const results = Array.isArray(data) ? data : data.results || [];
        if (results.length < 25) setContainerHasMore(false);
        else setContainerHasMore(true);

        const prevRedux = append ? reduxContainersRef.current : [];
        dispatch(setContainersList([...prevRedux, ...results]));
      } catch (err) {
        console.error('Failed to fetch containers', err);
      } finally {
        setContainerLoading(false);
      }
    },
    [dispatch],
  );

  useEffect(() => {
    setTimeout(() => {
      fetchContainerAPI(1, '', false);
    }, 0);
  }, [fetchContainerAPI]);

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
    if (!Array.isArray(reduxContainers)) return [];
    const derived = reduxContainers.map((c) => {
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
    derived.unshift({
      value: '__CREATE_NEW__',
      label: '+ Add New Container Manually',
    });
    // Allow custom creation if not matching
    if (
      containerSearch &&
      !derived.some(
        (c) => c.label.toLowerCase() === containerSearch.toLowerCase(),
      )
    ) {
      derived.unshift({
        value: containerSearch,
        label: `+ Create "${containerSearch}"`,
      });
    }
    return derived;
  }, [reduxContainers, containerSearch]);

  // Derived data
  const selectedPO = useMemo(() => {
    return (
      poList.find((po) => po.id === selectedPOId) ||
      purchaseOrders.find((po) => po.id === selectedPOId) ||
      null
    );
  }, [selectedPOId, poList, purchaseOrders]);

  const availableItems = useMemo(() => {
    if (!selectedPO || !selectedPO.items) return [];
    return selectedPO.items.filter(
      (item) => !selectedItems.some((sItem) => sItem.sku === item.sku),
    );
  }, [selectedPO, selectedItems]);

  const allContainers = useMemo(() => {
    const map = new Map();
    purchaseOrders.forEach((po) => {
      // 1. handle top-po container string
      if (
        po.container &&
        po.container !== 'N/A' &&
        po.container !== 'Pending' &&
        po.container !== 'Awaiting Vessel Booking'
      ) {
        const names = po.container
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        names.forEach((name) => {
          if (!map.has(name)) {
            map.set(name, {
              name,
              poIds: new Set(),
              totalItems: 0,
              arrivalDate: po.eta || 'N/A',
            });
          }
          map.get(name).poIds.add(po.id);
        });
      }
      if (po.containerNames) {
        po.containerNames.forEach((name) => {
          if (!map.has(name)) {
            map.set(name, {
              name,
              poIds: new Set(),
              totalItems: 0,
              arrivalDate: po.eta || 'N/A',
            });
          }
          map.get(name).poIds.add(po.id);
        });
      }

      // 2. PO items container arrays
      if (po.items) {
        po.items.forEach((item) => {
          if (item.containers && item.containers.length > 0) {
            item.containers.forEach((c) => {
              if (c.container_name) {
                const name = c.container_name;
                if (!map.has(name)) {
                  map.set(name, {
                    name,
                    poIds: new Set(),
                    totalItems: 0,
                    arrivalDate: c.estimated_arrival_date || po.eta || 'N/A',
                  });
                }
                map.get(name).poIds.add(po.id);
                map.get(name).totalItems += c.qty_in_container || 0;
              }
            });
          } else if (
            po.container &&
            po.container !== 'N/A' &&
            po.container !== 'Pending'
          ) {
            const splitNames = po.container
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
            splitNames.forEach((name) => {
              if (map.has(name)) {
                map.get(name).totalItems += item.qty_ordered || item.qty || 0;
              }
            });
          }
        });
      }
    });

    const derived = Array.from(map.values()).map((c) => ({
      name: c.name,
      poIds: Array.from(c.poIds),
      totalItems: c.totalItems,
      arrivalDate: c.arrivalDate,
    }));

    // Local containers take precedence over derived containers
    const localNames = new Set(localContainers.map((c) => c.name));
    const filteredDerived = derived.filter((c) => !localNames.has(c.name));

    return [...localContainers, ...filteredDerived].filter(
      (c) => !deletedContainers.has(c.name),
    );
  }, [purchaseOrders, localContainers, deletedContainers]);

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
        (item.qty_ordered || item.qty || 0) -
        (item.qty_received || item.receivedQty || 0);
      setSelectedItems([
        ...selectedItems,
        {
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

  const handleSave = () => {
    if (!selectedPOId) {
      toast.error('Please select a Purchase Order first.');
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

    const invalidItems = selectedItems.filter(
      (item) => !item.allocateQty || item.allocateQty <= 0,
    );
    if (invalidItems.length > 0) {
      toast.error('All items must have a quantity greater than 0.');
      return;
    }

    const overMaxItems = selectedItems.filter(
      (item) => item.allocateQty > item.maxQty,
    );
    if (overMaxItems.length > 0) {
      toast.error('Quantity cannot exceed the maximum available amount.');
      return;
    }

    // Save to local container table view
    const newContainer = {
      name: containerName.trim(),
      poIds: [selectedPOId],
      totalItems: selectedItems.reduce(
        (acc, curr) => acc + (curr.allocateQty || 0),
        0,
      ),
      arrivalDate:
        estimatedArrivalDate ||
        selectedPO?.expected_delivery_date ||
        selectedPO?.eta ||
        'Pending',
      items: selectedItems,
    };

    if (isEditMode) {
      setLocalContainers((prev) => {
        const exists = prev.some((c) => c.name === originalContainerName);
        if (exists) {
          return prev.map((c) =>
            c.name === originalContainerName ? newContainer : c,
          );
        } else {
          return [newContainer, ...prev];
        }
      });
      toast.success('Container updated successfully!');
    } else {
      setLocalContainers((prev) => [newContainer, ...prev]);
      toast.success('Container created and items allocated successfully!');
    }

    setDeletedContainers((prev) => {
      const next = new Set(prev);
      next.delete(containerName.trim());
      if (
        isEditMode &&
        originalContainerName &&
        originalContainerName !== containerName.trim()
      ) {
        next.add(originalContainerName);
      }
      return next;
    });

    setContainerName('');
    setOriginalContainerName('');
    setSelectedItems([]);
    setSelectedPOId('');
    setShowList(true); // Switch back to Assign Container Table
  };

  const handleCreateContainer = () => {
    setIsEditMode(false);
    setSelectedPOId('');
    setContainerName('');
    setOriginalContainerName('');
    setEstimatedArrivalDate('');
    setIsManualContainerEntry(true); // Default manual on create
    setSelectedItems([]);
    setShowList(false);
  };

  const handleDeleteContainer = (container) => {
    if (
      window.confirm(
        `Are you sure you want to delete container ${container.name}?`,
      )
    ) {
      setLocalContainers((prev) =>
        prev.filter((c) => c.name !== container.name),
      );
      setDeletedContainers((prev) => new Set(prev).add(container.name));
      toast.success('Container deleted successfully');
    }
  };

  const handleEditContainer = (container) => {
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

    const poId = container.poIds[0] || '';
    setSelectedPOId(poId);

    const localMatch = localContainers.find((lc) => lc.name === container.name);
    if (localMatch && localMatch.items) {
      setSelectedItems(localMatch.items);
    } else {
      setSelectedItems([]);
    }

    setIsEditMode(true);
    setShowList(false);
  };

  const currentStep = !selectedPOId ? 1 : !containerName.trim() ? 2 : 3;

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
                    <th className="px-6 py-4 bg-slate-50">
                      Container ID / Name
                    </th>
                    <th className="px-6 py-4 bg-slate-50">Assigned POs</th>
                    <th className="px-6 py-4 bg-slate-50">
                      Total Items Allocated
                    </th>
                    <th className="px-6 py-4 bg-slate-50">ETA (Delivery)</th>
                    <th className="px-6 py-4 bg-slate-50 text-center">
                      Status
                    </th>
                    <th className="px-6 py-4 bg-slate-50 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allContainers.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
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
                        <td className="px-6 py-4 font-mono font-bold text-slate-800">
                          {c.name}
                        </td>
                        <td className="px-6 py-4 font-medium text-indigo-600 text-xs break-words max-w-[300px]">
                          {c.poIds
                            .map((po) =>
                              po.startsWith('PO-') ? po : `PO-${po}`,
                            )
                            .join(', ')}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-700">
                          {c.totalItems > 0
                            ? c.totalItems.toLocaleString()
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-medium text-xs">
                          {c.arrivalDate}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Assigned
                          </span>
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
          </div>
        </div>
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
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg font-semibold text-xs transition-colors shadow-sm flex items-center gap-2"
        >
          <Save className="h-3.5 w-3.5" />
          {isEditMode ? 'Update Container' : 'Save Container'}
        </button>
      </div>

      {/* Visual Stepper */}
      <div className="w-full max-w-4xl mx-auto px-4 mt-6 mb-2">
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
              Container Details
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
              Allocate Items
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 max-w-5xl mx-auto w-full space-y-4 pb-10">
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
              placeholder="-- Choose a Purchase Order --"
              searchPlaceholder="Search POs..."
            />
          </div>
        </div>

        {selectedPO && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Step 2: Container Details */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                  2
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
                            ? `PO-${selectedPO.sellercloud_po_id}`
                            : selectedPO.id}
                        </span>
                        .
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Item Allocation */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:col-span-2 flex flex-col h-full min-h-[300px]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                    3
                  </span>
                  <h2 className="text-base font-bold text-slate-800">
                    Allocate Items
                  </h2>
                </div>

                {availableItems.length > 0 && (
                  <div className="relative w-56">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddItem(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="">+ Add item from PO...</option>
                      {availableItems.map((item) => (
                        <option key={item.sku} value={item.sku}>
                          {item.sku} - {item.product_name || item.name}
                        </option>
                      ))}
                    </select>
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
                                min="1"
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
                                  item.allocateQty <= 0
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
                              item.allocateQty <= 0 && (
                                <span className="text-[10px] text-rose-500 font-bold mt-1">
                                  Must be &gt; 0
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
          </div>
        )}
      </div>
    </div>
  );
}
