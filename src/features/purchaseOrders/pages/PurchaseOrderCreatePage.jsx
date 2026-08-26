import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import PurchaseOrderTable from '../components/PurchaseOrderTable';
import CreatePurchaseOrderModal from '../components/CreatePurchaseOrderModal';
import {
  getPurchaseOrders,
  syncPurchaseOrders,
} from '../services/purchaseOrder.service';

function mapPO(po) {
  const itemCount = po.total_item_count ?? (po.items ? po.items.length : 0);
  const orderedQty =
    po.total_qty_ordered ??
    (po.items
      ? po.items.reduce((sum, item) => sum + (item.qty_ordered || 0), 0)
      : 0);
  const receivedQty =
    po.total_qty_received ??
    (po.items
      ? po.items.reduce((sum, item) => sum + (item.qty_received || 0), 0)
      : 0);

  return {
    id: po.sellercloud_po_id ? `PO-${po.sellercloud_po_id}` : po.id,
    uuid: po.id,
    orderId: po.order_number || 'N/A',
    channelOrderId: po.channel_order_id || 'N/A',
    vendorName: po.vendor?.name || po.vendor_name || 'N/A',
    companyName:
      po.company_name || po.company?.name || po.companyName || '-',
    warehouseName: po.warehouse?.name || po.warehouse_name || 'N/A',
    status: po.status_label || po.status || 'N/A',
    itemCount,
    orderedQty,
    receivedQty,
    commentsCount:
      po.total_comments_count ?? po.comments_count ?? po.commentsCount ?? 0,
    eta: po.expected_delivery_date
      ? String(po.expected_delivery_date).split('T')[0]
      : 'N/A',
    creationDate: (po.date_ordered || po.created_on || '')
      .toString()
      .split('T')[0],
  };
}

export default function PurchaseOrderCreatePage() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const lastFetchRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      const paramsKey = JSON.stringify({
        currentPage,
        pageSize,
        searchQuery,
        statusFilter,
        vendorFilter,
        dateFrom,
        dateTo,
        refreshTrigger,
      });
      if (lastFetchRef.current === paramsKey) return;
      lastFetchRef.current = paramsKey;

      setLoading(true);
      setError('');
      try {
        const params = { page: currentPage, page_size: pageSize };
        if (searchQuery) params.search = searchQuery;
        if (statusFilter !== 'all') params.status = statusFilter;
        if (vendorFilter !== 'all') params.vendor_id = vendorFilter;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;

        const data = await getPurchaseOrders(params);
        if (cancelled) return;

        // Be permissive about the response shape — different backend
        // versions have wrapped the list under different keys.
        let results = [];
        let count = 0;
        if (Array.isArray(data)) {
          results = data;
          count = data.length;
        } else if (Array.isArray(data?.results)) {
          results = data.results;
          count =
            data.count ?? data.total ?? data.meta?.total ?? results.length;
        } else if (Array.isArray(data?.data)) {
          results = data.data;
          count = data.count ?? data.total ?? results.length;
        } else if (Array.isArray(data?.items)) {
          results = data.items;
          count = data.count ?? data.total ?? results.length;
        } else if (data) {
          console.warn(
            'getPurchaseOrders returned an unrecognized shape — showing no rows.',
            data,
          );
        }

        setPurchaseOrders(results.map(mapPO));
        setTotalCount(count);
      } catch (err) {
        console.error('Failed to fetch purchase orders', err);
        if (!cancelled) {
          setError(
            err?.response?.data?.message ||
              err.message ||
              'Failed to fetch purchase orders.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const timeoutId = setTimeout(fetchData, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [
    currentPage,
    pageSize,
    searchQuery,
    statusFilter,
    vendorFilter,
    dateFrom,
    dateTo,
    refreshTrigger,
  ]);

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };
  const handleStatusFilterChange = (val) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };
  const handleVendorFilterChange = (val) => {
    setVendorFilter(val);
    setCurrentPage(1);
  };
  const handleDateFromChange = (val) => {
    setDateFrom(val);
    if (val && dateTo && new Date(val) > new Date(dateTo)) setDateTo('');
    setCurrentPage(1);
  };
  const handleDateToChange = (val) => {
    setDateTo(val);
    setCurrentPage(1);
  };
  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const handleCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSync = async (days) => {
    try {
      setIsSyncing(true);
      await syncPurchaseOrders(days);
      toast.success(
        days === 'all'
          ? 'Successfully synced all POs from SellerCloud!'
          : `Successfully synced POs for the past ${days} days from SellerCloud!`,
      );
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error('Error syncing POs:', err);
      toast.error('Failed to sync POs from SellerCloud.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <PurchaseOrderTable
        loading={loading}
        error={error}
        purchaseOrders={purchaseOrders}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        vendorFilter={vendorFilter}
        onVendorFilterChange={handleVendorFilterChange}
        dateFrom={dateFrom}
        onDateFromChange={handleDateFromChange}
        dateTo={dateTo}
        onDateToChange={handleDateToChange}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
        totalCount={totalCount}
        onCreateClick={() => setIsCreateOpen(true)}
        onRefresh={() => setRefreshTrigger((prev) => prev + 1)}
        onSync={handleSync}
        isSyncing={isSyncing}
      />
      <CreatePurchaseOrderModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />
    </>
  );
}
