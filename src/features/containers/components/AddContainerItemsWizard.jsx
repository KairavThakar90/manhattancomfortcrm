import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Package, X, CheckCircle2, Save } from 'lucide-react';
import InfiniteScrollDropdown from '../../../components/InfiniteScrollDropdown';
import { getContainerPOItems } from '../services/container.service';
import {
  getPurchaseOrders,
  syncPOQuantities,
} from '../../purchaseOrders/services/purchaseOrder.service';
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

        // Sync this PO's quantities first — items are only fetched once
        // sync-quantities responds with success, so the qty/remaining shown
        // reflects the latest Sellercloud data rather than a stale snapshot.
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

        if (!syncSucceeded) {
          setFetchedPOItems(selectedPO?.items || []);
          return;
        }

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

  // qty_remaining is the single source of truth for what's left to
  // allocate — no other field or derived calculation is used.
  const getRawRemaining = (item) => item.qty_remaining || 0;

  const computeMaxQty = (item) => getRawRemaining(item);

  const availableItems = useMemo(() => {
    const items =
      fetchedPOItems.length > 0 ? fetchedPOItems : selectedPO?.items || [];
    if (!items) return [];
    return items.filter(
      (item) =>
        !selectedItems.some((sItem) => sItem.sku === item.sku) &&
        getRawRemaining(item) > 0,
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

  // Once a fresh (post-sync) item list lands, reconcile any rows the user
  // already added — their maxQty was frozen at add-time and otherwise never
  // reflects newer remaining-qty data (e.g. another container claiming stock
  // in the meantime), which is exactly what showed the wrong "/ 1" limit.
  useEffect(() => {
    if (fetchedPOItems.length === 0) return;
    setSelectedItems((prev) =>
      prev.map((selected) => {
        const fresh = fetchedPOItems.find((i) => i.sku === selected.sku);
        if (!fresh) return selected;
        const maxQty = computeMaxQty(fresh);
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

  const handleAddItem = (sku) => {
    const item = availableItems.find((i) => i.sku === sku);
    if (!item) return;

    const maxQty = computeMaxQty(item);

    const originalQty =
      item.qty_ordered !== undefined
        ? item.qty_ordered
        : item.qty || item.maxQty || 1000;

    setSelectedItems((prev) => [
      ...prev,
      {
        ...item,
        allocateQty: '',
        maxQty: maxQty,
        originalQty: originalQty,
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
    <div className="animate-in fade-in fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="slide-in-from-bottom-4 relative flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-100 bg-slate-50 shadow-2xl duration-300">
        {/* Header */}
        <div className="border-mc-beige-dark bg-mc-white flex shrink-0 items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-mc-black text-lg font-bold">
              Manually Add Items
            </h2>
            <p className="text-mc-gray-soft mt-0.5 text-xs font-medium">
              Select a Purchase Order to allocate items directly
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-mc-gray-soft hover:bg-mc-beige-light hover:text-mc-black rounded-lg p-2 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="custom-scrollbar flex flex-1 flex-col gap-6 overflow-y-auto p-6">
          {/* Wizard Steps indicator */}
          <div className="relative mx-auto mb-2 flex w-full max-w-xs items-center justify-between">
            <div
              className="bg-mc-gold absolute top-1/2 left-0 z-0 h-1 -translate-y-1/2 rounded-full transition-all duration-500 ease-in-out"
              style={{
                width:
                  currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%',
              }}
            ></div>
            <div className="relative z-10 flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-500 ${currentStep > 1 ? 'border-mc-gold bg-mc-gold text-mc-black' : 'border-mc-gold bg-mc-white text-mc-gold shadow-md'}`}
              >
                {currentStep > 1 ? <CheckCircle2 className="h-4 w-4" /> : '1'}
              </div>
              <span
                className={`absolute -bottom-5 w-32 text-center text-[10px] font-bold ${currentStep >= 1 ? 'text-mc-black' : 'text-mc-gray-soft'}`}
              >
                Select PO
              </span>
            </div>
            <div className="relative z-10 flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-500 ${currentStep > 2 ? 'border-mc-gold bg-mc-gold text-mc-black' : currentStep === 2 ? 'border-mc-gold bg-mc-white text-mc-gold shadow-md' : 'border-mc-beige-dark bg-mc-white text-mc-gray-soft'}`}
              >
                {currentStep > 2 ? <CheckCircle2 className="h-4 w-4" /> : '2'}
              </div>
              <span
                className={`absolute -bottom-5 w-32 text-center text-[10px] font-bold ${currentStep >= 2 ? 'text-mc-black' : 'text-mc-gray-soft'}`}
              >
                Allocate Items
              </span>
            </div>
          </div>

          <div className="mt-4">
            {/* Step 1: Select PO */}
            <div className="border-mc-beige-dark bg-mc-white mb-4 rounded-xl border p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <span className="bg-mc-beige-light text-mc-black flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold">
                  1
                </span>
                <h2 className="text-mc-black text-base font-bold">
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
              <div className="border-mc-beige-dark bg-mc-white flex max-h-[500px] min-h-[400px] flex-col rounded-xl border p-4 shadow-sm">
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
                  <div className="border-mc-beige-dark bg-mc-white flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                    <Package className="text-mc-gray-soft mb-3 h-10 w-10" />
                    <h3 className="text-mc-black mb-1 text-sm font-bold">
                      No items selected
                    </h3>
                    <p className="text-mc-gray-soft max-w-sm text-xs">
                      Select a PO from the dropdown above to start adding items
                      to this container.
                    </p>
                  </div>
                ) : (
                  <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto pr-2">
                    {selectedItems.map((item) => (
                      <div
                        key={item.sku}
                        className="border-mc-beige-dark bg-mc-white hover:border-mc-gold flex flex-col justify-between gap-4 rounded-lg border p-3 transition-colors sm:flex-row sm:items-center"
                      >
                        <div className="flex items-start gap-3 overflow-hidden">
                          <div className="bg-mc-beige-light text-mc-black mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded">
                            <Package className="h-4 w-4" />
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
                                className={`bg-mc-white w-20 rounded border px-2 py-1 text-right font-mono text-sm font-bold focus:ring-1 focus:outline-none ${
                                  item.allocateQty > item.maxQty ||
                                  item.allocateQty < 0 ||
                                  item.allocateQty === ''
                                    ? 'border-rose-300 bg-rose-50 text-rose-700 focus:ring-rose-500'
                                    : 'border-mc-beige-dark text-mc-black focus:border-mc-gold focus:ring-mc-gold'
                                }`}
                                placeholder="0"
                              />
                              <span className="text-mc-gray-soft w-8 text-xs font-medium whitespace-nowrap">
                                / {item.maxQty}
                              </span>
                            </div>
                            {item.allocateQty > item.maxQty && (
                              <span className="mt-1 text-[10px] font-bold text-rose-500">
                                Exceeds max ({item.maxQty})
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item.sku)}
                            className="text-mc-gray-soft mt-4 ml-2 flex-shrink-0 rounded-lg p-1.5 transition-colors hover:bg-rose-50 hover:text-rose-500"
                            title="Remove item"
                          >
                            <X className="h-4 w-4" />
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
        <div className="border-mc-beige-dark bg-mc-white flex shrink-0 justify-end gap-3 border-t px-6 py-4">
          <button
            onClick={onClose}
            className="border-mc-beige-dark bg-mc-white text-mc-black hover:bg-mc-beige-light rounded-lg border px-5 py-2 text-sm font-bold transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedItems.length === 0}
            className="bg-mc-black text-mc-white flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-bold transition hover:bg-black disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            Add Selected Items
          </button>
        </div>
      </div>
    </div>
  );
}
