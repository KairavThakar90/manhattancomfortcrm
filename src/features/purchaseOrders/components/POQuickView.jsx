import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Package, Loader2, ExternalLink } from 'lucide-react';
import { getPurchaseOrderById } from '../services/purchaseOrder.service';

/**
 * POQuickView — Standalone modal that fetches a PO by its numeric ID
 * and renders a clean overlay with key details.
 * Does NOT depend on POManagement or Redux state.
 */
export default function POQuickView({ poId, onClose }) {
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Strip PO- prefix to get raw numeric ID for API call
  const cleanId = String(poId)
    .replace(/^P[O0]-/i, '')
    .trim();
  // Display label with PO- prefix
  const displayId = cleanId.match(/^\d+$/) ? 'PO-' + cleanId : poId;

  useEffect(() => {
    if (!cleanId) return;
    setLoading(true);
    setError(null);
    setPo(null);

    getPurchaseOrderById(cleanId)
      .then((data) => {
        if (data) {
          setPo(data);
        } else {
          setError('Purchase order not found.');
        }
      })
      .catch((err) => {
        console.error('POQuickView fetch error:', err);
        setError('Failed to load purchase order details.');
      })
      .finally(() => setLoading(false));
  }, [cleanId]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const items = po?.items || po?.purchase_order_items || [];

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-mc-gold/10 border-mc-gold/20 flex h-9 w-9 items-center justify-center rounded-lg border">
              <Package className="text-mc-gold h-4 w-4" />
            </div>
            <div>
              <span className="font-mono text-sm font-bold text-slate-900">
                {displayId}
              </span>
              {po?.vendor_name && (
                <p className="mt-0.5 text-xs text-slate-500">
                  {po.vendor_name}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {po?.delta_sellercloud_link && (
              <a
                href={po.delta_sellercloud_link}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-mc-gold flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-100"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Sellercloud
              </a>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
              <Loader2 className="text-mc-gold h-6 w-6 animate-spin" />
              <span className="text-sm">Loading PO details…</span>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-16 text-sm text-red-500">
              {error}
            </div>
          )}

          {!loading && !error && po && (
            <div className="space-y-5 p-5">
              {/* Key Info Grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  {
                    label: 'Status',
                    value: po.status || po.status_label || 'N/A',
                  },
                  {
                    label: 'Vendor',
                    value: po.vendor_name || po.vendorName || 'N/A',
                  },
                  {
                    label: 'ETA',
                    value: po.eta || po.expected_delivery_date || 'N/A',
                  },
                  {
                    label: 'Ordered Qty',
                    value: po.total_qty_ordered ?? po.orderedQty ?? 'N/A',
                  },
                  {
                    label: 'Received Qty',
                    value: po.total_qty_received ?? po.receivedQty ?? 'N/A',
                  },
                  {
                    label: 'Created',
                    value: po.created_on
                      ? String(po.created_on).split('T')[0]
                      : po.creationDate || 'N/A',
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
                  >
                    <p className="mb-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                      {label}
                    </p>
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {String(value)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Items Table */}
              {items.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-bold tracking-wider text-slate-500 uppercase">
                    Item Specifications ({items.length})
                  </h4>
                  <div className="overflow-hidden rounded-xl border border-slate-100">
                    <table className="w-full text-xs">
                      <thead className="border-b border-slate-100 bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500">
                            SKU
                          </th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500">
                            Description
                          </th>
                          <th className="px-3 py-2 text-right font-semibold text-slate-500">
                            Ordered
                          </th>
                          <th className="px-3 py-2 text-right font-semibold text-slate-500">
                            Received
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {items.map((item, i) => (
                          <tr
                            key={item.id || item.sku || i}
                            className="transition-colors hover:bg-slate-50/60"
                          >
                            <td className="px-3 py-2 font-mono font-bold whitespace-nowrap text-slate-800">
                              {item.sku || item.sellercloud_product_id || '—'}
                            </td>
                            <td className="max-w-[200px] truncate px-3 py-2 text-slate-600">
                              {item.name ||
                                item.item_name ||
                                item.product_name ||
                                '—'}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-slate-800">
                              {item.qty_ordered ??
                                item.qty ??
                                item.orderedQty ??
                                '—'}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-600">
                              {item.qty_received ?? item.receivedQty ?? '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {items.length === 0 && (
                <p className="py-4 text-center text-sm text-slate-400">
                  No items found for this PO.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end border-t border-slate-100 bg-slate-50 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
