import React from 'react';
import { Eye, X, Calendar, Package, CheckCircle2 } from 'lucide-react';

export default function ContainerDetailsModal({ container, onClose }) {
  if (!container) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 leading-tight">
                Container Details
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-slate-500 font-medium">
                  {container.name || 'Unnamed'}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 tracking-wider">
                  {window.innerWidth > 768
                    ? container.id
                    : container.id?.split('-')[0] + '...'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Top Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm shadow-slate-100/50 hover:border-blue-200 hover:shadow-blue-50 transition-all duration-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <i className="w-1.5 h-1.5 rounded-full bg-blue-500"></i>
                PO Assignment
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-mono font-bold text-slate-800">
                    {(() => {
                      const firstPo = container.poIds?.[0];
                      return firstPo
                        ? firstPo.toString().startsWith('PO-')
                          ? firstPo
                          : `PO-${firstPo}`
                        : 'Unassigned';
                    })()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm shadow-slate-100/50 hover:border-indigo-200 hover:shadow-indigo-50 transition-all duration-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                Arrival Date
              </p>
              <p className="text-lg font-bold text-slate-800">
                {container.arrivalDate || 'Pending'}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm shadow-slate-100/50 hover:border-emerald-200 hover:shadow-emerald-50 transition-all duration-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-emerald-500" />
                Total Qty
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-800">
                  {container.totalItems}
                </span>
                <span className="text-sm font-medium text-slate-500">
                  units
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm shadow-slate-100/50 hover:border-amber-200 hover:shadow-amber-50 transition-all duration-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
                Status
              </p>
              <div className="inline-flex mt-1">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${container.is_received ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}
                >
                  {container.is_received ? 'Received' : 'In Transit'}
                </span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm shadow-slate-100/50">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800">
                Allocated Items
              </h4>
              <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {container.details?.length || 0} Line Items
              </span>
            </div>

            {container.details && container.details.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5 w-1/3">SKU</th>
                      <th className="px-5 py-3.5">Product Name</th>
                      <th className="px-5 py-3.5 text-right w-32">
                        Qty Assigned
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {container.details.map((item, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-5 py-3.5 align-top">
                          <span className="font-mono text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {item.sku || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 align-top text-slate-600 leading-snug">
                          {item.product_name || item.name || '-'}
                        </td>
                        <td className="px-5 py-3.5 align-top text-right">
                          <span className="inline-flex items-center justify-center min-w-[3rem] px-2 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-100">
                            {item.qty_in_container || item.qty || 0}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                  <Package className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-500 font-medium mb-1">
                  No items allocated
                </p>
                <p className="text-sm text-slate-400 max-w-sm">
                  This container currently does not have any purchase order
                  items assigned to it.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer shadow-sm"
          >
            Close View
          </button>
        </div>
      </div>
    </div>
  );
}
