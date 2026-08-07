import React from 'react';

export default function Pagination({
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  hidePageSizeSelector = false,
}) {
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const normalizedCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (normalizedCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);

  // Generate pagination page numbers
  const pageRange = [];
  const maxButtons = 5;
  let startPage = Math.max(1, normalizedCurrentPage - 2);
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  if (endPage - startPage < maxButtons - 1) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }
  for (let i = startPage; i <= endPage; i++) {
    pageRange.push(i);
  }

  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 bg-slate-50 px-6 py-4 text-xs font-medium text-slate-500 select-none sm:flex-row">
      {/* Left side: Showing X to Y of Z */}
      <div className="order-2 flex-1 font-medium text-slate-500 sm:order-1">
        Showing{' '}
        <span className="font-bold text-slate-800">
          {totalCount === 0 ? 0 : startIndex + 1}
        </span>{' '}
        to <span className="font-bold text-slate-800">{endIndex}</span> of{' '}
        <span className="font-bold text-slate-800">{totalCount}</span> entries
      </div>

      {/* Middle: Page Size Selector (5, 10, 25 only) */}
      {!hidePageSizeSelector && (
        <div className="order-1 flex flex-1 items-center justify-center gap-2 sm:order-2">
          <span className="text-slate-500">Show</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition focus:border-indigo-500 focus:outline-hidden"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
          </select>
          <span className="font-medium text-slate-500">entries per page</span>
        </div>
      )}

      {/* Right side: Page navigation */}
      <div className="order-3 flex flex-1 items-center justify-end gap-1.5">
        <button
          type="button"
          disabled={normalizedCurrentPage === 1}
          onClick={() => onPageChange(normalizedCurrentPage - 1)}
          className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>

        {pageRange[0] > 1 && (
          <>
            <button
              type="button"
              onClick={() => onPageChange(1)}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-600 hover:bg-slate-50"
            >
              1
            </button>
            {pageRange[0] > 2 && (
              <span className="px-2 text-slate-400">...</span>
            )}
          </>
        )}

        {pageRange.map((pg) => (
          <button
            key={pg}
            type="button"
            onClick={() => onPageChange(pg)}
            className={`cursor-pointer rounded-lg px-3 py-1.5 font-bold transition ${
              normalizedCurrentPage === pg
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {pg}
          </button>
        ))}

        {pageRange[pageRange.length - 1] < totalPages && (
          <>
            {pageRange[pageRange.length - 1] < totalPages - 1 && (
              <span className="px-2 text-slate-400">...</span>
            )}
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-600 hover:bg-slate-50"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          disabled={normalizedCurrentPage === totalPages}
          onClick={() => onPageChange(normalizedCurrentPage + 1)}
          className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
