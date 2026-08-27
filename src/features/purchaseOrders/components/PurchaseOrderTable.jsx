import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  X,
  Filter,
  CalendarDays,
  Plus,
  MessageSquare,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import DataTable from '../../../components/common/DataTable';
import Pagination from '../../../components/common/Pagination';
import VendorInfiniteDropdown from '../../../components/common/VendorInfiniteDropdown';
import DateFilterInput from '../../../components/common/DateFilterInput';
import {
  getPurchaseOrderById,
  syncSinglePurchaseOrder,
} from '../services/purchaseOrder.service';
import { toast } from 'react-toastify';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'NOT_STARTED', label: 'NOT STARTED' },
  { value: 'IN_PRODUCTION', label: 'IN PRODUCTION' },
  { value: 'DELAYED', label: 'DELAYED' },
  { value: 'COMPLETED', label: 'COMPLETED' },
  { value: 'PLANNED', label: 'PLANNED' },
  { value: 'PARTIALLY_SHIPPED', label: 'PARTIALLY SHIPPED' },
  { value: 'SHIPPED', label: 'SHIPPED' },
];

const selectClass =
  'border-mc-beige-dark bg-mc-white text-mc-black focus:border-mc-gold focus:ring-mc-gold w-full cursor-pointer rounded-lg border p-2 text-xs transition-colors focus:ring-1 focus:outline-none';

export default function PurchaseOrderTable({
  loading,
  error,
  purchaseOrders,
  onUpdatePO,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  vendorFilter,
  onVendorFilterChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  currentPage,
  onPageChange,
  pageSize,
  onPageSizeChange,
  totalCount,
  onCreateClick,
  onRefresh,
  onSync,
  isSyncing,
}) {
  const [showSyncMenu, setShowSyncMenu] = useState(false);
  const syncMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (syncMenuRef.current && !syncMenuRef.current.contains(e.target)) {
        setShowSyncMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [syncingPOIds, setSyncingPOIds] = useState(new Set());
  const [manualPoInput, setManualPoInput] = useState('');
  const [isSyncingManualPO, setIsSyncingManualPO] = useState(false);

  const handleManualPOSync = async (e) => {
    e?.preventDefault?.();
    const cleanId = manualPoInput.trim().replace(/^P[O0]-/i, '');
    if (!cleanId) {
      toast.error('Please enter a valid PO number.');
      return;
    }

    if (isSyncingManualPO) return;

    setIsSyncingManualPO(true);
    try {
      await syncSinglePurchaseOrder(cleanId);
      // Only call GET single PO API with no parameters
      const detailData = await getPurchaseOrderById(cleanId);
      if (detailData && onUpdatePO) {
        onUpdatePO(detailData);
      }
      toast.success('Purchase Order synced successfully.');
      setManualPoInput('');
      setShowSyncMenu(false);
    } catch (err) {
      console.error('Failed to sync PO by number:', err);
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        err.message ||
        'Failed to sync Purchase Order.';
      toast.error(errorMsg);
    } finally {
      setIsSyncingManualPO(false);
    }
  };

  const handleSyncSinglePO = async (po) => {
    if (!po) return;
    const scPoId =
      po.sellercloud_po_id ||
      String(po.id || '')
        .replace(/^P[O0]-/i, '')
        .trim();

    if (!scPoId || scPoId === 'N/A') {
      toast.error('Sellercloud PO ID not found.');
      return;
    }

    const poKey = String(po.id || scPoId);
    if (syncingPOIds.has(poKey)) return;

    setSyncingPOIds((prev) => new Set(prev).add(poKey));
    try {
      await syncSinglePurchaseOrder(scPoId);
      // Only call GET single PO API with no parameters
      const detailData = await getPurchaseOrderById(scPoId);
      if (detailData && onUpdatePO) {
        onUpdatePO({ ...po, ...detailData });
      }
      toast.success('Purchase Order synced successfully.');
    } catch (err) {
      console.error('Failed to sync single PO:', err);
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        err.message ||
        'Failed to sync Purchase Order.';
      toast.error(errorMsg);
    } finally {
      setSyncingPOIds((prev) => {
        const next = new Set(prev);
        next.delete(poKey);
        return next;
      });
    }
  };

  const columns = [
    {
      header: 'PO Number',
      accessor: 'id',
      headerClassName: 'px-4 py-3',
      className: 'px-4 py-3 font-mono font-bold text-mc-black',
      render: (po) => po.id || 'N/A',
    },
    {
      header: 'Order ID',
      headerClassName: 'px-4 py-3',
      className: 'px-4 py-3 text-mc-gray-soft',
      render: (po) => (
        <span className="border-mc-beige-dark bg-mc-beige-light rounded-md border px-1.5 py-0.5 text-[10px] font-bold">
          {po.orderId || 'N/A'}
        </span>
      ),
    },
    {
      header: 'Channel ID',
      headerClassName: 'px-4 py-3',
      className: 'px-4 py-3 text-mc-gray-soft',
      render: (po) => po.channelOrderId || 'N/A',
    },
    {
      header: 'Status',
      headerClassName: 'px-4 py-3',
      className: 'px-4 py-3',
      render: (po) => (
        <span className="bg-mc-beige-light text-mc-black rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase">
          {po.status || 'N/A'}
        </span>
      ),
    },
    {
      header: 'Comments',
      headerClassName: 'px-4 py-3 text-center',
      className: 'px-4 py-3 text-center',
      render: (po) => (
        <div className="relative inline-flex">
          <div className="border-mc-beige-dark bg-mc-white flex h-7 w-7 items-center justify-center rounded-lg border">
            <MessageSquare className="text-mc-gray-soft h-3.5 w-3.5" />
          </div>
          {po.commentsCount > 0 && (
            <span className="bg-mc-gold text-mc-black absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold">
              {po.commentsCount}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Order Date',
      headerClassName: 'px-4 py-3',
      className: 'px-4 py-3 text-mc-gray-soft',
      render: (po) => po.creationDate || 'N/A',
    },
    {
      header: 'Vendor',
      headerClassName: 'px-4 py-3',
      className: 'px-4 py-3 font-medium text-mc-black',
      render: (po) => po.vendorName || 'N/A',
    },
    {
      header: 'Warehouse',
      headerClassName: 'px-4 py-3',
      className: 'px-4 py-3 text-mc-gray-soft',
      render: (po) => po.warehouseName || 'N/A',
    },
    {
      header: 'PO Items',
      headerClassName: 'px-4 py-3 text-right',
      className: 'px-4 py-3 text-right font-mono text-mc-black',
      render: (po) => po.itemCount ?? 0,
    },
    {
      header: 'Ordered / Received Qty',
      headerClassName: 'px-4 py-3 text-right',
      className: 'px-4 py-3 text-right font-mono text-mc-black',
      render: (po) => (
        <span>
          {po.orderedQty ?? 0}{' '}
          <span className="text-mc-gray-soft">/</span>{' '}
          {po.receivedQty ?? 0}
        </span>
      ),
    },
    {
      header: 'Actions',
      headerClassName: 'px-4 py-3 text-center',
      className: 'px-4 py-3 text-center',
      render: (po) => {
        const poKey = String(
          po.id ||
            po.sellercloud_po_id ||
            String(po.uuid || '').replace(/^P[O0]-/i, '') ||
            '',
        );
        const isSyncingThisPO =
          syncingPOIds.has(poKey) ||
          (po.sellercloud_po_id &&
            syncingPOIds.has(String(po.sellercloud_po_id))) ||
          (po.id && syncingPOIds.has(String(po.id)));

        return (
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSyncSinglePO(po);
              }}
              disabled={isSyncingThisPO}
              title={isSyncingThisPO ? 'Syncing...' : 'Sync Purchase Order'}
              className="text-mc-black hover:bg-mc-beige-light hover:text-mc-gold inline-flex items-center justify-center rounded-md p-1.5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isSyncingThisPO ? 'animate-spin text-mc-gold' : ''}`}
              />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="bg-mc-beige-light/30 flex h-full w-full flex-col gap-3 p-4">
      {/* Header controls: sync / refresh / create actions */}
      <div className="border-mc-beige-dark bg-mc-white flex flex-shrink-0 flex-col gap-4 rounded-xl border p-4 shadow-none md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-mc-black text-lg font-bold">
            Purchase Orders
          </h1>
          <p className="text-mc-gray-soft text-xs font-medium">
            {totalCount || 0} purchase order{totalCount === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onSync && (
            <div className="relative" ref={syncMenuRef}>
              <button
                type="button"
                onClick={() => setShowSyncMenu((prev) => !prev)}
                disabled={isSyncing}
                className="border-mc-beige-dark bg-mc-beige-light text-mc-black hover:bg-mc-beige-dark flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`}
                />
                <span>{isSyncing ? 'Syncing...' : 'Sync Order SellerCloud'}</span>
                <ChevronDown className="ml-0.5 h-3.5 w-3.5 text-slate-500" />
              </button>

              {showSyncMenu && (
                <div className="border-mc-beige-dark bg-mc-white animate-fadeIn absolute top-full right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border shadow-xl">
                  <div className="border-mc-beige-dark bg-mc-beige-light border-b px-3 py-2">
                    <span className="text-mc-gray-soft text-[10px] font-bold tracking-wider uppercase">
                      Select timeframe
                    </span>
                  </div>
                  <div className="flex flex-col py-1">
                    {[
                      { label: 'Past 1 Day', value: '1' },
                      { label: 'Past 3 Days', value: '3' },
                      { label: 'Past 7 Days', value: '7' },
                      { label: 'Fetch All', value: 'all' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setShowSyncMenu(false);
                          onSync(opt.value);
                        }}
                        className="text-mc-black hover:bg-mc-beige-light px-4 py-2 text-left text-xs font-medium transition"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Manual PO Number Sync */}
                  <div className="border-mc-beige-dark bg-mc-beige-light/50 border-t p-3">
                    <span className="text-mc-gray-soft mb-1.5 block text-[10px] font-bold tracking-wider uppercase">
                      Or Sync Specific PO
                    </span>
                    <form
                      onSubmit={handleManualPOSync}
                      className="flex items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        placeholder="Enter PO # (e.g. 104523)"
                        value={manualPoInput}
                        onChange={(e) => setManualPoInput(e.target.value)}
                        className="focus:border-mc-gold focus:ring-mc-gold border-mc-beige-dark w-full rounded-lg border bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:ring-1 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!manualPoInput.trim() || isSyncingManualPO}
                        className="bg-mc-black hover:bg-black flex items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSyncingManualPO ? (
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
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="border-mc-beige-dark bg-mc-white text-mc-gray-soft hover:bg-mc-beige-light hover:text-mc-black flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>

          <button
            type="button"
            onClick={onCreateClick}
            className="bg-mc-gold text-mc-black flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition hover:opacity-80"
          >
            <Plus className="h-3.5 w-3.5" />
            Create PO Order
          </button>
        </div>
      </div>

      {/* Error banner (kept alongside cached data) */}
      {error && purchaseOrders.length > 0 && (
        <div className="flex flex-shrink-0 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-700">
          <Filter className="h-4 w-4 shrink-0" />
          <span>
            Could not refresh from server. Showing cached data. {error}
          </span>
          <button
            onClick={onRefresh}
            className="ml-auto text-amber-800 underline hover:text-amber-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search + Filters */}
      <div className="border-mc-beige-dark bg-mc-white flex flex-shrink-0 flex-col gap-3 rounded-xl border p-4 shadow-none">
        <div className="relative w-full">
          <Search className="text-mc-gray-soft absolute top-2.5 left-3 h-4 w-4" />
          <input
            type="text"
            placeholder="Smart Search: PO number, Order id, Vendor name..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="border-mc-beige-dark bg-mc-white focus:border-mc-black w-full rounded-lg border py-2 pr-8 pl-9 text-sm transition focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="text-mc-gray-soft hover:bg-mc-beige-light hover:text-mc-black absolute top-2.5 right-3 rounded-full p-0.5 transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Filter className="text-mc-gray-soft h-3.5 w-3.5" />
              <span className="text-mc-gray-soft text-xs font-bold">
                Status:
              </span>
            </div>
            <div className="w-40">
              <select
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                className={selectClass}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Filter className="text-mc-gray-soft h-3.5 w-3.5" />
              <span className="text-mc-gray-soft text-xs font-bold">
                Vendor:
              </span>
            </div>
            <div className="w-40">
              <VendorInfiniteDropdown
                value={vendorFilter}
                onChange={onVendorFilterChange}
                showAllOption={true}
                placeholder="All Vendors"
                className={selectClass}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <CalendarDays className="text-mc-gray-soft h-3.5 w-3.5" />
              <span className="text-mc-gray-soft text-xs font-bold whitespace-nowrap">
                Order Date:
              </span>
            </div>
            <div className="flex items-center gap-1">
              <DateFilterInput
                value={dateFrom || ''}
                onChange={onDateFromChange}
                title="Order Date From"
                mode="date"
              />
              <span className="text-mc-gray-soft font-bold">-</span>
              <DateFilterInput
                value={dateTo || ''}
                onChange={onDateToChange}
                title="Order Date To"
                mode="date"
                minDate={dateFrom}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border-mc-beige-dark bg-mc-white relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border shadow-xs">
        <DataTable
          columns={columns}
          data={purchaseOrders}
          keyField="id"
          isLoading={loading}
          containerClassName="flex-1 flex flex-col min-h-0 w-full relative"
          tableWrapperClassName="overflow-auto flex-1 custom-scrollbar scroll-smooth"
          theadClassName="bg-mc-beige-light border-b border-mc-beige-dark text-mc-black uppercase tracking-widest text-[10px] font-extrabold sticky top-0 z-10"
          tableClassName="w-full min-w-max whitespace-nowrap text-left text-xs border-collapse"
          tbodyClassName="divide-y divide-mc-beige-dark/40 bg-mc-white"
          trClassName="bg-mc-white transition hover:bg-mc-beige-light/30"
          emptyMessage={
            error
              ? `Failed to load purchase orders. ${error}`
              : 'No Purchase Orders found matching your search or filters.'
          }
          pagination={
            totalCount > 0 ? (
              <Pagination
                currentPage={currentPage}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageChange={onPageChange}
                onPageSizeChange={onPageSizeChange}
              />
            ) : null
          }
        />
      </div>
    </div>
  );
}
