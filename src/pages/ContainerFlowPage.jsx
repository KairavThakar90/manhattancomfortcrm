import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Package, Plus, Save, Box, AlertCircle, ChevronDown } from 'lucide-react';
import { toast } from 'react-toastify';

export default function ContainerFlowPage() {
  const purchaseOrders = useSelector((state) => state.purchaseOrders?.list) || [];
  
  // State for the flow
  const [selectedPOId, setSelectedPOId] = useState('');
  const [containerName, setContainerName] = useState('');
  
  // Items tracking
  const [selectedItems, setSelectedItems] = useState([]); // Array of { sku, name, allocateQty, maxQty }
  
  // Derived data
  const selectedPO = useMemo(() => {
    return purchaseOrders.find((po) => po.id === selectedPOId) || null;
  }, [selectedPOId, purchaseOrders]);

  const availableItems = useMemo(() => {
    if (!selectedPO || !selectedPO.items) return [];
    // Filter out items already selected
    return selectedPO.items.filter(
      (item) => !selectedItems.some((sItem) => sItem.sku === item.sku)
    );
  }, [selectedPO, selectedItems]);

  const handlePOChange = (e) => {
    setSelectedPOId(e.target.value);
    setContainerName('');
    setSelectedItems([]);
  };

  const handleAddItem = (sku) => {
    const item = availableItems.find((i) => i.sku === sku);
    if (item) {
      const remainingQty = (item.qty_ordered || item.qty || 0) - (item.qty_received || item.receivedQty || 0);
      setSelectedItems([
        ...selectedItems,
        {
          sku: item.sku,
          name: item.product_name || item.name || 'Unknown Item',
          allocateQty: 0,
          maxQty: remainingQty > 0 ? remainingQty : (item.qty_ordered || item.qty || 0),
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
          // Allow them to type any number, we will validate inline instead of auto-capping
          return { ...item, allocateQty: numVal };
        }
        return item;
      })
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

    const invalidItems = selectedItems.filter(item => !item.allocateQty || item.allocateQty <= 0);
    if (invalidItems.length > 0) {
      toast.error('All items must have a quantity greater than 0.');
      return;
    }

    const overMaxItems = selectedItems.filter(item => item.allocateQty > item.maxQty);
    if (overMaxItems.length > 0) {
      toast.error('Quantity cannot exceed the maximum available amount.');
      return;
    }

    // Save simulation
    console.log('Saving Container Flow Data:', {
      poId: selectedPOId,
      containerName,
      items: selectedItems,
    });

    toast.success('Container created and items allocated successfully!');
    
    // Reset form after save
    setContainerName('');
    setSelectedItems([]);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto w-full">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
            <Package className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-slate-800">
              Container Management
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
          Save Container
        </button>
      </div>

      {/* Main Content Area */}
      <div className="p-4 max-w-5xl mx-auto w-full space-y-4">
        
        {/* Step 1: Select PO */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">1</span>
            <h2 className="text-base font-bold text-slate-800">Select Purchase Order</h2>
          </div>
          
          <div className="relative">
            <select
              value={selectedPOId}
              onChange={handlePOChange}
              className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
            >
              <option value="">-- Choose a Purchase Order --</option>
              {purchaseOrders.map((po) => (
                <option key={po.id} value={po.id}>
                  {po.sellercloud_po_id ? `PO-${po.sellercloud_po_id}` : po.id} - {po.vendorName || po.vendor_name || 'Unknown Vendor'}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {selectedPO && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Step 2: Container Details */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">2</span>
                <h2 className="text-base font-bold text-slate-800">Container Details</h2>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Container Number / Name
                  </label>
                  <input
                    type="text"
                    value={containerName}
                    onChange={(e) => setContainerName(e.target.value)}
                    placeholder="e.g. TCNU 1234567"
                    className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-slate-800"
                  />
                </div>
                
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 mt-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-blue-900">PO Status</h4>
                      <p className="text-[10px] text-blue-700 mt-0.5">
                        Currently allocating items for <span className="font-mono font-bold">{selectedPO.sellercloud_po_id ? `PO-${selectedPO.sellercloud_po_id}` : selectedPO.id}</span>.
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
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">3</span>
                  <h2 className="text-base font-bold text-slate-800">Allocate Items</h2>
                </div>
                
                {availableItems.length > 0 && (
                  <div className="relative w-56">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddItem(e.target.value);
                          e.target.value = ''; // reset after selection
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
                    <Plus className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                )}
              </div>

              {selectedItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 p-8 text-center">
                  <Box className="h-12 w-12 text-slate-300 mb-3" />
                  <h3 className="text-slate-700 font-bold mb-1">No items added</h3>
                  <p className="text-sm text-slate-500 max-w-[250px]">
                    Select items from the dropdown above to add them to this container.
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-2">
                  <div className="space-y-3">
                    {selectedItems.map((item) => (
                      <div key={item.sku} className="group relative flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm transition-all">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-mono text-sm font-bold text-slate-800 truncate">{item.sku}</h4>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{item.name}</p>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-end">
                            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Quantity</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="1"
                                max={item.maxQty}
                                value={item.allocateQty === '' ? '' : item.allocateQty}
                                onChange={(e) => handleQtyChange(item.sku, e.target.value)}
                                className={`w-20 px-2 py-1 text-right font-mono font-bold text-sm bg-slate-50 border rounded focus:outline-none focus:ring-1 ${
                                  (item.allocateQty > item.maxQty || item.allocateQty <= 0) 
                                    ? 'border-rose-300 focus:ring-rose-500 bg-rose-50 text-rose-700' 
                                    : 'border-slate-200 focus:ring-indigo-500 text-slate-800'
                                }`}
                                placeholder="0"
                              />
                              <span className="text-xs text-slate-400 font-medium whitespace-nowrap w-8">/ {item.maxQty}</span>
                            </div>
                            {/* Inline Validation Messages */}
                            {item.allocateQty > item.maxQty && (
                              <span className="text-[10px] text-rose-500 font-bold mt-1">Exceeds max ({item.maxQty})</span>
                            )}
                            {item.allocateQty !== '' && item.allocateQty <= 0 && (
                              <span className="text-[10px] text-rose-500 font-bold mt-1">Must be > 0</span>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item.sku)}
                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors ml-2 mt-4 flex-shrink-0"
                            title="Remove item"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
