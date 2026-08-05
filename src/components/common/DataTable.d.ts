import React from 'react';

export interface DataTableColumn {
  header: React.ReactNode;
  accessor?: string;
  key?: string;
  render?: (row: any, rowIndex: number) => React.ReactNode;
  className?: string | ((row: any, rowIndex: number) => string);
  headerClassName?: string;
}

export interface DataTableProps {
  columns: DataTableColumn[];
  data: any[];
  keyField?: string;
  emptyMessage?: React.ReactNode;
  isLoading?: boolean;
  containerClassName?: string;
  tableWrapperClassName?: string;
  /** Ref forwarded to the inner overflow-auto scroll wrapper div */
  tableWrapperRef?:
    React.Ref<HTMLDivElement> | React.MutableRefObject<HTMLDivElement | null>;
  tableClassName?: string;
  theadClassName?: string;
  defaultThClassName?: string;
  tbodyClassName?: string;
  trClassName?: string | ((row: any, rowIndex: number) => string);
  defaultTdClassName?: string;
  pagination?: React.ReactNode;
  [key: string]: any;
}

declare const DataTable: React.FC<DataTableProps>;
export default DataTable;
