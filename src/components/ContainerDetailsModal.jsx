import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Eye,
  X,
  Calendar,
  Package,
  CheckCircle2,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { Tooltip } from 'react-tooltip';
import DataTable from './common/DataTable';
import Pagination from './common/Pagination';

export default function ContainerDetailsModal({
  container,
  isLoading = false,
  onClose,
  onRefresh,
}) {
  const [itemsPage, setItemsPage] = useState(1);
  const [itemsPageSize, setItemsPageSize] = useState(10);

  if (!container) return null;

  const allItems = container.details || [];
  const totalItems = allItems.length;
  const paginatedItems = allItems.slice(
    (itemsPage - 1) * itemsPageSize,
    itemsPage * itemsPageSize,
  );

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
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
                    {container.sellercloud_container_id || 'Unnamed'}
                    {container.name && container.name !== container.id
                      ? ` (${container.name})`
                      : ''}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {container.sellercloud_link && (
                <button
                  onClick={() =>
                    window.open(container.sellercloud_link, '_blank')
                  }
                  className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm border border-indigo-100 mr-2 cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open in Sellercloud
                </button>
              )}
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-6 flex flex-col flex-1 min-h-0">
            {/* Top Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8 shrink-0">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm shadow-slate-100/50 hover:border-indigo-200 hover:shadow-indigo-50 transition-all duration-200">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  Arrival Date
                </p>
                <p className="text-base font-bold text-slate-800">
                  {container.arrivalDate || 'Pending'}
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm shadow-slate-100/50 hover:border-emerald-200 hover:shadow-emerald-50 transition-all duration-200">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-emerald-500" />
                  Total Item
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-slate-800">
                    {totalItems}
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
            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.03)] flex-1 flex flex-col min-h-0 mt-2 overflow-hidden">
              <div className="flex items-center justify-between shrink-0 px-5 pt-5 pb-4">
                <h4 className="text-sm font-bold text-slate-900 shrink-0">
                  Allocated Items
                </h4>
              </div>

              {allItems.length > 0 || isLoading ? (
                <>
                  <DataTable
                    isLoading={isLoading}
                    columns={[
                      {
                        header: 'VENDOR NAME',
                        accessor: 'vendor_name',
                        headerClassName: 'px-3 py-2 w-1/3 bg-white',
                        className: 'px-3 py-2 max-w-[120px]',
                        render: (item) => (
                          <span className="font-mono font-bold text-slate-500 truncate block">
                            {item.vendor_name || 'N/A'}
                          </span>
                        ),
                      },
                      {
                        header: 'SKU',
                        accessor: 'sku',
                        headerClassName: 'px-3 py-2 bg-white w-24',
                        className: 'px-3 py-2 max-w-[100px]',
                        render: (item) => (
                          <div className="flex items-center gap-1.5 group">
                            <span
                              className="font-mono text-slate-700 truncate cursor-pointer flex-1 min-w-0"
                              data-tooltip-id="sku-tooltip"
                              data-tooltip-content={item.sku || 'N/A'}
                            >
                              {item.sku || '-'}
                            </span>
                            {item.sku && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(item.sku);
                                }}
                                className="text-slate-300 hover:text-indigo-600 transition-colors shrink-0"
                                title="Copy SKU"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ),
                      },
                      {
                        header: 'PRODUCT NAME',
                        accessor: 'product_name',
                        headerClassName: 'px-3 py-2 bg-white',
                        className: 'px-3 py-2 max-w-[150px]',
                        render: (item) => (
                          <span className="font-medium text-slate-800 line-clamp-1">
                            {item.product_name || item.name || '-'}
                          </span>
                        ),
                      },
                      {
                        header: 'QTY ASSIGNED',
                        accessor: 'qty',
                        headerClassName: 'px-3 py-2 text-right w-32 bg-white',
                        className: 'px-3 py-2 text-right font-mono font-medium',
                        render: (item) =>
                          item.qty_in_container || item.qty || 0,
                      },
                    ]}
                    data={paginatedItems}
                    keyField="product_name"
                    theadClassName="border-b border-slate-100 text-black uppercase font-bold text-[9px] sticky top-0 bg-white z-10"
                    tableClassName="w-full text-left text-xs border-collapse"
                    tbodyClassName="divide-y divide-slate-100 text-slate-700"
                    trClassName="hover:bg-slate-50/50 transition-colors"
                    containerClassName="overflow-x-auto overflow-y-auto flex-1 min-h-0 rounded-lg bg-white"
                    tableWrapperClassName=""
                  />
                  <Pagination
                    currentPage={itemsPage}
                    totalCount={totalItems}
                    pageSize={itemsPageSize}
                    onPageChange={(pg) => setItemsPage(pg)}
                    onPageSizeChange={(size) => {
                      setItemsPageSize(size);
                      setItemsPage(1);
                    }}
                  />
                </>
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
      <Tooltip
        id="sku-tooltip"
        positionStrategy="fixed"
        place="top"
        className="max-w-xs z-[100] text-xs font-semibold leading-relaxed shadow-xl tracking-wide text-center"
        style={{
          backgroundColor: '#6366f1',
          color: '#ffffff',
          borderRadius: '8px',
          padding: '8px 12px',
        }}
      />
    </>,
    document.body,
  );
}
