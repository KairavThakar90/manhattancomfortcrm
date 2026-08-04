import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Package, X, CheckCircle2, Save } from 'lucide-react';
import InfiniteScrollDropdown from './InfiniteScrollDropdown';
import { getContainerPOItems } from '../services/container.service';
import { getPurchaseOrders } from '../services/purchaseOrder.service';
import { toast } from 'react-toastify';

export default function AddContainerItemsWizard({ onClose, onConfirm }) {
  const vendorsList = useSelector((state) => state.vendors?.list || []);
  const [poList, setPoList] = useState([]);
  const [poLoading, setPoLoading] = useState(false);
  const [poSearch, setPoSearch] = useState('');
  const [selectedPOId, setSelectedPOId] = useState('');

  const [fetchedPOItems, setFetchedPOItems] = useState([]);
  const [loadingPOItems, setLoadingPOItems] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);

  const poSearchTimeout = React.useRef(null);

  const fetchPOs = React.useCallback(async (query = '') => {
    try {
      setPoLoading(true);
      const params = {};
      if (query.trim()) {
        params.search = query.trim();
      }
      const data = await getPurchaseOrders(params);
      if (data && data.results) {
        setPoList(data.results);
      } else if (Array.isArray(data)) {
        setPoList(data);
      }
    } catch (err) {
      console.error('Failed to fetch POs', err);
    } finally {
      setPoLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPOs();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchPOs]);

  const handlePoSearch = (q) => {
    setPoSearch(q);
    if (poSearchTimeout.current) clearTimeout(poSearchTimeout.current);
    poSearchTimeout.current = setTimeout(() => {
      fetchPOs(q);
    }, 400);
  };

  const poDropdownItems = useMemo(() => {
    const rawList = [...poList];

    const finalItems = [];
    const seenLabels = new Set();

    rawList.forEach((po) => {
      const vendorName =
        po.vendor?.name ||
        vendorsList.find((v) => v.id === po.vendor_id)?.name ||
        po.vendor_name ||
        po.vendorName ||
        'Unknown Vendor';

      const label = `${po.sellercloud_po_id || po.po_number || po.id} - ${vendorName}`;

      if (!seenLabels.has(label)) {
        seenLabels.add(label);
        finalItems.push({
          value: po.id,
          label,
        });
      }
    });

    return finalItems;
  }, [poList, vendorsList]);

  const selectedPO = useMemo(() => {
    return poList.find((p) => String(p.id) === String(selectedPOId));
  }, [selectedPOId, poList]);

  // Fetch Items when PO is selected
  useEffect(() => {
    const fetchItems = async () => {
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
    };
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

  const handleAddItem = (sku) => {
    const item = availableItems.find((i) => i.sku === sku);
    if (!item) return;

    const maxQty =
      item.remaining_qty !== undefined
        ? item.remaining_qty
        : item.unreceived_qty !== undefined
          ? item.unreceived_qty
          : item.qty_ordered !== undefined
            ? item.qty_ordered
            : item.qty || 1000;

    setSelectedItems((prev) => [
      ...prev,
      {
        ...item,
        allocateQty: '',
        maxQty: maxQty,
        name: item.product_name || item.name || 'Unknown Item',
      },
    ]);
  };

  const handleRemoveItem = (sku) => {
    setSelectedItems((prev) => prev.filter((item) => item.sku !== sku));
  };

  const handleQtyChange = (sku, val) => {
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.sku === sku
          ? { ...item, allocateQty: val === '' ? '' : Number(val) }
          : item,
      ),
    );
  };

  const currentStep = selectedPOId ? (selectedItems.length > 0 ? 3 : 2) : 1;

  const handleConfirm = () => {
    // Validate
    const hasErrors = selectedItems.some(
      (item) =>
        item.allocateQty === '' ||
        item.allocateQty < 0 ||
        item.allocateQty > item.maxQty,
    );
    if (hasErrors) {
      toast.error('Please fix quantity validation errors before continuing.');
      return;
    }

    if (selectedItems.length === 0) {
      toast.error('Please allocate at least one item.');
      return;
    }

    const newRows = selectedItems.map((item) => ({
      _id: Date.now() + Math.random(),
      sku: item.sku,
      sellercloud_item_id: item.sellercloud_item_id || item.id || '',
      file_po_id: selectedPO.sellercloud_po_id || selectedPO.id || '',
      qty_in_container: item.allocateQty,
      _errors: [],
    }));

    onConfirm(newRows);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-50 w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 relative slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Manually Add Items
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Select a Purchase Order to allocate items directly
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6">
          {/* Wizard Steps indicator */}
          <div className="relative flex justify-between items-center w-full max-w-xs mx-auto mb-2">
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-500 rounded-full z-0 transition-all duration-500 ease-in-out"
              style={{
                width:
                  currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%',
              }}
            ></div>
            <div className="relative z-10 flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-500 border-2 ${currentStep > 1 ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white border-indigo-500 text-indigo-600 shadow-md'}`}
              >
                {currentStep > 1 ? <CheckCircle2 className="h-4 w-4" /> : '1'}
              </div>
              <span
                className={`absolute -bottom-5 w-32 text-center text-[10px] font-bold ${currentStep >= 1 ? 'text-indigo-900' : 'text-slate-400'}`}
              >
                Select PO
              </span>
            </div>
            <div className="relative z-10 flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-500 border-2 ${currentStep > 2 ? 'bg-indigo-500 border-indigo-500 text-white' : currentStep === 2 ? 'bg-white border-indigo-500 text-indigo-600 shadow-md' : 'bg-white border-slate-300 text-slate-400'}`}
              >
                {currentStep > 2 ? <CheckCircle2 className="h-4 w-4" /> : '2'}
              </div>
              <span
                className={`absolute -bottom-5 w-32 text-center text-[10px] font-bold ${currentStep >= 2 ? 'text-indigo-900' : 'text-slate-400'}`}
              >
                Allocate Items
              </span>
            </div>
          </div>

          <div className="mt-4">
            {/* Step 1: Select PO */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                  1
                </span>
                <h2 className="text-base font-bold text-slate-800">
                  Select Purchase Order
                </h2>
              </div>
              <div className="relative max-w-lg">
                <InfiniteScrollDropdown
                  value={selectedPOId}
                  onChange={(val) => {
                    setSelectedPOId(val);
                    setSelectedItems([]);
                  }}
                  onSearch={handlePoSearch}
                  hasMore={false}
                  isLoading={poLoading}
                  items={poDropdownItems}
                  placeholder="-- Choose a Purchase Order --"
                  searchPlaceholder="Search POs..."
                />
              </div>
            </div>

            {/* Step 2: Item Allocation */}
            {selectedPO && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col min-h-[400px] max-h-[500px]">
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
                          if (val) handleAddItem(val);
                        }}
                        onSearch={(query) => setItemSearchQuery(query)}
                        hasMore={false}
                        isLoading={loadingPOItems}
                        items={itemDropdownItems}
                        placeholder={
                          loadingPOItems ? 'Loading items...' : '+ Add items'
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
                      Select a PO from the dropdown above to start adding items
                      to this container.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                    {selectedItems.map((item) => (
                      <div
                        key={item.sku}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-200 transition-colors"
                      >
                        <div className="flex items-start gap-3 overflow-hidden">
                          <div className="mt-0.5 w-8 h-8 rounded bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-400">
                            <Package className="h-4 w-4" />
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
                                  item.allocateQty < 0 ||
                                  item.allocateQty === ''
                                    ? 'border-rose-300 focus:ring-rose-500 bg-rose-50 text-rose-700'
                                    : 'border-slate-200 focus:ring-indigo-500 text-slate-800'
                                }`}
                                placeholder="0"
                              />
                              <span className="text-xs text-slate-400 font-medium whitespace-nowrap w-8">
                                / {item.maxQty}
                              </span>
                            </div>
                            {item.allocateQty > item.maxQty && (
                              <span className="text-[10px] text-rose-500 font-bold mt-1">
                                Exceeds max ({item.maxQty})
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item.sku)}
                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors ml-2 mt-4 flex-shrink-0"
                            title="Remove item"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-white shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-bold bg-white hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedItems.length === 0}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition disabled:opacity-50 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Add Selected Items
          </button>
        </div>
      </div>
    </div>
  );
}
