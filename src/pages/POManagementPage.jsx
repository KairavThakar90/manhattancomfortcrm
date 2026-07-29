import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  setPurchaseOrdersList,
  setKanbanList,
  setAllPurchaseOrders,
} from '../store/purchaseOrderSlice';
import POManagement from '../components/POManagement';
import { useCRM } from '../hooks/useCRM';
import {
  getPurchaseOrders,
  createPurchaseOrder,
  patchPurchaseOrder,
  getPurchaseOrderById,
  getPurchaseOrdersAllFilters,
} from '../services/purchaseOrder.service';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

const DB_VENDOR_ID_MAP = {
  '3f5551f4-186e-467d-9340-5b74d8e7b766': 'VEND-001',
  '4ce542cd-5b23-4653-a884-53391edd9f0f': 'VEND-002',
  'e38f467c-f483-46a4-8172-bce5bb862247': 'VEND-003',
  'c17e8a34-eaf3-4a0b-89ac-7b4e640b61e3': 'VEND-004',
};

const STATIC_VENDOR_MAP = {
  '3f5551f4-186e-467d-9340-5b74d8e7b766': 'ABC Manufacturing',
  '4ce542cd-5b23-4653-a884-53391edd9f0f': 'XYZ Logistics & Textiles',
  'e38f467c-f483-46a4-8172-bce5bb862247': 'Global Tech Sourcing',
  'c17e8a34-eaf3-4a0b-89ac-7b4e640b61e3': 'Shenzhen Electronics Corp',
};

export default function POManagementPage() {
  const dispatch = useDispatch();
  const {
    purchaseOrders,
    vendors,
    comments,
    emailLogs,
    userRole,
    selectedPOId,
    setSelectedPOId,
    handleUpdatePOs,
    handleAddComment,
    handleAddEmailLog,
    handleAddActivity,
    handleAddAudit,
  } = useCRM();

  const [loading, setLoading] = useState(true);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const [error, setError] = useState('');

  // Lift state for server-side pagination and filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [totalCount, setTotalCount] = useState(0);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const handleQueryChange = (val) => {
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

  // Fetch purchase orders from API when page, search, or filters change
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        console.log('API FETCH getPurchaseOrders: starting fetch...');

        const params = {
          page: currentPage,
          page_size: pageSize,
        };
        if (searchQuery) params.search = searchQuery;
        if (statusFilter !== 'all') params.status = statusFilter;

        if (sortConfig.key && sortConfig.direction) {
          // Map front-end keys to backend column names if necessary
          const sortMap = {
            id: 'sellercloud_po_id',
            vendorName: 'vendor_name',
            invoiceDate: 'invoice_date',
            eta: 'expected_delivery_date',
            creationDate: 'created_on',
          };
          params.ordering =
            sortConfig.direction === 'desc'
              ? `-${sortMap[sortConfig.key] || sortConfig.key}`
              : sortMap[sortConfig.key] || sortConfig.key;
        }

        if (vendorFilter !== 'all') {
          // Find the database UUID that maps to this front ID (e.g. 'VEND-001')
          const dbVendorId =
            Object.keys(DB_VENDOR_ID_MAP).find(
              (key) => DB_VENDOR_ID_MAP[key] === vendorFilter,
            ) || vendorFilter;
          params.vendor_id = dbVendorId;
        }

        if (userRole === 'Vendor') {
          params.vendor_id = '3f5551f4-186e-467d-9340-5b74d8e7b766'; // ABC Manufacturing default
        }

        const poData = await getPurchaseOrders(params);
        console.log('API FETCH getPurchaseOrders: success! Result:', poData);

        let results = [];
        if (poData) {
          if (Array.isArray(poData)) {
            results = poData;
            setTotalCount(poData.length);
          } else if (poData.results && Array.isArray(poData.results)) {
            results = poData.results;
            if (typeof poData.count === 'number') {
              setTotalCount(poData.count);
            } else if (typeof poData.total === 'number') {
              setTotalCount(poData.total);
            } else if (poData.meta?.total !== undefined) {
              setTotalCount(poData.meta.total);
            } else {
              setTotalCount(poData.results.length);
            }
          }
        }

        const mapPOData = (rawPOs) =>
          rawPOs.map((po) => {
            const frontVendorId =
              DB_VENDOR_ID_MAP[po.vendor_id] || po.vendor_id || 'N/A';
            const vendor = vendors.find(
              (v) => v.id === frontVendorId || v.id === po.vendor_id,
            );
            const vendorName =
              po.vendor?.name ||
              vendor?.name ||
              STATIC_VENDOR_MAP[po.vendor_id] ||
              po.vendor_name ||
              'N/A';

            const orderedQty = po.items
              ? po.items.reduce((sum, item) => sum + (item.qty_ordered || 0), 0)
              : 0;
            const receivedQty = po.items
              ? po.items.reduce(
                  (sum, item) => sum + (item.qty_received || 0),
                  0,
                )
              : 0;
            let status = po.status_label || 'N/A';
            let eta = 'N/A';
            const leadDays =
              po.container_lead_time_days || po.containerLeadTimeDays;
            if (po.invoice_date && leadDays) {
              const invoiceDate = new Date(po.invoice_date);
              invoiceDate.setDate(invoiceDate.getDate() + Number(leadDays));
              eta = invoiceDate.toISOString().split('T')[0];
            } else if (po.expected_delivery_date) {
              eta = po.expected_delivery_date.split('T')[0];
            }
            const creationDate = po.created_on
              ? po.created_on.split('T')[0]
              : 'N/A';

            return {
              id: po.sellercloud_po_id ? `PO-${po.sellercloud_po_id}` : po.id,
              uuid: po.id,
              orderId: po.order_number || 'N/A',
              vendorId: frontVendorId,
              vendorName,
              status,
              orderedQty,
              receivedQty,
              container: po.container || 'N/A',
              containerNames: po.container_names || [],
              invoiceStatus: po.invoice_status || po.invoiceStatus || null,
              invoiceFile:
                po.invoiceFile ||
                (po.invoice_date
                  ? `invoice_po${po.sellercloud_po_id}.pdf`
                  : null),
              invoiceDetails:
                po.invoiceDetails ||
                (po.invoice_date
                  ? {
                      amount: po.total_amount || 0,
                      invoiceNumber: `INV-2026-${po.sellercloud_po_id || '001'}`,
                      date: po.invoice_date.split('T')[0],
                      ocrExtracted: true,
                    }
                  : null),
              eta,
              expected_delivery_date: eta,
              creationDate,
              containerLeadTimeDays:
                po.container_lead_time_days || po.containerLeadTimeDays || null,
              delayedDays: po.delayedDays || 0,
              skus: po.items ? po.items.map((item) => item.sku) : po.skus || [],
              items: po.items
                ? po.items.map((item) => ({
                    sku: item.sku || 'N/A',
                    name: item.product_name || item.name || 'N/A',
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
                : po.items || [],
              productionStage: po.productionStage || 'Assembly',
              commentsCount: po.commentsCount || 0,
              emailCount: po.emailCount || 0,
              sellercloud_link: po.sellercloud_link || null,
            };
          });

        if (!cancelled) {
          const mappedPOs = mapPOData(results);
          handleUpdatePOs(mappedPOs);
          dispatch(setPurchaseOrdersList(mappedPOs));

          // Fetch Kanban specific statuses concurrently
          try {
            const allFiltersRes = await getPurchaseOrdersAllFilters(
              params.vendor_id,
            );

            const safeMap = (arr) => {
              if (!Array.isArray(arr)) return [];
              const mappedArr = mapPOData(arr);
              if (vendorFilter === 'all' && userRole !== 'Vendor')
                return mappedArr;

              const targetVendor =
                userRole === 'Vendor' ? 'VEND-001' : vendorFilter;
              return mappedArr.filter(
                (po) =>
                  po.vendorId === targetVendor || po.vendor_id === targetVendor,
              );
            };

            if (
              allFiltersRes &&
              !Array.isArray(allFiltersRes) &&
              (allFiltersRes.new_arrivals || allFiltersRes.invoice_delayed)
            ) {
              dispatch(
                setKanbanList({
                  new_without_invoice: safeMap(
                    allFiltersRes.new_arrivals?.data || [],
                  ),
                  invoice_delayed: safeMap(
                    allFiltersRes.invoice_delayed?.data || [],
                  ),
                  delivery_overdue: safeMap(
                    allFiltersRes.delivery_overdue?.data || [],
                  ),
                  remaining_items: safeMap(
                    allFiltersRes.remaining_items?.data || [],
                  ),
                }),
              );
            } else {
              // Fallback if the backend returned a flat array or something else
              let rawArr = [];
              if (Array.isArray(allFiltersRes)) rawArr = allFiltersRes;
              else if (allFiltersRes?.results) rawArr = allFiltersRes.results;

              const mapped = safeMap(rawArr);
              dispatch(
                setKanbanList({
                  new_without_invoice: mapped.filter(
                    (po) => po.status === 'New' || po.status === '1. New',
                  ),
                  invoice_delayed: mapped.filter(
                    (po) =>
                      po.status === 'Invoice Delayed' ||
                      po.status === '2. Invoice Delayed',
                  ),
                  delivery_overdue: mapped.filter(
                    (po) =>
                      po.status === 'Delivery Delayed' ||
                      po.status === '3. Delivery Delayed',
                  ),
                  remaining_items: mapped.filter(
                    (po) =>
                      po.status === 'Remaining Order Items' ||
                      po.status === '4. Remaining Order Items',
                  ),
                }),
              );
            }
          } catch (kanbanErr) {
            console.error('Failed to fetch kanban data', kanbanErr);
          }
        }
      } catch (err) {
        console.error('API FETCH getPurchaseOrders: failed!', err);
        if (!cancelled) {
          setError(err.message || 'Failed to fetch database records.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setHasLoadedInitial(true);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentPage,
    pageSize,
    searchQuery,
    statusFilter,
    vendorFilter,
    userRole,
    refreshTrigger,
    sortConfig,
  ]);

  const kanbanList = useSelector(
    (state) => state.purchaseOrders.kanbanList || {},
  );

  // Fetch single purchase order details dynamically on selection
  useEffect(() => {
    if (!selectedPOId) return;

    // Find the current PO in context to find its database UUID
    let currentPO = purchaseOrders.find(
      (p) => p.id === selectedPOId || p.uuid === selectedPOId,
    );

    if (!currentPO && kanbanList) {
      for (const key of Object.keys(kanbanList)) {
        const found = kanbanList[key].find(
          (p) => p.id === selectedPOId || p.uuid === selectedPOId,
        );
        if (found) {
          currentPO = found;
          break;
        }
      }
    }

    if (!currentPO) return;

    const dbId = currentPO.uuid || selectedPOId;
    let cancelled = false;

    async function fetchDetailedPO() {
      try {
        const poData = await getPurchaseOrderById(dbId);
        if (!cancelled && poData) {
          const frontVendorId =
            DB_VENDOR_ID_MAP[poData.vendor_id] || poData.vendor_id || 'N/A';
          const vendor = vendors.find(
            (v) => v.id === frontVendorId || v.id === poData.vendor_id,
          );
          const vendorName =
            poData.vendor?.name ||
            vendor?.name ||
            STATIC_VENDOR_MAP[poData.vendor_id] ||
            poData.vendor_name ||
            'N/A';

          const orderedQty = poData.items
            ? poData.items.reduce(
                (sum, item) => sum + (item.qty_ordered || 0),
                0,
              )
            : 0;
          const receivedQty = poData.items
            ? poData.items.reduce(
                (sum, item) => sum + (item.qty_received || 0),
                0,
              )
            : 0;

          let status = poData.status_label || 'N/A';

          let eta = poData.expected_delivery_date
            ? poData.expected_delivery_date.split('T')[0]
            : 'N/A';

          const creationDate = poData.created_on
            ? poData.created_on.split('T')[0]
            : 'N/A';

          const updatedPO = {
            ...currentPO,
            vendorName,
            orderedQty,
            receivedQty,
            status,
            eta,
            expected_delivery_date: eta,
            containerNames:
              poData.container_names && poData.container_names.length > 0
                ? poData.container_names
                : currentPO.containerNames || [],
            items: poData.items
              ? poData.items.map((item) => {
                  const currentItem = currentPO.items?.find(
                    (i) => i.sku === item.sku,
                  );
                  return {
                    sku: item.sku || 'N/A',
                    name: item.product_name || item.name || 'N/A',
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
                      : currentItem?.expected_delivery_date || null,
                    containers:
                      item.containers && item.containers.length > 0
                        ? item.containers
                        : currentItem?.containers || [],
                  };
                })
              : currentPO.items || [],
          };

          const updatedList = purchaseOrders.map((p) =>
            p.id === currentPO.id ? updatedPO : p,
          );

          if (!purchaseOrders.some((p) => p.id === currentPO.id)) {
            updatedList.push(updatedPO);
          }

          handleUpdatePOs(updatedList);
          dispatch(setPurchaseOrdersList(updatedList));
        }
      } catch (err) {
        console.error('Failed to load detailed PO items from API:', err);
      }
    }

    fetchDetailedPO();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPOId]);

  // Loading state
  if (loading && !hasLoadedInitial) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">
          Loading purchase orders...
        </p>
      </div>
    );
  }

  // Error state (only if no data to show)
  if (error && !hasLoadedInitial) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="flex items-center gap-2 text-rose-500">
          <AlertTriangle className="h-6 w-6" />
          <h3 className="text-lg font-semibold">Failed to load data</h3>
        </div>
        <p className="text-sm text-slate-500 max-w-md text-center">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  const handlePOUpdateCascade = async (po) => {
    const exists = purchaseOrders.some(
      (p) => p.id === po.id || p.uuid === po.uuid,
    );
    if (exists) {
      // Find database UUID
      const originalPO = purchaseOrders.find(
        (p) => p.id === po.id || p.uuid === po.uuid,
      );
      const dbId = originalPO?.uuid || po.uuid || po.id;

      // Optimistic update of local state
      const updated = purchaseOrders.map((p) => (p.id === po.id ? po : p));
      handleUpdatePOs(updated);
      dispatch(setPurchaseOrdersList(updated));

      try {
        await patchPurchaseOrder(dbId, {
          status: po.status,
          eta: po.eta,
          container: po.container,
          productionStage: po.productionStage,
          container_lead_time_days:
            po.containerLeadTimeDays || po.container_lead_time_days || null,
          items: po.items?.map((it) => ({
            sku: it.sku,
            product_name: it.name,
            qty_ordered: it.qty,
            unit_price: it.unitPrice,
          })),
        });

        // Background call to purchase order API
        setRefreshTrigger((prev) => prev + 1);
      } catch (err) {
        console.error('Failed to sync PO update to backend API:', err);
      }
    } else {
      // Optimistic create UI state
      const mockId = po.id || `PO-${Math.floor(10000 + Math.random() * 90000)}`;
      const newLocalPO = {
        ...po,
        id: mockId,
      };

      const updated = [...purchaseOrders, newLocalPO];
      handleUpdatePOs(updated);
      dispatch(setPurchaseOrdersList(updated));

      const dbVendorId =
        Object.keys(DB_VENDOR_ID_MAP).find(
          (key) => DB_VENDOR_ID_MAP[key] === po.vendorId,
        ) || po.vendorId;

      try {
        const response = await createPurchaseOrder({
          vendor_id: dbVendorId,
          expected_delivery_date: po.eta,
          items: po.items?.map((it) => ({
            sku: it.sku,
            product_name: it.name,
            qty_ordered: it.qty,
            unit_price: it.unitPrice,
          })),
        });

        if (response && response.id) {
          const mappedCreated = {
            ...newLocalPO,
            id: response.sellercloud_po_id
              ? `PO-${response.sellercloud_po_id}`
              : response.id,
            uuid: response.id,
          };
          const finalUpdated = purchaseOrders.map((p) =>
            p.id === mockId ? mappedCreated : p,
          );
          handleUpdatePOs(finalUpdated);
          dispatch(setPurchaseOrdersList(finalUpdated));
        }
      } catch (err) {
        console.error('Failed to sync new PO to backend API:', err);
      }
    }
  };

  return (
    <>
      {/* Show a subtle banner if API failed but we have data */}
      {error && purchaseOrders.length > 0 && (
        <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2.5 rounded-xl text-xs font-medium">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Could not refresh from server. Showing cached data. {error}
          </span>
          <button
            onClick={() => window.location.reload()}
            className="ml-auto text-amber-800 hover:text-amber-900 underline"
          >
            Retry
          </button>
        </div>
      )}
      <POManagement
        loading={loading}
        purchaseOrders={purchaseOrders}
        vendors={vendors}
        comments={comments}
        emails={emailLogs}
        userRole={userRole}
        selectedPOId={selectedPOId}
        onSelectPO={setSelectedPOId}
        onUpdatePO={handlePOUpdateCascade}
        onAddComment={handleAddComment}
        onAddEmailLog={handleAddEmailLog}
        onAddActivity={handleAddActivity}
        onAddAudit={handleAddAudit}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
        totalCount={totalCount}
        searchQuery={searchQuery}
        onSearchChange={handleQueryChange}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        vendorFilter={vendorFilter}
        onVendorFilterChange={handleVendorFilterChange}
        sortConfig={sortConfig}
        onSortChange={(key, direction) => setSortConfig({ key, direction })}
      />
    </>
  );
}
