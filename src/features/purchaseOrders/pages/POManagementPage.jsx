import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  setPurchaseOrdersList,
  setKanbanList,
  setAllPurchaseOrders,
} from '../store/purchaseOrderSlice';
import POManagement from '../components/POManagement';
import { useCRM } from '../../../hooks/useCRM';
import {
  getPurchaseOrders,
  createPurchaseOrder,
  getPurchaseOrderById,
  getPurchaseOrdersAllFilters,
} from '../services/purchaseOrder.service';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';

export default function POManagementPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
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
  const { poId } = useParams();
  const [searchParams] = useSearchParams();

  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState(() => {
    if (poId) return poId.replace(/^PO-/i, '');
    return '';
  });
  const [statusFilter, setStatusFilter] = useState('NOT_STARTED');
  const [completionFilter, setCompletionFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [totalCount, setTotalCount] = useState(0);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [activeSubTab, setActiveSubTab] = useState('grid');

  const deepLinkDispatchedRef = React.useRef(null);

  useEffect(() => {
    // Prevent react-router deferred prop updates from resurrecting a deeply-linked PO
    // after we have already navigated away synchronously.
    const isShowingPO =
      typeof window !== 'undefined' &&
      window.location.pathname.match(/\/purchase-orders\/[^/]+/);
    if (!isShowingPO) return;

    if (poId) {
      const cleanId = poId.replace(/^PO-/i, '');
      const fullPoId = `PO-${cleanId}`;
      if (selectedPOId !== fullPoId && selectedPOId !== cleanId) {
        setSelectedPOId(fullPoId);
      }

      setTimeout(() => {
        setSearchQuery((prev) => (prev !== cleanId ? cleanId : prev));
      }, 0);

      const commentId = searchParams.get('comment_id');
      const itemId = searchParams.get('item_id');

      const deepLinkKey = `${fullPoId}-${commentId}-${itemId}`;

      if (
        (commentId || itemId) &&
        deepLinkDispatchedRef.current !== deepLinkKey
      ) {
        deepLinkDispatchedRef.current = deepLinkKey;
        // give the PO data some time to load / or just try dispatching event
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('po-deep-link', {
              detail: { poId: fullPoId, commentId, itemId },
            }),
          );
        }, 500);
      }
    }
  }, [poId, searchParams, selectedPOId, setSelectedPOId]);

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
  const handleCompletionFilterChange = (val) => {
    setCompletionFilter(val);
    setCurrentPage(1);
  };
  const handleVendorFilterChange = (val) => {
    setVendorFilter(val);
    setCurrentPage(1);
  };
  const handleCustomerFilterChange = (val) => {
    setCustomerFilter(val);
    setCurrentPage(1);
  };
  const handleChannelFilterChange = (val) => {
    setChannelFilter(val);
    setCurrentPage(1);
  };
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const handleDateToChange = (val) => {
    setDateTo(val);
    setCurrentPage(1);
  };
  const handleDateFromChange = (val) => {
    setDateFrom(val);
    if (val && dateTo && new Date(val) > new Date(dateTo)) {
      setDateTo('');
    }
    setCurrentPage(1);
  };

  const lastFetchRef = React.useRef(null);

  // Fetch purchase orders from API when page, search, or filters change
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      const currentParamsStr = JSON.stringify({
        currentPage,
        pageSize,
        searchQuery,
        statusFilter,
        completionFilter,
        vendorFilter,
        customerFilter,
        channelFilter,
        dateFrom,
        dateTo,
        userRole,
        sortConfig,
        activeSubTab,
        refreshTrigger,
      });

      if (lastFetchRef.current === currentParamsStr) {
        // Prevent exact duplicate network calls in strict mode / rapid successive re-renders
        return;
      }
      lastFetchRef.current = currentParamsStr;

      setLoading(true);
      setError('');
      try {
        const params = {
          page: currentPage,
          page_size: pageSize,
        };
        if (searchQuery) params.search = searchQuery;
        if (statusFilter !== 'all') params.status = statusFilter;
        if (completionFilter === 'open') params.is_completed = false;
        if (completionFilter === 'closed') params.is_completed = true;
        if (dateFrom) {
          params.date_from = dateFrom;
        }
        if (dateTo) {
          params.date_to = dateTo;
        }

        if (sortConfig.key && sortConfig.direction) {
          // Map front-end keys to backend column names if necessary
          const sortMap = {
            id: 'sellercloud_po_id',
            vendorName: 'vendor_name',
            invoiceDate: 'invoice_date',
            eta: 'expected_delivery_date',
            creationDate: 'date_ordered',
            invoiceDelayStatus: 'is_invoice_delayed',
          };

          params.sort_by = sortMap[sortConfig.key] || sortConfig.key;
          params.sort_order = sortConfig.direction === 'desc' ? 'desc' : 'asc';
        }

        if (vendorFilter !== 'all') {
          params.vendor_id = vendorFilter;
        }

        if (customerFilter !== 'all') {
          params.customer_id = customerFilter;
        }

        if (channelFilter !== 'all') {
          params.channel_order_id = channelFilter;
        }

        if (userRole === 'Vendor') {
          params.vendor_id = '3f5551f4-186e-467d-9340-5b74d8e7b766'; // ABC Manufacturing default
        }

        let results = [];
        if (activeSubTab !== 'kanban') {
          const poData = await getPurchaseOrders(params);

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
        }

        const mapPOData = (rawPOs) =>
          rawPOs.map((po) => {
            const frontVendorId = po.vendor_id || 'N/A';
            const vendor = vendors.find((v) => v.id === po.vendor_id);
            const vendorName =
              po.vendor?.name || vendor?.name || po.vendor_name || 'N/A';

            const orderedQty = po.items
              ? po.items.reduce((sum, item) => sum + (item.qty_ordered || 0), 0)
              : 0;
            const receivedQty = po.items
              ? po.items.reduce(
                  (sum, item) => sum + (item.qty_received || 0),
                  0,
                )
              : 0;
            let status = po.status_label || po.status || 'N/A';
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
            // Order Date column maps to date_ordered (same field the date filter uses)
            const rawOrderDate = po.date_ordered || po.created_on;
            const creationDate = rawOrderDate
              ? String(rawOrderDate).split('T')[0]
              : 'N/A';

            // Dynamically find containers array in case the API field name is non-standard
            let foundContainers = po.containers || [];
            if (foundContainers.length === 0) {
              for (const key in po) {
                if (
                  Array.isArray(po[key]) &&
                  po[key].length > 0 &&
                  typeof po[key][0] === 'object' &&
                  po[key][0] !== null &&
                  ('sellercloud_container_id' in po[key][0] ||
                    'container_name' in po[key][0])
                ) {
                  foundContainers = po[key];
                  break;
                }
              }
            }

            return {
              id: po.sellercloud_po_id ? `PO-${po.sellercloud_po_id}` : po.id,
              uuid: po.id,
              orderId: po.order_number || 'N/A',
              channel_order_id: po.channel_order_id || 'N/A',
              vendorId: frontVendorId,
              vendorName,
              companyName:
                po.company_name ||
                po.company?.name ||
                po.companyName ||
                po.sellercloud_company_name ||
                '-',
              customer: po.customer || null,
              customerName: po.first_name || po.customerName || null,
              warehouseName:
                po.warehouse?.name ||
                po.warehouse_name ||
                po.warehouse ||
                'N/A',
              status,
              orderedQty,
              receivedQty,
              total_item_count: po.total_item_count,
              total_qty_ordered: po.total_qty_ordered,
              total_qty_received: po.total_qty_received,
              total_qty_remaining: po.total_qty_remaining,
              container: po.container || 'N/A',
              containers: foundContainers,
              containerNames: po.container_names || [],
              containerIds: po.container_ids || po.container_names || [],
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
                po.container_lead_time_days ||
                po.containerLeadTimeDays ||
                po.leadtime ||
                po.lead_time ||
                null,
              delayedDays: po.delayedDays || 0,
              delay_reason: po.delay_reason || po.reason || null,
              skus: po.items ? po.items.map((item) => item.sku) : po.skus || [],
              items: po.items
                ? po.items.map((item) => ({
                    ...item,
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
              vendor_status: po.vendor_status || 'NOT_STARTED',
              commentsCount:
                po.total_comments_count ??
                po.commentsCount ??
                po.comments_count ??
                (po.comments ? po.comments.length : 0),
              emailCount: po.emailCount || 0,
              sellercloud_link: po.sellercloud_link || null,
              delta_sellercloud_link: po.delta_sellercloud_link || null,
            };
          });

        if (!cancelled) {
          if (activeSubTab !== 'kanban') {
            const mappedPOs = mapPOData(results);
            handleUpdatePOs(mappedPOs);
            dispatch(setPurchaseOrdersList(mappedPOs));
          }

          // Fetch Kanban specific statuses concurrently only in Kanban view
          if (activeSubTab === 'kanban') {
            try {
              // Kanban API should not receive page/page_size pagination
              const kanbanParams = { ...params };
              delete kanbanParams.page;
              delete kanbanParams.page_size;

              const allFiltersRes =
                await getPurchaseOrdersAllFilters(kanbanParams);

              const safeMap = (arr) => {
                if (!Array.isArray(arr)) return [];
                return mapPOData(arr);
              };

              let dataObj = allFiltersRes || {};
              if (
                dataObj.data &&
                !Array.isArray(dataObj.data) &&
                (dataObj.data.new_without_invoice ||
                  dataObj.data.new_arrivals ||
                  dataObj.data.invoice_delayed)
              ) {
                dataObj = dataObj.data;
              }

              const getArr = (k1, k2) => {
                let v = dataObj[k1] || dataObj[k2] || [];
                return Array.isArray(v) ? v : v?.data || [];
              };

              const newWithoutInvoice = getArr(
                'new_without_invoice',
                'new_arrivals',
              );
              const invoiceDelayed = getArr(
                'invoice_delayed',
                'invoice_delayed',
              );
              const deliveryOverdue = getArr(
                'delivery_overdue',
                'delivery_delayed',
              );
              const remainingItems = getArr(
                'remaining_items',
                'remaining_items',
              );

              const hasBuckets =
                newWithoutInvoice.length > 0 ||
                invoiceDelayed.length > 0 ||
                deliveryOverdue.length > 0 ||
                remainingItems.length > 0 ||
                dataObj.new_without_invoice ||
                dataObj.new_arrivals ||
                dataObj.invoice_delayed;

              if (hasBuckets) {
                dispatch(
                  setKanbanList({
                    new_without_invoice: safeMap(newWithoutInvoice),
                    invoice_delayed: safeMap(invoiceDelayed),
                    delivery_overdue: safeMap(deliveryOverdue),
                    remaining_items: safeMap(remainingItems),
                  }),
                );
              } else {
                // Fallback if the backend returned a flat array unconditionally
                let rawArr = [];
                if (Array.isArray(allFiltersRes)) rawArr = allFiltersRes;
                else if (allFiltersRes?.results) rawArr = allFiltersRes.results;
                else if (
                  allFiltersRes?.data &&
                  Array.isArray(allFiltersRes.data)
                )
                  rawArr = allFiltersRes.data;

                const mapped = safeMap(rawArr);
                dispatch(
                  setKanbanList({
                    new_without_invoice: mapped.filter(
                      (po) =>
                        String(po.status).toLowerCase().includes('new') ||
                        String(po.status).includes('1'),
                    ),
                    invoice_delayed: mapped.filter(
                      (po) =>
                        String(po.status)
                          .toLowerCase()
                          .includes('invoice delayed') ||
                        String(po.status).includes('2'),
                    ),
                    delivery_overdue: mapped.filter(
                      (po) =>
                        String(po.status).toLowerCase().includes('delivery') ||
                        String(po.status).includes('3'),
                    ),
                    remaining_items: mapped.filter(
                      (po) =>
                        String(po.status).toLowerCase().includes('remaining') ||
                        String(po.status).includes('4'),
                    ),
                  }),
                );
              }
            } catch (kanbanErr) {
              console.error('Failed to fetch kanban data', kanbanErr);
            }
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

    const timeoutId = setTimeout(() => {
      fetchData();
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentPage,
    pageSize,
    searchQuery,
    statusFilter,
    completionFilter,
    vendorFilter,
    customerFilter,
    channelFilter,
    dateFrom,
    dateTo,
    userRole,
    refreshTrigger,
    sortConfig,
    activeSubTab,
  ]);

  const kanbanList = useSelector(
    (state) => state.purchaseOrders.kanbanList || {},
  );

  // Initial loading is now handled natively via the TableLoader passed inside POManagement

  // Error state (only if no data to show)
  if (error && !hasLoadedInitial) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <div className="flex items-center gap-2 text-rose-500">
          <AlertTriangle className="h-6 w-6" />
          <h3 className="text-lg font-semibold">Failed to load data</h3>
        </div>
        <p className="max-w-md text-center text-sm text-slate-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
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
      // Optimistic update of local state
      const updated = purchaseOrders.map((p) => (p.id === po.id ? po : p));
      handleUpdatePOs(updated);
      dispatch(setPurchaseOrdersList(updated));
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

      const dbVendorId = po.vendorId;

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
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Could not refresh from server. Showing cached data. {error}
          </span>
          <button
            onClick={() => window.location.reload()}
            className="ml-auto text-amber-800 underline hover:text-amber-900"
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
        onSelectPO={(id) => {
          setSelectedPOId(id || null);
          if (!id) {
            navigate('/purchase-orders', { replace: true });
          }
        }}
        onUpdatePO={handlePOUpdateCascade}
        onAddComment={handleAddComment}
        onAddEmailLog={handleAddEmailLog}
        onAddActivity={handleAddActivity}
        onAddAudit={handleAddAudit}
        onRefreshData={() => setRefreshTrigger((prev) => prev + 1)}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
        totalCount={totalCount}
        searchQuery={searchQuery}
        onSearchChange={handleQueryChange}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        completionFilter={completionFilter}
        onCompletionFilterChange={handleCompletionFilterChange}
        vendorFilter={vendorFilter}
        onVendorFilterChange={handleVendorFilterChange}
        customerFilter={customerFilter}
        onCustomerFilterChange={handleCustomerFilterChange}
        channelFilter={channelFilter}
        onChannelFilterChange={handleChannelFilterChange}
        dateFrom={dateFrom}
        onDateFromChange={handleDateFromChange}
        dateTo={dateTo}
        onDateToChange={handleDateToChange}
        sortConfig={sortConfig}
        onSortChange={(key, direction) => setSortConfig({ key, direction })}
        activeSubTab={activeSubTab}
        onActiveSubTabChange={setActiveSubTab}
      />
    </>
  );
}
