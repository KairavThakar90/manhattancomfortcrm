import React, { useState, useEffect } from 'react';
import POManagement from '../components/POManagement';
import { useCRM } from '../hooks/useCRM';
import {
  getPurchaseOrders,
  createPurchaseOrder,
  patchPurchaseOrder,
} from '../services/purchaseOrder.service';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

const STATIC_VENDOR_MAP = {
  '3f5551f4-186e-467d-9340-5b74d8e7b766': 'N/A',
  '4ce542cd-5b23-4653-a884-53391edd9f0f': 'N/A',
  'e38f467c-f483-46a4-8172-bce5bb862247': 'N/A',
  'c17e8a34-eaf3-4a0b-89ac-7b4e640b61e3': 'N/A',
};

export default function POManagementPage() {
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
  const [error, setError] = useState('');

  // Fetch purchase orders from API on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        const poData = await getPurchaseOrders();

        if (!cancelled && Array.isArray(poData)) {
          // Normalize PO data to match the UI scheme
          const mappedPOs = poData.map((po) => {
            const vendor = vendors.find((v) => v.id === po.vendor_id);
            const vendorName =
              vendor?.name ||
              STATIC_VENDOR_MAP[po.vendor_id] ||
              po.vendor_name ||
              'N/A';

            // Aggregate ordered and received quantities from items
            const orderedQty = po.items
              ? po.items.reduce((sum, item) => sum + (item.qty_ordered || 0), 0)
              : 0;
            const receivedQty = po.items
              ? po.items.reduce(
                  (sum, item) => sum + (item.qty_received || 0),
                  0,
                )
              : 0;

            // Map status codes or labels to standard UI status:
            // 'Production' | 'In Transit' | 'Delivered' | 'Delayed'
            let status = 'Production';
            if (po.status_label) {
              status = po.status_label;
            } else if (po.status) {
              status = po.status;
            } else {
              switch (po.purchase_order_status_code) {
                case 0:
                  status = 'Production';
                  break;
                case 1:
                  status = 'In Transit';
                  break;
                case 2:
                  status = 'Delivered';
                  break;
                case 3:
                  status = 'Delayed';
                  break;
                default:
                  status = 'Production';
              }
            }

            // Parse dates
            const eta = po.expected_delivery_date
              ? po.expected_delivery_date.split('T')[0]
              : po.eta || 'N/A';

            const creationDate = po.created_on
              ? po.created_on.split('T')[0]
              : po.creationDate || 'N/A';

            return {
              id: po.sellercloud_po_id ? `PO-${po.sellercloud_po_id}` : po.id,
              uuid: po.id, // Stash real UUID for API calls
              vendorId: po.vendor_id || po.vendorId || 'N/A',
              vendorName,
              status,
              orderedQty,
              receivedQty,
              container: po.container || 'N/A',
              invoiceStatus:
                po.invoice_date || po.invoiceStatus === 'Uploaded'
                  ? 'Uploaded'
                  : 'Pending',
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
              creationDate,
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
                    unitPrice:
                      item.unit_price !== undefined
                        ? item.unit_price
                        : item.unitPrice || 0,
                  }))
                : po.items || [],
              productionStage: po.productionStage || 'Assembly',
              commentsCount: po.commentsCount || 0,
              emailCount: po.emailCount || 0,
            };
          });

          handleUpdatePOs(mappedPOs);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to fetch database records.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Loading state
  if (loading && purchaseOrders.length === 0) {
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
  if (error && purchaseOrders.length === 0) {
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

      try {
        await patchPurchaseOrder(dbId, {
          status: po.status,
          eta: po.eta,
          container: po.container,
          productionStage: po.productionStage,
          items: po.items?.map((it) => ({
            sku: it.sku,
            product_name: it.name,
            qty_ordered: it.qty,
            unit_price: it.unitPrice,
          })),
        });
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

      try {
        const response = await createPurchaseOrder({
          vendor_id: po.vendorId,
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
      />
    </>
  );
}
