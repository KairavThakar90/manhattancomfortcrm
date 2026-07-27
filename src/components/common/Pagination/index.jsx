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
    <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100 text-slate-500 font-medium text-xs gap-4 select-none">
      {/* Left side: Showing X to Y of Z */}
      <div className="text-slate-500 font-medium order-2 sm:order-1 flex-1">
        Showing{' '}
        <span className="text-slate-800 font-bold">
          {totalCount === 0 ? 0 : startIndex + 1}
        </span>{' '}
        to <span className="text-slate-800 font-bold">{endIndex}</span> of{' '}
        <span className="text-slate-800 font-bold">{totalCount}</span> entries
      </div>

      {/* Middle: Page Size Selector (5, 10, 25 only) */}
      {!hidePageSizeSelector && (
        <div className="flex items-center gap-2 order-1 sm:order-2 flex-1 justify-center">
          <span className="text-slate-500">Show</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 transition cursor-pointer"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
          </select>
          <span className="text-slate-500 font-medium">entries per page</span>
        </div>
      )}

      {/* Right side: Page navigation */}
      <div className="flex items-center gap-1.5 order-3 flex-1 justify-end">
        <button
          type="button"
          disabled={normalizedCurrentPage === 1}
          onClick={() => onPageChange(normalizedCurrentPage - 1)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition text-slate-600 font-semibold cursor-pointer"
        >
          Previous
        </button>

        {pageRange[0] > 1 && (
          <>
            <button
              type="button"
              onClick={() => onPageChange(1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold cursor-pointer"
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
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              normalizedCurrentPage === pg
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
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
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold cursor-pointer"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          disabled={normalizedCurrentPage === totalPages}
          onClick={() => onPageChange(normalizedCurrentPage + 1)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition text-slate-600 font-semibold cursor-pointer"
        >
          Next
        </button>
      </div>
    </div>
  );
}
