import React from 'react';

/**
 * DataTable Component
 *
 * @param {Object} props - The component props
 * @param {Object[]} props.columns - Array of column configurations.
 *   - header: ReactNode (String or Element) for the column header
 *   - accessor: String (key in data object) - used for simple rendering
 *   - key: String (optional) - if accessor is not provided
 *   - render: Function(row, rowIndex) -> ReactNode (custom cell rendering)
 *   - className: String (td classes)
 *   - headerClassName: String (th classes)
 * @param {Object[]} props.data - Array of data objects
 * @param {String} [props.keyField='id'] - Key to use for React list keys (default 'id')
 * @param {String|ReactNode} [props.emptyMessage] - Message to show when data is empty
 * @param {Boolean} [props.isLoading] - Indicates loading state
 * @param {String} [props.containerClassName] - Classes for the wrapper div
 * @param {String} [props.tableWrapperClassName] - Classes for the wrapper div
 * @param {String} [props.tableClassName] - Classes for the table
 * @param {String} [props.theadClassName] - Classes for the table head
 * @param {String} [props.defaultThClassName] - Classes for the table th
 * @param {String} [props.tbodyClassName] - Classes for the table body
 * @param {String|Function} [props.trClassName] - Classes for the table row
 * @param {String} [props.defaultTdClassName] - Classes for the table td
 * @param {ReactNode} [props.pagination] - Optional pagination component to render at the bottom
 */
export default function DataTable({
  columns = [],
  data = [],
  keyField = 'id',
  emptyMessage = 'No records found.',
  isLoading = false,
  containerClassName = 'bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col',
  tableWrapperClassName = 'overflow-y-auto flex-1 custom-scrollbar',
  tableClassName = 'w-full text-left text-sm border-collapse',
  theadClassName = 'bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px] sticky top-0 z-10',
  defaultThClassName = 'px-6 py-4 bg-slate-50',
  tbodyClassName = 'divide-y divide-slate-100',
  trClassName = 'hover:bg-slate-50/75 transition-colors',
  defaultTdClassName = 'px-6 py-4',
  pagination = null,
}) {
  return (
    <div className={containerClassName}>
      <div className={tableWrapperClassName}>
        <table className={tableClassName}>
          <thead>
            <tr className={theadClassName}>
              {columns.map((col, idx) => {
                const colKey = col.key || col.accessor || String(idx);
                return (
                  <th
                    key={colKey}
                    className={col.headerClassName || defaultThClassName}
                  >
                    {col.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className={tbodyClassName}>
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length || 1}
                  className="px-6 py-12 text-center text-slate-400 text-sm"
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5 text-indigo-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Loading data...
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length || 1}
                  className="px-6 py-12 text-center text-slate-400 italic text-sm"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => {
                const rowKey =
                  keyField && row[keyField] !== undefined
                    ? row[keyField]
                    : rowIndex;
                return (
                  <tr
                    key={rowKey}
                    className={
                      typeof trClassName === 'function'
                        ? trClassName(row, rowIndex)
                        : trClassName
                    }
                  >
                    {columns.map((col, colIdx) => {
                      const colKey = col.key || col.accessor || String(colIdx);
                      const computedClassName =
                        typeof col.className === 'function'
                          ? col.className(row, rowIndex)
                          : col.className || defaultTdClassName;

                      return (
                        <td key={colKey} className={computedClassName}>
                          {col.render
                            ? col.render(row, rowIndex)
                            : row[col.accessor]}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {pagination && (
        <div className="border-t border-slate-200">{pagination}</div>
      )}
    </div>
  );
}
