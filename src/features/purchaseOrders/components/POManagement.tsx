import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setPurchaseOrdersList } from '../store/purchaseOrderSlice';

import {
  Search,
  Filter,
  Plus,
  FileSpreadsheet,
  FileUp,
  Download,
  Eye,
  Calendar,
  Layers,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  Clock,
  Mail,
  Sparkles,
  Send,
  X,
  Check,
  FileText,
  ChevronRight,
  ArrowRight,
  Trash,
  RefreshCw,
  CalendarDays,
  Upload,
  DollarSign,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Copy,
  Info,
  ExternalLink,
  Loader2,
  Reply,
  ChevronUp,
  ChevronDown,
  Pencil,
  Paperclip,
  Package,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { Tooltip } from 'react-tooltip';
import InfiniteScrollDropdown from '../../../components/InfiniteScrollDropdown';
import { compressImageIfNeeded } from '../../../utils/imageCompression';
import {
  PurchaseOrder,
  Vendor,
  Comment,
  EmailLog,
  UserRole,
} from '../../../types';
import { useCRM } from '../../../hooks/useCRM';
import {
  updatePOLeadTime,
  exportPurchaseOrdersCSV,
  exportPurchaseOrderCSV,
  getPurchaseOrders,
  postPOComment,
  getPurchaseOrderById,
  syncPurchaseOrders,
  syncSinglePurchaseOrder,
  updatePOComment,
  deletePOComment,
  deletePOCommentAttachment,
  getItemComments,
  postItemComment,
  updateItemComment,
  deleteItemComment,
  deleteItemCommentAttachment,
  updatePurchaseOrder,
  patchPurchaseOrder,
  updatePOStatus,
  updatePODelayReason,
  updatePurchaseOrderItemQuantity,
} from '../services/purchaseOrder.service';
import {
  getTagUsers,
  User,
} from '../../../features/users/services/user.service';
import Pagination from '../../../components/common/Pagination';
import TableLoader from '../../../components/common/TableLoader';
import FullPageLoader from '../../../components/common/FullPageLoader';
import ItemCommentModal from '../../../components/ItemCommentModal';
import ConfirmDeleteModal from '../../../components/common/ConfirmDeleteModal';
import VendorInfiniteDropdown from '../../../components/common/VendorInfiniteDropdown';
import CustomerDropdown from '../../../components/common/CustomerDropdown';
import ChannelDropdown from '../../../components/common/ChannelDropdown';
import DataTable from '../../../components/common/DataTable';
import SellerCloudSyncLoading from '../../../components/common/SellerCloudSyncLoading';
import DateFilterInput from '../../../components/common/DateFilterInput';
import ContainerDetailsModal from '../../../features/containers/components/ContainerDetailsModal';
import { getContainerDetails } from '../../../features/containers/services/container.service';
import ColumnsDropdown from '../../../components/common/ColumnsDropdown';
import {
  useColumnVisibility,
  ColumnDef,
} from '../../../hooks/useColumnVisibility';
import ImagePreviewModal from '../../../components/common/ImagePreviewModal';

const PO_COLUMN_DEFS: ColumnDef[] = [
  { key: 'id', label: 'PO Number' },
  { key: 'orderId', label: 'Order Id' },
  { key: 'channel_order_id', label: 'Channel ID' },
  { key: 'status', label: 'Status' },
  { key: 'delay_reason', label: 'Reason for Delayed' },
  { key: 'commentsCount', label: 'Comments' },
  { key: 'creationDate', label: 'Order Date' },
  { key: 'vendorName', label: 'Vendor' },
  { key: 'customerName', label: 'Customer Name' },
  { key: 'warehouseName', label: 'Warehouse' },
  { key: 'items', label: 'PO Items' },
  { key: 'orderedQty', label: 'Ordered / Received Qty' },
  { key: 'invoiceDelayStatus', label: 'Approved PO' },
  { key: 'expected_delivery_date', label: 'ETA Delivery' },
  { key: 'containerIds', label: 'Containers' },
  { key: 'actions', label: 'Actions', locked: true },
];

interface DataTableProps {
  columns: any[];
  data: any[];
  keyField?: string;
  emptyMessage?: React.ReactNode;
  isLoading?: boolean;
  containerClassName?: string;
  tableWrapperClassName?: string;
  tableWrapperRef?: React.Ref<HTMLDivElement>;
  tableClassName?: string;
  theadClassName?: string;
  defaultThClassName?: string;
  tbodyClassName?: string;
  trClassName?: string | ((row: any, rowIndex: number) => string);
  defaultTdClassName?: string;
  pagination?: React.ReactNode;
}
const TypedDataTable = DataTable as React.FC<DataTableProps>;

const ReasonCell = ({
  po,
  onSave,
  autoOpen,
  onClearAutoOpen,
}: {
  po: any;
  onSave: (poId: string, value: string) => void;
  autoOpen?: boolean;
  onClearAutoOpen?: () => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const currentReason = po.delay_reason || po.reason || '';

  const isDelayed =
    String(po.status || '')
      .trim()
      .toUpperCase() === 'DELAYED';
  const [text, setText] = useState(currentReason);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    top: number | 'auto';
    left: number | 'auto';
    bottom: number | 'auto';
    right: number | 'auto';
  }>({
    top: 0,
    left: 0,
    bottom: 'auto',
    right: 'auto',
  });

  useEffect(() => {
    if (!isEditing) {
      setText(currentReason);
    }
  }, [currentReason, isEditing]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsEditing(false);
        setText(currentReason);
      }
    };
    if (isEditing) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing, currentReason]);

  const toggleEdit = (e?: any) => {
    e?.stopPropagation?.();
    if (!isEditing && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const popoverHeight = 180; // approximate
      const popoverWidth = 280; // fixed width

      const spaceBelow = window.innerHeight - rect.bottom;
      let top: number | 'auto' = rect.bottom + 4;
      let bottom: number | 'auto' = 'auto';

      if (spaceBelow < popoverHeight && rect.top > popoverHeight) {
        top = 'auto';
        bottom = window.innerHeight - rect.top + 4;
      }

      let left: number | 'auto' = rect.left;
      let right: number | 'auto' = 'auto';

      if (rect.left + popoverWidth > window.innerWidth) {
        left = 'auto';
        right = window.innerWidth - rect.right;
      }

      setCoords({ top, left, bottom, right });
    }
    setIsEditing(!isEditing);
  };

  useEffect(() => {
    if (autoOpen && !isEditing) {
      toggleEdit();
      onClearAutoOpen?.();
    }
  }, [autoOpen, isEditing, onClearAutoOpen]);

  const handleSave = (e?: any) => {
    e?.stopPropagation();
    onSave(po.id, text);
    setIsEditing(false);
  };

  const handleCancel = (e?: any) => {
    e?.stopPropagation();
    setIsEditing(false);
    setText(currentReason);
  };

  return (
    <>
      <div
        ref={containerRef}
        className="group/reason flex max-w-[150px] items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <span
          className="truncate text-[11px] text-slate-600"
          title={currentReason}
        >
          {currentReason}
        </span>
        {!currentReason ? (
          isDelayed ? (
            <button
              onClick={toggleEdit}
              className="hover:text-mc-black ml-1 px-1 text-slate-300 transition-colors"
              title="Add Reason"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          ) : (
            <span className="ml-1 px-1 text-slate-300">-</span>
          )
        ) : isDelayed ? (
          <button
            onClick={toggleEdit}
            className="hover:text-mc-black ml-1 px-1 text-slate-400 transition-colors"
            title="Edit Reason"
          >
            <Pencil className="h-3 w-3" />
          </button>
        ) : null}
      </div>

      {isEditing &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              bottom: coords.bottom,
              right: coords.right,
              zIndex: 9999,
              width: 280,
            }}
            className="animate-in fade-in zoom-in-95 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <textarea
              autoFocus
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter reason..."
              className="focus:border-mc-black w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-700 outline-hidden transition-colors focus:bg-white"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancel}
                className="rounded-md px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-mc-black flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-black"
              >
                <Check className="h-3.5 w-3.5" /> Save
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

const VendorStatusDropdown = ({
  poId,
  currentStatus,
  onUpdate,
}: {
  poId: string;
  currentStatus: string;
  onUpdate: (poId: string, status: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    top: number | 'auto';
    left: number;
    width: number;
    bottom: number | 'auto';
  }>({
    top: 0,
    left: 0,
    width: 0,
    bottom: 'auto',
  });

  const toggleDropdown = (e: any) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 250; // Approximating max height of dropdown
      const spaceBelow = window.innerHeight - rect.bottom;

      let top: number | 'auto' = rect.bottom + 4;
      let bottom: number | 'auto' = 'auto';

      if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
        top = 'auto';
        bottom = window.innerHeight - rect.top + 4;
      }

      setCoords({
        top,
        left: rect.left,
        width: rect.width,
        bottom,
      });
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const statuses = [
    'NOT_STARTED',
    'IN_PRODUCTION',
    'DELAYED',
    'COMPLETED',
    'NOT_PLANNED',
    'PLANNED',
    'PARTIALLY_SHIPPED',
    'SHIPPED',
  ];

  const displayStatus =
    !currentStatus || currentStatus === 'N/A' ? 'NOT_STARTED' : currentStatus;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        className="hover:border-mc-gold focus:border-mc-gold flex w-full cursor-pointer items-center justify-between rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 transition-colors outline-none focus:outline-none"
      >
        <span className="truncate">{displayStatus.replace(/_/g, ' ')}</span>
        <ChevronDown
          className={`h-3 w-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: coords.top,
              bottom: coords.bottom,
              left: coords.left,
              width: coords.width,
            }}
            className="z-[9999] max-h-60 overflow-hidden overflow-y-auto rounded-md border border-slate-200 bg-white text-xs shadow-lg"
          >
            {statuses.map((s) => {
              const isDisabled = s === 'PARTIALLY_SHIPPED' || s === 'SHIPPED';
              return (
                <button
                  key={s}
                  disabled={isDisabled}
                  className={`w-full px-3 py-2 text-left transition-colors ${
                    isDisabled
                      ? 'cursor-not-allowed text-slate-400 opacity-50'
                      : ''
                  } ${
                    !isDisabled && displayStatus === s
                      ? 'text-mc-black bg-slate-100/50 font-bold'
                      : !isDisabled
                        ? 'font-medium text-slate-700 hover:bg-slate-50'
                        : ''
                  }`}
                  onClick={(e: any) => {
                    if (isDisabled) return;
                    e.stopPropagation();
                    onUpdate(poId, s);
                    setIsOpen(false);
                  }}
                >
                  {s.replace(/_/g, ' ')}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
};

const StatusFilterDropdown = ({
  currentStatus,
  onChange,
}: {
  currentStatus: string;
  onChange: (status: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    top: number | 'auto';
    left: number;
    width: number;
    bottom: number | 'auto';
  }>({
    top: 0,
    left: 0,
    width: 0,
    bottom: 'auto',
  });

  const toggleDropdown = (e: any) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 280; // Approximating max height of dropdown
      const spaceBelow = window.innerHeight - rect.bottom;

      let top: number | 'auto' = rect.bottom + 4;
      let bottom: number | 'auto' = 'auto';

      if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
        top = 'auto';
        bottom = window.innerHeight - rect.top + 4;
      }

      setCoords({
        top,
        left: rect.left,
        width: rect.width,
        bottom,
      });
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const statuses = [
    'all',
    'NOT_STARTED',
    'IN_PRODUCTION',
    'DELAYED',
    'COMPLETED',
    'NOT_PLANNED',
    'PLANNED',
    'PARTIALLY_SHIPPED',
    'SHIPPED',
  ];

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        className="border-mc-beige-dark bg-mc-white text-mc-black focus:border-mc-gold focus:ring-mc-gold flex w-full cursor-pointer items-center justify-between rounded-lg border p-2 text-xs transition-colors focus:ring-1 focus:outline-none"
      >
        <span className="truncate">
          {currentStatus === 'all'
            ? 'All Statuses'
            : currentStatus.replace(/_/g, ' ')}
        </span>
        {currentStatus !== 'all' ? (
          <X
            className="h-4 w-4 shrink-0 text-slate-400 transition-colors hover:text-red-500"
            onClick={(e) => {
              e.stopPropagation();
              onChange('all');
              setIsOpen(false);
            }}
          />
        ) : (
          <ChevronDown
            className={`text-mc-gray-soft h-3.5 w-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        )}
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: coords.top,
              bottom: coords.bottom,
              left: coords.left,
              width: coords.width,
            }}
            className="z-[9999] max-h-60 overflow-hidden overflow-y-auto rounded-md border border-slate-200 bg-white text-xs shadow-lg"
          >
            {statuses.map((s) => (
              <button
                key={s}
                className={`w-full px-3 py-2 text-left transition-colors ${
                  currentStatus === s
                    ? 'text-mc-black bg-slate-100/50 font-bold'
                    : 'font-medium text-slate-700 hover:bg-slate-50'
                }`}
                onClick={(e: any) => {
                  e.stopPropagation();
                  onChange(s);
                  setIsOpen(false);
                }}
              >
                {s === 'all' ? 'All Statuses' : s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
};

const ApprovedStatusFilterDropdown = ({
  currentStatus,
  onChange,
}: {
  currentStatus: string;
  onChange: (status: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    top: number | 'auto';
    left: number;
    width: number;
    bottom: number | 'auto';
  }>({
    top: 0,
    left: 0,
    width: 0,
    bottom: 'auto',
  });

  const toggleDropdown = (e: any) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 160;
      const spaceBelow = window.innerHeight - rect.bottom;

      let top: number | 'auto' = rect.bottom + 4;
      let bottom: number | 'auto' = 'auto';

      if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
        top = 'auto';
        bottom = window.innerHeight - rect.top + 4;
      }

      setCoords({
        top,
        left: rect.left,
        width: rect.width,
        bottom,
      });
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const statuses = [
    { value: 'all', label: 'All Approved Status' },
    { value: 'ontime', label: 'On Time' },
    { value: 'pending', label: 'Pending' },
    { value: 'delayed', label: 'Delayed' },
  ];

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        className="border-mc-beige-dark bg-mc-white text-mc-black focus:border-mc-gold focus:ring-mc-gold flex w-full cursor-pointer items-center justify-between rounded-lg border p-2 text-xs transition-colors focus:ring-1 focus:outline-none"
      >
        <span className="truncate">
          {statuses.find((s) => s.value === currentStatus)?.label || 'All'}
        </span>
        {currentStatus !== 'all' ? (
          <X
            className="h-4 w-4 shrink-0 text-slate-400 transition-colors hover:text-red-500"
            onClick={(e) => {
              e.stopPropagation();
              onChange('all');
              setIsOpen(false);
            }}
          />
        ) : (
          <ChevronDown
            className={`text-mc-gray-soft h-3.5 w-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        )}
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: coords.top,
              bottom: coords.bottom,
              left: coords.left,
              width: coords.width,
            }}
            className="z-[9999] max-h-60 overflow-hidden overflow-y-auto rounded-md border border-slate-200 bg-white text-xs shadow-lg"
          >
            {statuses.map((s) => (
              <button
                key={s.value}
                className={`w-full px-3 py-2 text-left transition-colors ${
                  currentStatus === s.value
                    ? 'text-mc-black bg-slate-100/50 font-bold'
                    : 'font-medium text-slate-700 hover:bg-slate-50'
                }`}
                onClick={(e: any) => {
                  e.stopPropagation();
                  onChange(s.value);
                  setIsOpen(false);
                }}
              >
                {s.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
};

const CompletionFilterDropdown = ({
  currentStatus,
  onChange,
}: {
  currentStatus: string;
  onChange: (status: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    top: number | 'auto';
    left: number;
    width: number;
    bottom: number | 'auto';
  }>({
    top: 0,
    left: 0,
    width: 0,
    bottom: 'auto',
  });

  const toggleDropdown = (e: any) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 120; // Approximating max height of dropdown
      const spaceBelow = window.innerHeight - rect.bottom;

      let top: number | 'auto' = rect.bottom + 4;
      let bottom: number | 'auto' = 'auto';

      if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
        top = 'auto';
        bottom = window.innerHeight - rect.top + 4;
      }

      setCoords({
        top,
        left: rect.left,
        width: rect.width,
        bottom,
      });
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const statuses = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'Open PO' },
    { value: 'closed', label: 'Closed PO' },
  ];

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        className="border-mc-beige-dark bg-mc-white text-mc-black focus:border-mc-gold focus:ring-mc-gold flex w-full cursor-pointer items-center justify-between rounded-lg border p-2 text-xs transition-colors focus:ring-1 focus:outline-none"
      >
        <span className="truncate">
          {statuses.find((s) => s.value === currentStatus)?.label || 'All'}
        </span>
        {currentStatus !== 'all' ? (
          <X
            className="h-4 w-4 shrink-0 text-slate-400 transition-colors hover:text-red-500"
            onClick={(e) => {
              e.stopPropagation();
              onChange('all');
              setIsOpen(false);
            }}
          />
        ) : (
          <ChevronDown
            className={`text-mc-gray-soft h-3.5 w-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        )}
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: coords.top,
              bottom: coords.bottom,
              left: coords.left,
              width: coords.width,
            }}
            className="z-[9999] max-h-60 overflow-hidden overflow-y-auto rounded-md border border-slate-200 bg-white text-xs shadow-lg"
          >
            {statuses.map((s) => (
              <button
                key={s.value}
                className={`w-full px-3 py-2 text-left transition-colors ${
                  currentStatus === s.value
                    ? 'text-mc-black bg-slate-100/50 font-bold'
                    : 'font-medium text-slate-700 hover:bg-slate-50'
                }`}
                onClick={(e: any) => {
                  e.stopPropagation();
                  onChange(s.value);
                  setIsOpen(false);
                }}
              >
                {s.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
};

const highlightText = (
  text: string | number | undefined | null,
  query: string | undefined | null,
) => {
  if (!query || !query.trim() || text === undefined || text === null) {
    return <>{text}</>;
  }
  const safeText = String(text);
  const activeQuery = query.trim();
  const regex = new RegExp(
    `(${activeQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
    'gi',
  );
  const parts = safeText.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === activeQuery.toLowerCase() ? (
          <mark
            key={i}
            className="rounded-sm bg-yellow-200 px-0.5 font-bold text-slate-800"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
};

interface POManagementProps {
  loading?: boolean;
  purchaseOrders: PurchaseOrder[];
  vendors: Vendor[];
  comments: Comment[];
  emails: EmailLog[];
  userRole: UserRole;
  selectedPOId: string | null;
  onSelectPO: (poId: string | null) => void;
  onUpdatePO: (updated: PurchaseOrder) => void;
  onAddComment: (comment: Comment) => void;
  onAddEmailLog: (email: EmailLog) => void;
  onAddActivity: (
    msg: string,
    type: 'PO Updated' | 'Email Sent' | 'Invoice Uploaded' | 'Vendor Comment',
  ) => void;
  onRefreshData?: () => void;
  onAddAudit: (
    poId: string,
    action: string,
    prev: string,
    next: string,
    browser?: string,
    ip?: string,
  ) => void;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  totalCount?: number;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (val: string) => void;
  approvedStatusFilter?: string;
  onApprovedStatusFilterChange?: (val: string) => void;
  completionFilter?: string;
  onCompletionFilterChange?: (val: string) => void;
  vendorFilter?: string;
  onVendorFilterChange?: (val: string) => void;
  customerFilter?: string;
  onCustomerFilterChange?: (val: string) => void;
  channelFilter?: string;
  onChannelFilterChange?: (val: string) => void;
  dateFrom?: string;
  onDateFromChange?: (val: string) => void;
  dateTo?: string;
  onDateToChange?: (val: string) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  sortConfig?: { key: string | null; direction: 'asc' | 'desc' | null };
  onSortChange?: (key: string | null, direction: 'asc' | 'desc' | null) => void;
  activeSubTab?: 'grid' | 'kanban' | 'calendar';
  onActiveSubTabChange?: (tab: 'grid' | 'kanban' | 'calendar') => void;
}

const InlineQtyEditor = ({ item, initialQty, poId, onSave, userRole }: any) => {
  const [val, setVal] = useState(initialQty);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state if initialQty changes from outside (e.g., successful refresh)
  useEffect(() => {
    setVal(initialQty);
  }, [initialQty]);

  const handleSave = async (e: any) => {
    e.stopPropagation();
    if (Number(val) === Number(initialQty) || val === '') {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);

    const resolvedId =
      item.item_id ||
      item.uuid ||
      item.id ||
      item.po_item_id ||
      item.poItemId ||
      item.sku;

    try {
      await onSave(resolvedId, Number(val));
      setIsEditing(false);
    } catch {
      setVal(initialQty);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = (e: any) => {
    e.stopPropagation();
    setVal(initialQty);
    setIsEditing(false);
  };

  const canEdit =
    String(userRole).toLowerCase() === 'administrator' ||
    String(userRole).toLowerCase() === 'office';

  if (!isEditing || !canEdit) {
    return (
      <div
        className="group flex items-center justify-end gap-2"
        onClick={(e) => (canEdit ? e.stopPropagation() : undefined)}
      >
        <span className="font-mono font-medium">
          {Number(initialQty).toLocaleString()}
        </span>
        {canEdit && (
          <button
            title="Edit Ordered Quantity"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="hover:text-mc-black text-slate-300 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-end gap-1.5"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="number"
        value={val}
        autoFocus
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave(e);
          if (e.key === 'Escape') handleCancel(e);
        }}
        className="focus:border-mc-black focus:ring-mc-black w-[60px] rounded border border-slate-200 bg-white px-1.5 py-1 text-right font-mono text-[11px] font-bold text-slate-800 transition focus:ring-1 focus:outline-none"
        min="0"
      />
      <div className="flex gap-1">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-mc-gold rounded px-2 py-1 text-[10px] font-bold text-white shadow-sm transition hover:bg-yellow-600 disabled:opacity-50"
        >
          {isSaving ? '...' : 'Save'}
        </button>
        <button
          onClick={handleCancel}
          disabled={isSaving}
          className="rounded bg-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 shadow-sm transition hover:bg-slate-300 disabled:opacity-50"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};

export default function POManagement({
  loading = false,
  purchaseOrders: propPurchaseOrders,
  vendors,
  comments,
  emails,
  userRole,
  selectedPOId,
  onSelectPO,
  onUpdatePO,
  onAddComment,
  onAddEmailLog,
  onAddActivity,
  onRefreshData,
  onAddAudit,
  currentPage: propCurrentPage,
  onPageChange: propOnPageChange,
  totalCount: propTotalCount,
  searchQuery: propSearchQuery,
  onSearchChange: propOnSearchChange,
  statusFilter: propStatusFilter,
  onStatusFilterChange: propOnStatusFilterChange,
  approvedStatusFilter: propApprovedStatusFilter,
  onApprovedStatusFilterChange: propOnApprovedStatusFilterChange,
  completionFilter: propCompletionFilter,
  onCompletionFilterChange: propOnCompletionFilterChange,
  vendorFilter: propVendorFilter,
  onVendorFilterChange: propOnVendorFilterChange,
  customerFilter: propCustomerFilter,
  onCustomerFilterChange: propOnCustomerFilterChange,
  channelFilter: propChannelFilter,
  onChannelFilterChange: propOnChannelFilterChange,
  dateFrom: propDateFrom,
  onDateFromChange: propOnDateFromChange,
  dateTo: propDateTo,
  onDateToChange: propOnDateToChange,
  pageSize: propPageSize,
  onPageSizeChange: propOnPageSizeChange,
  sortConfig: propSortConfig,
  onSortChange: propOnSortChange,
  activeSubTab: propActiveSubTab,
  onActiveSubTabChange: propOnActiveSubTabChange,
}: POManagementProps) {
  const reduxPOs = useSelector((state: any) => state.purchaseOrders.list);
  const kanbanList = useSelector(
    (state: any) => state.purchaseOrders.kanbanList || {},
  );
  const dispatch = useDispatch();
  const { user: currentUser } = useCRM();
  const isVendor =
    currentUser?.role === 'Vendor' ||
    localStorage.getItem('userRole') === 'Vendor';

  const {
    isVisible: isPOColumnVisible,
    toggleColumn: togglePOColumn,
    saveVisibility: savePOColumnVisibility,
    saving: savingPOColumns,
  } = useColumnVisibility('po', PO_COLUMN_DEFS, currentUser?.id);

  const purchaseOrders = reduxPOs || [];
  const [autoOpenPOId, setAutoOpenPOId] = useState<string | null>(null);

  // Navigation inside PO module
  const [localActiveSubTab, setLocalActiveSubTab] = useState<
    'grid' | 'kanban' | 'calendar'
  >('grid');

  const activeSubTab =
    propActiveSubTab !== undefined ? propActiveSubTab : localActiveSubTab;
  const setActiveSubTab = propOnActiveSubTabChange || setLocalActiveSubTab;

  // Filtering and Searching
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [localStatusFilter, setLocalStatusFilter] = useState<string>('all');
  const [localApprovedStatusFilter, setLocalApprovedStatusFilter] =
    useState<string>('all');
  const [localCompletionFilter, setLocalCompletionFilter] =
    useState<string>('all');
  const [localVendorFilter, setLocalVendorFilter] = useState<string>('all');
  const [localCustomerFilter, setLocalCustomerFilter] = useState<string>('all');
  const [localChannelFilter, setLocalChannelFilter] = useState<string>('all');
  const [leadTimeDays, setLeadTimeDays] = useState<string>('');

  // Comments state fetched from detail API
  const [fetchedComments, setFetchedComments] = useState<Comment[]>([]);
  const [deleteCommentTarget, setDeleteCommentTarget] = useState<{
    type: 'comment' | 'attachment';
    commentId: string;
    attachmentId?: string | null;
  } | null>(null);
  const [isDeletingComment, setIsDeletingComment] = useState(false);
  const [detailedPOItems, setDetailedPOItems] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingPOIds, setSyncingPOIds] = useState<Set<string>>(new Set());
  const [isCommentOnlyView, setIsCommentOnlyView] = useState(false);
  const [commentScope, setCommentScope] = useState<'po' | 'sku'>('po');
  const [selectedSkuId, setSelectedSkuId] = useState<string | null>(null);
  const [fetchedSkuComments, setFetchedSkuComments] = useState<any[]>([]);
  const [isLoadingSkuComments, setIsLoadingSkuComments] = useState(false);
  const [isScopeDropdownOpen, setIsScopeDropdownOpen] = useState(false);

  // Reply State
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
  const [replyToUser, setReplyToUser] = useState<string | null>(null);
  const [replyToText, setReplyToText] = useState<string | null>(null);

  // Tree Collapse State
  const [collapsedComments, setCollapsedComments] = useState<
    Record<string, boolean>
  >({});

  // Editing Comment State
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState<string>('');
  const [editingCommentFiles, setEditingCommentFiles] = useState<File[]>([]);
  const [highlightedCommentId, setHighlightedCommentId] = useState<
    string | null
  >(null);
  const [isLocatingComment, setIsLocatingComment] = useState(
    typeof window !== 'undefined' &&
      window.location.search.includes('comment_id'),
  );

  // Mention Tagging State
  const [tagUsers, setTagUsers] = useState<any[]>([]);
  const [isFetchingTagUsers, setIsFetchingTagUsers] = useState(false);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionHighlightIndex, setMentionHighlightIndex] = useState(0);
  const [taggedUserMap, setTaggedUserMap] = useState<Record<string, string>>(
    {},
  );

  // Item Comments Modal
  const [selectedItemForComments, setSelectedItemForComments] =
    useState<any>(null);
  const [deepLinkItemId, setDeepLinkItemId] = useState<string | null>(null);

  useEffect(() => {
    // Eagerly fetch tag users for proper ID mapping during edits
    if (tagUsers.length === 0 && !isFetchingTagUsers) {
      setIsFetchingTagUsers(true);
      getTagUsers()
        .then((users) => setTagUsers(Array.isArray(users) ? users : []))
        .catch(() => {})
        .finally(() => setIsFetchingTagUsers(false));
    }
  }, []);

  useEffect(() => {
    if (deepLinkItemId) {
      let foundItem = null;

      // Try scanning detailedPOItems first
      if (detailedPOItems && detailedPOItems.length > 0) {
        foundItem = detailedPOItems.find(
          (i) =>
            String(i.id) === deepLinkItemId ||
            String(i.sellercloud_item_id) === deepLinkItemId ||
            String(i.sku) === deepLinkItemId,
        );
      }

      // If not found in detailed yet, try checking the global purchaseOrders
      if (!foundItem && purchaseOrders) {
        for (const po of purchaseOrders) {
          if (po.items && Array.isArray(po.items)) {
            const match = po.items.find(
              (i: any) =>
                String(i.id) === deepLinkItemId ||
                String(i.sellercloud_item_id) === deepLinkItemId ||
                String(i.sku) === deepLinkItemId,
            );
            if (match) {
              foundItem = match;
              break;
            }
          }
        }
      }

      if (foundItem) {
        setSelectedItemForComments(foundItem);
        setDeepLinkItemId(null);
      } else if (detailedPOItems && detailedPOItems.length > 0) {
        // Only fallback if detailed items have loaded and it's STILL not found
        setSelectedItemForComments({
          id: deepLinkItemId,
          sku: 'Unknown SKU',
          name: 'Details Not Found',
        });
        setDeepLinkItemId(null);
      }
    }
  }, [deepLinkItemId, detailedPOItems, purchaseOrders]);

  // Container Details Modal
  const [viewingContainerDetails, setViewingContainerDetails] =
    useState<any>(null);
  const [isContainerModalLoading, setIsContainerModalLoading] = useState(false);
  // Track which PO rows have their container list fully expanded
  const [expandedContainerRows, setExpandedContainerRows] = useState<
    Set<string>
  >(new Set());

  // Track which Kanban cards are expanded
  const [expandedKanbanCards, setExpandedKanbanCards] = useState<Set<string>>(
    new Set(),
  );

  const handleOpenContainerDetails = async (
    containerId: string,
    customName?: string,
  ) => {
    setIsContainerModalLoading(true);
    try {
      // Create a mock object so the modal opens immediately with loading state (optional)
      setViewingContainerDetails({
        name: customName || containerId,
        id: containerId,
      });

      const rawResp = await getContainerDetails(containerId);
      const detailsResp = Array.isArray(rawResp) ? rawResp[0] : rawResp;

      const rawDetails = detailsResp?.details || detailsResp?.items || [];
      const safeDetails = Array.isArray(rawDetails) ? rawDetails : [];

      const finalName =
        detailsResp?.container_name ||
        detailsResp?.name ||
        customName ||
        containerId;

      setViewingContainerDetails({
        id: containerId,
        ...detailsResp,
        name: finalName,
        details: safeDetails,
      });
    } catch (err) {
      console.error('Failed to load container details:', err);
      toast.error(`Could not load details for container ${containerId}`);
      setViewingContainerDetails(null);
    } finally {
      setIsContainerModalLoading(false);
    }
  };

  useEffect(() => {
    const handleOpenItemComments = (e: any) => {
      setSelectedItemForComments(e.detail);
    };
    window.addEventListener('open-item-comments', handleOpenItemComments);
    return () =>
      window.removeEventListener('open-item-comments', handleOpenItemComments);
  }, []);

  useEffect(() => {
    // Tag users are fetched lazily when @ is typed — no pre-fetch needed
  }, []);

  const [showSyncMenu, setShowSyncMenu] = useState(false);
  const syncMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (
        syncMenuRef.current &&
        !syncMenuRef.current.contains(e.target as Node)
      ) {
        setShowSyncMenu(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const handleSyncSellerCloud = async (days: string = '25') => {
    setShowSyncMenu(false);
    try {
      setIsSyncing(true);
      await syncPurchaseOrders(days);
      toast.success(
        days === 'all'
          ? 'Successfully synced all POs from SellerCloud!'
          : `Successfully synced POs for the past ${days} days from SellerCloud!`,
      );
    } catch (error) {
      console.error('Error syncing POs:', error);
      toast.error('Failed to sync POs from SellerCloud.');
    } finally {
      setIsSyncing(false);
    }
  };

  const [manualPoInput, setManualPoInput] = useState('');
  const [isSyncingManualPO, setIsSyncingManualPO] = useState(false);

  const handleManualPOSync = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    const cleanId = manualPoInput.trim().replace(/^P[O0]-/i, '');
    if (!cleanId) {
      toast.error('Please enter a valid PO number.');
      return;
    }

    if (isSyncingManualPO) return;

    setIsSyncingManualPO(true);
    try {
      await syncSinglePurchaseOrder(cleanId);

      // Only call GET single PO API with no parameters
      const detailData: any = await getPurchaseOrderById(cleanId);
      if (detailData) {
        const vendor = vendors.find((v: any) => v.id === detailData.vendor_id);
        const vendorName =
          detailData.vendor?.name ||
          vendor?.name ||
          detailData.vendor_name ||
          'N/A';

        const orderedQty = detailData.items
          ? detailData.items.reduce(
              (sum: number, item: any) =>
                sum + (item.qty_ordered ?? item.qty ?? 0),
              0,
            )
          : detailData.total_qty_ordered || 0;

        const receivedQty = detailData.items
          ? detailData.items.reduce(
              (sum: number, item: any) =>
                sum +
                (item.qty_received ??
                  item.receivedQty ??
                  item.received_qty ??
                  0),
              0,
            )
          : detailData.total_qty_received || 0;

        let eta = 'N/A';
        const leadDays =
          detailData.container_lead_time_days ||
          detailData.containerLeadTimeDays;
        if (detailData.invoice_date && leadDays) {
          const invoiceDate = new Date(detailData.invoice_date);
          invoiceDate.setDate(invoiceDate.getDate() + Number(leadDays));
          eta = invoiceDate.toISOString().split('T')[0];
        } else if (detailData.expected_delivery_date) {
          eta = String(detailData.expected_delivery_date).split('T')[0];
        }

        const rawOrderDate = detailData.date_ordered || detailData.created_on;
        const creationDate = rawOrderDate
          ? String(rawOrderDate).split('T')[0]
          : 'N/A';

        const mappedPO: any = {
          id: detailData.sellercloud_po_id
            ? `PO-${detailData.sellercloud_po_id}`
            : detailData.id || `PO-${cleanId}`,
          uuid: detailData.id,
          orderId: detailData.order_number || detailData.orderId || 'N/A',
          channel_order_id: detailData.channel_order_id || 'N/A',
          vendorId: detailData.vendor_id || 'N/A',
          vendorName,
          companyName:
            detailData.company_name ||
            detailData.company?.name ||
            detailData.companyName ||
            '-',
          customer: detailData.customer || null,
          customerName:
            detailData.first_name || detailData.customerName || null,
          warehouseName:
            detailData.warehouse?.name ||
            detailData.warehouse_name ||
            detailData.warehouse ||
            'N/A',
          status: detailData.status_label || detailData.status || 'N/A',
          productionStage: detailData.productionStage || 'Materials',
          orderedQty,
          receivedQty,
          total_item_count:
            detailData.total_item_count ??
            (detailData.items ? detailData.items.length : 0),
          total_qty_ordered: detailData.total_qty_ordered ?? orderedQty,
          total_qty_received: detailData.total_qty_received ?? receivedQty,
          total_qty_remaining: detailData.total_qty_remaining,
          container: detailData.container || 'N/A',
          containers: detailData.containers || [],
          containerNames: detailData.container_names || [],
          containerIds:
            detailData.container_ids || detailData.container_names || [],
          invoiceStatus:
            detailData.invoice_status || detailData.invoiceStatus || 'Pending',
          invoiceFile: detailData.invoiceFile || null,
          invoiceDetails: detailData.invoiceDetails || null,
          eta,
          expected_delivery_date: eta,
          creationDate,
          containerLeadTimeDays: leadDays || null,
          delayedDays: detailData.delayedDays || 0,
          delay_reason: detailData.delay_reason || null,
          skus: detailData.items ? detailData.items.map((i: any) => i.sku) : [],
          items: detailData.items || [],
          commentsCount:
            detailData.total_comments_count ??
            detailData.commentsCount ??
            detailData.comments_count ??
            0,
          emailCount: detailData.emailCount || 0,
          sellercloud_link: detailData.sellercloud_link || null,
          delta_sellercloud_link: detailData.delta_sellercloud_link || null,
        };

        onUpdatePO(mappedPO);
      }

      toast.success('Purchase Order synced successfully.');
      onAddActivity?.(`Synced PO ${cleanId} from Sellercloud`, 'PO Updated');
      setManualPoInput('');
      setShowSyncMenu(false);
    } catch (err: any) {
      console.error('Failed to sync PO by number:', err);
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        err.message ||
        'Failed to sync Purchase Order.';
      toast.error(errorMsg);
    } finally {
      setIsSyncingManualPO(false);
    }
  };

  const handleSyncSinglePO = async (po: any) => {
    if (!po) return;
    const scPoId =
      po.sellercloud_po_id ||
      String(po.id || '')
        .replace(/^P[O0]-/i, '')
        .trim();

    if (!scPoId || scPoId === 'N/A') {
      toast.error('Sellercloud PO ID not found.');
      return;
    }

    const poKey = String(po.id || scPoId);
    if (syncingPOIds.has(poKey)) return;

    setSyncingPOIds((prev) => new Set(prev).add(poKey));
    try {
      await syncSinglePurchaseOrder(scPoId);

      // Only call GET single PO API with no parameters
      const detailData: any = await getPurchaseOrderById(scPoId);
      if (detailData) {
        const vendor = vendors.find(
          (v: any) => v.id === detailData.vendor_id || v.id === po.vendorId,
        );
        const vendorName =
          detailData.vendor?.name ||
          vendor?.name ||
          detailData.vendor_name ||
          po.vendorName ||
          'N/A';

        const orderedQty = detailData.items
          ? detailData.items.reduce(
              (sum: number, item: any) =>
                sum + (item.qty_ordered ?? item.qty ?? 0),
              0,
            )
          : detailData.total_qty_ordered || po.orderedQty || 0;

        const receivedQty = detailData.items
          ? detailData.items.reduce(
              (sum: number, item: any) =>
                sum +
                (item.qty_received ??
                  item.receivedQty ??
                  item.received_qty ??
                  0),
              0,
            )
          : detailData.total_qty_received || po.receivedQty || 0;

        let eta = po.eta || 'N/A';
        const leadDays =
          detailData.container_lead_time_days ||
          detailData.containerLeadTimeDays ||
          po.containerLeadTimeDays;
        if (detailData.invoice_date && leadDays) {
          const invoiceDate = new Date(detailData.invoice_date);
          invoiceDate.setDate(invoiceDate.getDate() + Number(leadDays));
          eta = invoiceDate.toISOString().split('T')[0];
        } else if (detailData.expected_delivery_date) {
          eta = String(detailData.expected_delivery_date).split('T')[0];
        }

        const rawOrderDate =
          detailData.date_ordered ||
          detailData.created_on ||
          po.creationDate;
        const creationDate = rawOrderDate
          ? String(rawOrderDate).split('T')[0]
          : po.creationDate || 'N/A';

        const updatedPO = {
          ...po,
          ...detailData,
          id: detailData.sellercloud_po_id
            ? `PO-${detailData.sellercloud_po_id}`
            : po.id,
          vendorName,
          orderedQty,
          receivedQty,
          status: detailData.status_label || detailData.status || po.status,
          total_item_count:
            detailData.total_item_count ??
            (detailData.items ? detailData.items.length : po.total_item_count),
          total_qty_ordered: detailData.total_qty_ordered ?? orderedQty,
          total_qty_received: detailData.total_qty_received ?? receivedQty,
          total_qty_remaining: detailData.total_qty_remaining,
          commentsCount:
            detailData.total_comments_count ??
            detailData.commentsCount ??
            po.commentsCount,
          eta,
          expected_delivery_date: eta,
          creationDate,
        };
        onUpdatePO(updatedPO);
      }

      toast.success('Purchase Order synced successfully.');
      onAddActivity?.(
        `Synced PO ${po.id || scPoId} from Sellercloud`,
        'PO Updated',
      );
    } catch (err: any) {
      console.error('Failed to sync single PO:', err);
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        err.message ||
        'Failed to sync Purchase Order.';
      toast.error(errorMsg);
    } finally {
      setSyncingPOIds((prev) => {
        const next = new Set(prev);
        next.delete(poKey);
        return next;
      });
    }
  };

  const forceDownload = async (url: string, filename: string) => {
    const triggerBlobDownload = async (targetUrl: string) => {
      const response = await fetch(targetUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(objectUrl);
      document.body.removeChild(a);
    };

    try {
      // 1. Try standard native fetch
      await triggerBlobDownload(url);
    } catch (error) {
      console.warn(
        'Native CORS blocked forced download, attempting Proxy Bypass...',
        error,
      );
      try {
        // 2. Bypass CORS using a reliable public proxy
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        await triggerBlobDownload(proxyUrl);
      } catch (proxyError) {
        console.error(
          'All automatic download methods failed, opening in new tab natively.',
          proxyError,
        );
        window.open(url, '_blank');
      }
    }
  };

  const formatUtcTimestamp = (ts: any) => {
    if (!ts) return new Date().toISOString().slice(0, 10);
    const d = new Date(ts);
    return isNaN(d.getTime()) ? ts : d.toISOString().slice(0, 10);
  };

  const parseApiCommentObject = (
    c: any,
    defaultTargetId: string,
    isItemMode: boolean = false,
  ): any => {
    const fileArr = c.files || c.attachments || c.documents || [];

    // Instead of extracting only firstFile, extract an array of parsed file metadata:
    const parsedFiles = fileArr.map((f: any) => {
      let fUrl = f.file_url || f.url || c.file_url || c.file || null;
      if (fUrl && !fUrl.startsWith('blob:')) {
        const char = fUrl.includes('?') ? '&' : '?';
        fUrl = `${fUrl}${char}cb=${Date.now()}`;
      }
      return {
        id: f.id || null,
        fileUrl: fUrl,
        fileName:
          f.file_name || f.name || c.file_name || c.filename || 'Attachment',
        fileType: f.content_type || f.mimetype || '',
      };
    });

    // Also support legacy `c.file_url` if fileArr is empty
    if (parsedFiles.length === 0 && (c.file_url || c.file)) {
      let fUrl = c.file_url || c.file;
      if (fUrl && !fUrl.startsWith('blob:')) {
        const char = fUrl.includes('?') ? '&' : '?';
        fUrl = `${fUrl}${char}cb=${Date.now()}`;
      }
      parsedFiles.push({
        fileUrl: fUrl,
        fileName: c.file_name || c.filename || 'Attachment',
        fileType: '',
      });
    }

    return {
      id: String(c.id || `COM-${Math.random()}`),
      ...(isItemMode ? { itemId: defaultTargetId } : { poId: defaultTargetId }),
      user: c.user_name || c.user || c.author || 'User',
      userId: c.user_id || c.author_id || null,
      role: c.role || 'Administrator',
      message: c.comment || c.message || c.text || '',
      files: parsedFiles,
      // Keep single legacy fields for backwards compatibility with any non-looped UI components
      fileUrl: parsedFiles.length > 0 ? parsedFiles[0].fileUrl : null,
      fileName: parsedFiles.length > 0 ? parsedFiles[0].fileName : null,
      fileType: parsedFiles.length > 0 ? parsedFiles[0].fileType : null,
      timestamp: formatUtcTimestamp(c.created_at || c.timestamp),
      rawTimestamp: c.created_at || c.timestamp || new Date().toISOString(),
      parentId: c.parent_id ? String(c.parent_id) : null,
    };
  };

  const isPoMatch = (po: any, targetId: string | number | null | undefined) => {
    if (!targetId || !po) return false;
    const cleanTarget = String(targetId).replace(/^PO-/i, '').trim();
    const cleanId = String(po.id || '')
      .replace(/^PO-/i, '')
      .trim();
    const cleanUuid = String(po.uuid || '').trim();
    const cleanScId = String(po.sellercloud_po_id || '').trim();

    return (
      po.id === targetId ||
      po.uuid === targetId ||
      po.sellercloud_po_id === targetId ||
      (cleanId && cleanId === cleanTarget) ||
      (cleanUuid && cleanUuid === cleanTarget) ||
      (cleanScId && cleanScId === cleanTarget)
    );
  };

  useEffect(() => {
    if (selectedPOId) {
      const po = purchaseOrders.find((p: any) => isPoMatch(p, selectedPOId));
      if (po && po.containerLeadTimeDays) {
        setLeadTimeDays(po.containerLeadTimeDays.toString());
      } else {
        setLeadTimeDays('');
      }

      const targetId =
        po?.sellercloud_po_id ||
        String(selectedPOId).replace(/^PO-/i, '') ||
        po?.uuid;
      setIsLoadingComments(true);
      getPurchaseOrderById(targetId)
        .then((detailData: any) => {
          if (!detailData) return;
          const rawComments = detailData?.comments || [];
          const mappedComments = rawComments.map((c: any) =>
            parseApiCommentObject(c, String(selectedPOId)),
          );
          setFetchedComments(mappedComments);
          setDetailedPOItems(detailData?.items || []);

          if (po) {
            const calculatedOrderedQty = detailData.items
              ? detailData.items.reduce(
                  (sum: number, i: any) =>
                    sum + (i.qty_ordered ?? i.qty ?? i.orderedQty ?? 0),
                  0,
                )
              : po.orderedQty;
            const calculatedReceivedQty = detailData.items
              ? detailData.items.reduce(
                  (sum: number, i: any) =>
                    sum +
                    (i.qty_received ?? i.receivedQty ?? i.received_qty ?? 0),
                  0,
                )
              : po.receivedQty;

            const updatedPO = {
              ...po,
              orderedQty: calculatedOrderedQty || po.orderedQty || 0,
              receivedQty: calculatedReceivedQty || po.receivedQty || 0,
              commentsCount:
                detailData.total_comments_count ?? po.commentsCount,
              items: detailData.items
                ? detailData.items.map((item: any) => ({
                    ...item,
                    sku: item.sku || 'N/A',
                    name: item.product_name || item.name || 'N/A',
                    qty_ordered:
                      item.qty_ordered !== undefined
                        ? item.qty_ordered
                        : item.qty || 0,
                    qty_received:
                      item.qty_received !== undefined
                        ? item.qty_received
                        : item.receivedQty || 0,
                    qty_remaining:
                      item.qty_remaining !== undefined &&
                      item.qty_remaining !== null
                        ? item.qty_remaining
                        : Math.max(
                            0,
                            (item.qty_ordered ?? item.qty ?? 0) -
                              (item.qty_received ?? item.receivedQty ?? 0),
                          ),
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
                : po.items,
              containerNames:
                detailData.container_names &&
                detailData.container_names.length > 0
                  ? detailData.container_names
                  : po.containerNames,
            };
            onUpdatePO(updatedPO);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch PO details for comments', err);
          setFetchedComments([]);
          setDetailedPOItems([]);
        })
        .finally(() => {
          setIsLoadingComments(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPOId]);

  const searchQuery =
    propSearchQuery !== undefined ? propSearchQuery : localSearchQuery;
  const setSearchQuery = propOnSearchChange
    ? propOnSearchChange
    : setLocalSearchQuery;

  const statusFilter =
    propStatusFilter !== undefined ? propStatusFilter : localStatusFilter;
  const setStatusFilter = propOnStatusFilterChange
    ? propOnStatusFilterChange
    : setLocalStatusFilter;

  const approvedStatusFilter =
    propApprovedStatusFilter !== undefined
      ? propApprovedStatusFilter
      : localApprovedStatusFilter;
  const setApprovedStatusFilter = propOnApprovedStatusFilterChange
    ? propOnApprovedStatusFilterChange
    : setLocalApprovedStatusFilter;

  const completionFilter =
    propCompletionFilter !== undefined
      ? propCompletionFilter
      : localCompletionFilter;
  const setCompletionFilter = propOnCompletionFilterChange
    ? propOnCompletionFilterChange
    : setLocalCompletionFilter;

  const vendorFilter =
    propVendorFilter !== undefined ? propVendorFilter : localVendorFilter;
  const setVendorFilter = propOnVendorFilterChange
    ? propOnVendorFilterChange
    : setLocalVendorFilter;

  const [localDateFrom, setLocalDateFrom] = useState('');
  const dateFrom = propDateFrom !== undefined ? propDateFrom : localDateFrom;
  const setDateFrom = propOnDateFromChange
    ? propOnDateFromChange
    : setLocalDateFrom;

  const [localDateTo, setLocalDateTo] = useState('');
  const dateTo = propDateTo !== undefined ? propDateTo : localDateTo;
  const setDateTo = propOnDateToChange ? propOnDateToChange : setLocalDateTo;

  const channelFilter =
    propChannelFilter !== undefined ? propChannelFilter : localChannelFilter;
  const setChannelFilter = propOnChannelFilterChange
    ? propOnChannelFilterChange
    : setLocalChannelFilter;

  // Pagination
  const [localCurrentPage, setLocalCurrentPage] = useState(1);
  const currentPage =
    propCurrentPage !== undefined ? propCurrentPage : localCurrentPage;

  const handlePageChange = (newPage: number | ((prev: number) => number)) => {
    if (propOnPageChange) {
      if (typeof newPage === 'function') {
        propOnPageChange(newPage(currentPage));
      } else {
        propOnPageChange(newPage);
      }
    } else {
      setLocalCurrentPage(newPage);
    }
  };

  const [localPageSize, setLocalPageSize] = useState(10);
  const pageSize = propPageSize !== undefined ? propPageSize : localPageSize;
  const handlePageSizeChange = (size: number) => {
    if (propOnPageSizeChange) {
      propOnPageSizeChange(size);
    } else {
      setLocalPageSize(size);
      setLocalCurrentPage(1);
    }
  };

  const itemsPerPage = pageSize;

  useEffect(() => {
    handlePageChange(1);
  }, [searchQuery, statusFilter, vendorFilter]);

  // PO creation state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPO, setNewPO] = useState({
    vendorId: '',
    status: 'Production' as const,
    orderedQty: 500,
    container: '',
    eta: '',
    sku: 'SKU-5501',
    itemName: 'Premium Heavy-Duty Casing',
    unitPrice: 24.5,
  });

  // Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  // Export State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFilterStatus, setExportFilterStatus] = useState<string>('all');
  const [exportColumns, setExportColumns] = useState<string[]>([]);

  const PO_LEVEL_COLUMNS = [
    'PO ID',
    'PO Title',
    'Channel ID',
    'Vendor',
    'Customer Name',
    'Warehouse',
    'Status Code',
    'Receiving Status',
    'Created On',
    'Date Ordered',
    'Expected Delivery',
    'Invoice Date',
    'Lead Time (days)',
    'Total Amount',
    'Comments',
  ];

  const ITEM_LEVEL_COLUMNS = [
    'Item ID',
    'SKU',
    'Product Name',
    'Qty Ordered',
    'Qty Received',
    'Qty in Container',
    'Units per Case',
    'Item Expected Delivery',
    'Item Comments',
  ];

  const CONTAINER_LEVEL_COLUMNS = ['Container Name', 'Container ETA'];

  // Detail drawer sub-sections
  const [activeDrawerSection, setActiveDrawerSection] = useState<
    'details' | 'comments' | 'ocr' | 'emails'
  >(
    typeof window !== 'undefined' &&
      window.location.search.includes('comment_id')
      ? 'comments'
      : 'details',
  );

  const [itemsCurrentPage, setItemsCurrentPage] = useState(1);
  const [itemsPageSize, setItemsPageSize] = useState(10);
  const [isItemsPaginationLoading, setIsItemsPaginationLoading] =
    useState(false);
  const itemsTableRef = useRef<HTMLDivElement>(null);
  const poTableRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll items table back to top after pagination changes (runs post-render)
  useEffect(() => {
    if (itemsTableRef.current) {
      itemsTableRef.current.scrollTop = 0;
    }
  }, [itemsCurrentPage, itemsPageSize]);

  // Scroll main PO table back to top after pagination changes (runs post-render)
  useEffect(() => {
    if (poTableRef.current) {
      poTableRef.current.scrollTop = 0;
    }
  }, [currentPage, pageSize]);

  useEffect(() => {
    if (selectedPOId) {
      // Don't auto-reset to 'details' if we are responding to a deep link
      if (activeDrawerSection !== 'comments') {
        setActiveDrawerSection('details');
      }
      setItemsCurrentPage(1);
      setCommentScope('po');
      setSelectedSkuId(null);
      setHighlightedCommentId(null);
      setSelectedItemForComments(null);
      setViewingContainerDetails(null);
    }
  }, [selectedPOId]);

  const deepLinkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleDeepLink = (e: any) => {
      const { commentId, itemId } = e.detail;

      if (itemId) {
        setDeepLinkItemId(String(itemId));
      }

      if (commentId) {
        setHighlightedCommentId(commentId);

        // If it's an item comment, we don't necessarily want to open the PO comment drawer
        if (!itemId) {
          setActiveDrawerSection('comments');
        }

        // Show full page loading process
        setIsLocatingComment(true);

        const maxAttempts = 60; // 15 seconds total to wait for item modal and comments to load
        let attempts = 0;

        if (deepLinkIntervalRef.current) {
          clearInterval(deepLinkIntervalRef.current);
        }

        deepLinkIntervalRef.current = setInterval(() => {
          attempts++;
          const el = document.getElementById(commentId);
          if (el) {
            if (deepLinkIntervalRef.current)
              clearInterval(deepLinkIntervalRef.current);
            setIsLocatingComment(false);
            setTimeout(() => {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
          } else if (attempts >= maxAttempts) {
            if (deepLinkIntervalRef.current)
              clearInterval(deepLinkIntervalRef.current);
            setIsLocatingComment(false);
            toast.error('Could not locate the specific comment.');
          }
        }, 250);
      }
    };
    window.addEventListener('po-deep-link', handleDeepLink);
    return () => {
      window.removeEventListener('po-deep-link', handleDeepLink);
      if (deepLinkIntervalRef.current)
        clearInterval(deepLinkIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (
      activeDrawerSection === 'comments' &&
      commentScope === 'sku' &&
      selectedSkuId
    ) {
      setIsLoadingSkuComments(true);
      getItemComments(selectedSkuId)
        .then((data: any) => {
          const rawComments = data?.comments || data || [];
          const mappedComments = rawComments.map((c: any) =>
            parseApiCommentObject(c, selectedSkuId, true),
          );
          setFetchedSkuComments(mappedComments);
        })
        .catch((err: any) => {
          console.error(err);
          setFetchedSkuComments([]);
        })
        .finally(() => setIsLoadingSkuComments(false));
    }
  }, [selectedSkuId, commentScope, activeDrawerSection]);

  useEffect(() => {
    const handleItemCommentAdded = (e: any) => {
      const itemId = e.detail?.itemId;
      if (!itemId) return;
      setDetailedPOItems((prevItems) =>
        prevItems.map((item) =>
          item.id === itemId
            ? {
                ...item,
                commentsCount:
                  (parseInt(
                    item.commentsCount ||
                      item.comments_count ||
                      item.commentCount ||
                      (Array.isArray(item.comments) ? item.comments.length : 0),
                    10,
                  ) || 0) + 1,
              }
            : item,
        ),
      );
    };

    window.addEventListener('item-comment-added', handleItemCommentAdded);
    return () => {
      window.removeEventListener('item-comment-added', handleItemCommentAdded);
    };
  }, []);

  // New Comment state
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentFiles, setNewCommentFiles] = useState<File[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    '' | 'Compressing...' | 'Uploading...'
  >('');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewAnchor, setPreviewAnchor] = useState<{
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    // Reset typing state when opening drawer or changing scopes
    setNewCommentText('');
    setNewCommentFiles([]);
    setCommentError(null);
    setReplyToCommentId(null);
    setReplyToUser(null);
    setReplyToText(null);
    setEditingCommentId(null);
    // Reset ALL mention state fresh on each PO / scope change
    setTagUsers([]);
    setIsFetchingTagUsers(false);
    setShowMentionDropdown(false);
    setMentionFilter('');
    setMentionIndex(0);
    setMentionHighlightIndex(0);
    setTaggedUserMap({});
  }, [selectedPOId, activeDrawerSection, commentScope, selectedSkuId]);

  // AI Email Generator state
  const [aiEmailGenerated, setAiEmailGenerated] = useState<string | null>(null);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);

  // Simulated OCR uploading state
  const [isUploadingOCR, setIsUploadingOCR] = useState(false);
  const [ocrSuccessMsg, setOcrSuccessMsg] = useState<string | null>(null);

  const [localSortConfig, setLocalSortConfig] = useState<{
    key: keyof PurchaseOrder | 'invoiceDate' | null;
    direction: 'asc' | 'desc' | null;
  }>({ key: null, direction: null });

  const activeSortConfig =
    propSortConfig !== undefined ? propSortConfig : localSortConfig;

  const handleSort = (key: keyof PurchaseOrder | 'invoiceDate') => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (activeSortConfig.key === key) {
      if (activeSortConfig.direction === 'asc') direction = 'desc';
      else if (activeSortConfig.direction === 'desc') direction = null;
    }

    if (propOnSortChange) {
      propOnSortChange(direction ? String(key) : null, direction);
    } else {
      setLocalSortConfig({ key: direction ? key : null, direction });
    }
  };

  const sortedPOs = [
    ...purchaseOrders.filter((po) => {
      const matchesSearch =
        po.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (po.orderId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.container.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (po.invoiceDetails?.invoiceNumber || '')
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        po.skus.some((sku) =>
          sku.toLowerCase().includes(searchQuery.toLowerCase()),
        );

      const matchesStatus =
        statusFilter === 'all' || po.status === statusFilter;

      // When parent drives the list via API, search/status/date are already applied server-side
      const isServerFiltered = propTotalCount !== undefined;
      const matchesDate =
        isServerFiltered ||
        !dateFrom ||
        Boolean(po.creationDate && po.creationDate.startsWith(dateFrom));
      const matchesSearchOrServer = isServerFiltered || matchesSearch;
      const matchesStatusOrServer = isServerFiltered || matchesStatus;

      // Role-based restrictions: if Vendor role, can ONLY see their own POs (Rule 13)
      if (userRole === 'Vendor') {
        return matchesSearchOrServer && matchesStatusOrServer && matchesDate;
      }

      return matchesSearchOrServer && matchesStatusOrServer && matchesDate;
    }),
  ].sort((a, b) => {
    if (!activeSortConfig.key || !activeSortConfig.direction) return 0;

    let aValue: any;
    let bValue: any;

    if (activeSortConfig.key === 'invoiceDate') {
      aValue = a.invoiceDetails?.date || (a as any).invoice_date || '';
      bValue = b.invoiceDetails?.date || (b as any).invoice_date || '';
    } else if (activeSortConfig.key === 'invoiceDelayStatus') {
      const getPriority = (po: any) => {
        const invD = po.invoice_date || po.invoiceDetails?.date;
        const crD = po.created_on || po.creationDate;
        if (invD) return 1; // On Time
        if (!crD || crD === 'N/A') return 0; // N/A
        const diff = Math.floor(
          (new Date().getTime() - new Date(crD).getTime()) / 86400000,
        );
        return diff > 10 ? 3 : 2; // Delay (3) > Pending (2)
      };
      aValue = getPriority(a);
      bValue = getPriority(b);
    } else {
      aValue = a[activeSortConfig.key as keyof PurchaseOrder] || '';
      bValue = b[activeSortConfig.key as keyof PurchaseOrder] || '';
    }

    if (aValue < bValue) return activeSortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return activeSortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredPOs = sortedPOs;

  // Pagination calculation — trust server totals when the parent fetches filtered pages
  const isLocalFilteringActive =
    propTotalCount === undefined &&
    Boolean(searchQuery || statusFilter !== 'all' || dateFrom);
  const validTotalCount =
    propTotalCount !== undefined && !isLocalFilteringActive
      ? propTotalCount
      : filteredPOs.length;

  const totalPages = Math.ceil(validTotalCount / itemsPerPage) || 1;
  const normalizedCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (normalizedCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const paginatedPOs =
    propTotalCount !== undefined && !isLocalFilteringActive
      ? filteredPOs
      : filteredPOs.slice(startIndex, endIndex);

  let selectedPO = purchaseOrders.find((po: any) =>
    isPoMatch(po, selectedPOId),
  );
  if (!selectedPO && kanbanList) {
    for (const key of Object.keys(kanbanList)) {
      const found = kanbanList[key].find((po: any) =>
        isPoMatch(po, selectedPOId),
      );
      if (found) {
        selectedPO = found;
        break;
      }
    }
  }

  // All Items for selected PO will be listed with local pagination
  // Use detailed API items if available since they contain `id` DB fields that are missing in the summary index
  const allItemsForPO =
    detailedPOItems.length > 0 ? detailedPOItems : selectedPO?.items || [];
  const totalItemsCount = allItemsForPO.length;

  const paginatedItems = allItemsForPO.slice(
    (itemsCurrentPage - 1) * itemsPageSize,
    itemsCurrentPage * itemsPageSize,
  );

  // Comments for selected PO (Dynamically loaded from detail API)
  const selectedPOComments = fetchedComments;

  useEffect(() => {
    if (highlightedCommentId) {
      setTimeout(() => {
        const el = document.getElementById(highlightedCommentId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    } else if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [
    selectedPOComments,
    fetchedSkuComments,
    isPostingComment,
    activeDrawerSection,
    commentScope,
    selectedSkuId,
    newCommentFiles,
    replyToCommentId,
    highlightedCommentId,
  ]);

  // Email Logs for selected PO
  const selectedPOEmails = emails.filter((e) => e.poId === selectedPOId);

  // Execute CSV export using backend API (Rule 12)
  const handleExportCSVClick = () => {
    setExportColumns([]);
    setExportFilterStatus('all');
    setShowExportModal(true);
  };

  const executeExportCSV = async () => {
    let finalColumns = exportColumns;
    if (finalColumns.length === 0) {
      finalColumns = [
        ...PO_LEVEL_COLUMNS,
        ...ITEM_LEVEL_COLUMNS,
        ...CONTAINER_LEVEL_COLUMNS,
      ];
    }

    try {
      const toastId = toast.loading('Generating CSV Export...');

      const payload: any = {
        columns: finalColumns,
        filter_status: exportFilterStatus,
        vendor_id: vendorFilter !== 'all' ? vendorFilter : undefined,
        customer_id:
          (propCustomerFilter ?? localCustomerFilter) !== 'all'
            ? (propCustomerFilter ?? localCustomerFilter)
            : undefined,
        channel_id: channelFilter !== 'all' ? channelFilter : undefined,
        search: searchQuery || undefined,
        date_from: dateFrom || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        approved_status:
          approvedStatusFilter !== 'all' ? approvedStatusFilter : undefined,
      };

      const blob = await exportPurchaseOrdersCSV(payload);

      const downloadUrl = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute(
        'download',
        `SupplyChainCRM_PO_Export_${new Date().toISOString().split('T')[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.update(toastId, {
        render: 'Export successful!',
        type: 'success',
        isLoading: false,
        autoClose: 3000,
      });
      onAddActivity('Exported PO list via backend API', 'PO Updated');
      setShowExportModal(false);
    } catch (error) {
      console.error('Export failed', error);
      toast.dismiss();
      toast.error('Failed to export CSV. Please try again.');
    }
  };

  // Export a single PO's data from the details modal via the backend export API (Rule 12)
  const handleExportPO = async (po: any) => {
    if (!po) return;
    const toastId = toast.loading('Generating PO Export...');
    try {
      const sellercloudPoId =
        po.sellercloud_po_id || String(po.id).replace(/^PO-/i, '');
      const blob = await exportPurchaseOrderCSV(sellercloudPoId);

      const downloadUrl = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `PO-${po.id}_Export.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.update(toastId, {
        render: 'Export successful!',
        type: 'success',
        isLoading: false,
        autoClose: 3000,
      });
      onAddActivity(`Exported PO ${po.id}`, 'PO Updated');
    } catch (error) {
      console.error('Failed to export PO:', error);
      toast.update(toastId, {
        render: 'Failed to export PO. Please try again.',
        type: 'error',
        isLoading: false,
        autoClose: 3000,
      });
    }
  };

  // CSV Mock Import parsing (Rule 12)
  const handleImportCSV = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importCsvText.trim()) {
      setImportFeedback('Please paste valid CSV lines first.');
      return;
    }

    try {
      const lines = importCsvText.split('\n');
      let successCount = 0;

      lines.forEach((line, index) => {
        if (index === 0 && line.toLowerCase().includes('po')) return; // skip header
        if (!line.trim()) return;

        const parts = line.split(',');
        if (parts.length >= 4) {
          const id = `PO-${Math.floor(10000 + Math.random() * 90000)}`;
          const vendorId = parts[0]?.trim() || 'VEND-001';
          const vendor = vendors.find((v) => v.id === vendorId) || vendors[0];
          const status = (parts[1]?.trim() as any) || 'Production';
          const orderedQty = parseInt(parts[2]?.trim() || '500');
          const eta = parts[3]?.trim() || '2026-08-15';
          const sku = parts[4]?.trim() || 'SKU-5501';

          const itemPrice = 25.0;
          const po: PurchaseOrder = {
            id,
            vendorId: vendor.id,
            vendorName: vendor.name,
            status,
            orderedQty,
            receivedQty: 0,
            container: '',
            invoiceStatus: 'Pending',
            invoiceFile: null,
            invoiceDetails: null,
            eta,
            creationDate: new Date().toISOString().split('T')[0],
            delayedDays: 0,
            skus: [sku],
            items: [
              {
                sku,
                name: 'Imported Parts Sourcing',
                qty: orderedQty,
                unitPrice: itemPrice,
              },
            ],
            productionStage: 'Materials',
            commentsCount: 0,
            emailCount: 0,
          };

          onUpdatePO(po);
          successCount++;
        }
      });

      if (successCount > 0) {
        setImportFeedback(
          `Successfully imported ${successCount} new Purchase Orders!`,
        );
        onAddActivity(
          `Bulk imported ${successCount} Purchase Orders via CSV parser`,
          'PO Updated',
        );
        setTimeout(() => {
          setShowImportModal(false);
          setImportCsvText('');
          setImportFeedback(null);
        }, 1500);
      } else {
        setImportFeedback(
          'Error: CSV line parameters must match expected fields.',
        );
      }
    } catch {
      setImportFeedback(
        'Parsing failed. Check fields format. Expected format: vendor_id,status,quantity,eta_yyyy_mm_dd,sku',
      );
    }
  };

  // Create PO form submission
  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPO.vendorId || !newPO.eta) {
      alert('Please fill in Vendor selection and target delivery date.');
      return;
    }

    const vendor = vendors.find((v) => v.id === newPO.vendorId);
    if (!vendor) return;

    const generatedId = `PO-${Math.floor(10000 + Math.random() * 90000)}`;
    const createdPO: PurchaseOrder = {
      id: generatedId,
      vendorId: vendor.id,
      vendorName: vendor.name,
      status: newPO.status,
      orderedQty: Number(newPO.orderedQty),
      receivedQty: 0,
      container: newPO.container,
      invoiceStatus: 'Pending',
      invoiceFile: null,
      invoiceDetails: null,
      eta: newPO.eta,
      creationDate: new Date().toISOString().split('T')[0],
      delayedDays: 0,
      skus: [newPO.sku],
      items: [
        {
          sku: newPO.sku,
          name: newPO.itemName,
          qty: Number(newPO.orderedQty),
          unitPrice: newPO.unitPrice,
        },
      ],
      productionStage: 'Materials',
      commentsCount: 0,
      emailCount: 0,
    };

    onUpdatePO(createdPO); // triggers callback
    onAddActivity(
      `Created new Purchase Order ${generatedId} for ${vendor.name}`,
      'PO Updated',
    );
    onAddAudit(
      generatedId,
      'Create Purchase Order',
      'None',
      'Created',
      'Chrome 122',
      '127.0.0.1',
    );
    setShowCreateModal(false);
  };

  // AI Email Follow-up Generator (Rule 10)
  const generateAIFollowUp = () => {
    if (!selectedPO) return;
    setIsGeneratingEmail(true);
    setAiEmailGenerated(null);

    setTimeout(() => {
      const lateDays = selectedPO.delayedDays;
      const delayedText =
        lateDays > 0
          ? `The shipment is currently delayed by ${lateDays} days, missing our original target date of ${selectedPO.eta}.`
          : `We would like to request an updated status check regarding production timelines for our target ETA of ${selectedPO.eta}.`;

      const text = `Subject: URGENT: Timeline Follow-up - Purchase Order ${selectedPO.id}

Dear ${selectedPO.vendorName} Operations Team,

This is a friendly reminder regarding our active Purchase Order ${selectedPO.id} for ${selectedPO.orderedQty} units of ${selectedPO.items[0]?.name || 'essential component modules'}.

${delayedText}

Please confirm your current production stage (currently listed as: ${selectedPO.productionStage}). Additionally, provide any updated logistics details or shipping container allocations at your earliest convenience.

Thank you for your continuous support in keeping our supply chains connected.

Best regards,
Sourcing & S&OP Operations Team
Supply Chain CRM Coordinator`;

      setAiEmailGenerated(text);
      setIsGeneratingEmail(false);
    }, 1200);
  };

  // Post follow-up to Email Log
  const handleSendAIEmail = () => {
    if (!selectedPO || !aiEmailGenerated) return;

    const newEmail: EmailLog = {
      id: `EML-${Math.floor(200 + Math.random() * 800)}`,
      poId: selectedPO.id,
      subject: `Timeline Follow-up - Purchase Order ${selectedPO.id}`,
      sentAt: new Date().toISOString().slice(0, 10),
      status: 'Sent',
      openCount: 0,
      lastOpenTime: null,
      linkClicks: 0,
      repliedAt: null,
      attachmentName: null,
    };

    onAddEmailLog(newEmail);
    onAddActivity(
      `Sent AI-Generated follow-up email to ${selectedPO.vendorName}`,
      'Email Sent',
    );
    setAiEmailGenerated(null);
    alert(
      `Email successfully pushed to queue for delivery to ${selectedPO.vendorName}.`,
    );
  };

  // PDF Upload Mock OCR reader (Rule 17)
  const handleSimulatedPdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedPO || !e.target.files?.[0]) return;
    setIsUploadingOCR(true);
    setOcrSuccessMsg(null);

    const file = e.target.files[0];

    setTimeout(() => {
      const parsedAmount = selectedPO.items.reduce(
        (sum, item) => sum + item.qty * item.unitPrice,
        0,
      );
      const invoiceNumber = `INV-OCR-${Math.floor(100000 + Math.random() * 900000)}`;

      const updatedPO: PurchaseOrder = {
        ...selectedPO,
        invoiceStatus: 'Uploaded',
        invoiceFile: file.name,
        invoiceDetails: {
          amount: parsedAmount,
          invoiceNumber,
          date: new Date().toISOString().split('T')[0],
          ocrExtracted: true,
        },
      };

      onUpdatePO(updatedPO);
      setIsUploadingOCR(false);
      setOcrSuccessMsg(
        `Successfully extracted! Inv Number: ${invoiceNumber}, Amount: $${parsedAmount.toLocaleString()}`,
      );
      onAddActivity(
        `Uploaded invoice PDF & extracted details via OCR for ${selectedPO.id}`,
        'Invoice Uploaded',
      );
      onAddAudit(
        selectedPO.id,
        'Invoice OCR Extraction',
        'Pending',
        'Uploaded',
        'Chrome 122',
        '127.0.0.1',
      );
    }, 1800);
  };
  // User Mention logic
  const handleCommentTextChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const val = e.target.value;
    setNewCommentText(val);
    setCommentError(null);

    const cursorPosition = e.target.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursorPosition);

    // Find nearest @ that could start a mention (preceded by space or start of string)
    const atPos = textBeforeCursor.lastIndexOf('@');
    if (atPos !== -1) {
      const charBefore = atPos > 0 ? textBeforeCursor[atPos - 1] : ' ';
      if (charBefore === ' ' || charBefore === '\n' || atPos === 0) {
        const mentionTextOrig = textBeforeCursor.slice(atPos + 1);
        const wordsAfterAt = mentionTextOrig.split(/\s+/);

        // Auto-close if following a known tag, or if phrase gets suspiciously long (abandoned)
        const isCompletedTag =
          wordsAfterAt.length > 1 && taggedUserMap[`@${wordsAfterAt[0]}`];
        const isAbandonedSearch = wordsAfterAt.length > 3;

        if (isCompletedTag || isAbandonedSearch) {
          setShowMentionDropdown(false);
          return;
        }

        setShowMentionDropdown(true);
        setMentionFilter(mentionTextOrig.toLowerCase());
        setMentionHighlightIndex(0);
        setMentionIndex(atPos);

        // Lazy-fetch tag users the first time @ is detected
        if (tagUsers.length === 0 && !isFetchingTagUsers) {
          setIsFetchingTagUsers(true);
          getTagUsers()
            .then((users) => setTagUsers(Array.isArray(users) ? users : []))
            .catch((err) => console.error('Failed to fetch tag users', err))
            .finally(() => setIsFetchingTagUsers(false));
        }
        return;
      }
    }
    setShowMentionDropdown(false);
    setMentionHighlightIndex(0);
  };

  const handleSelectMention = (userObj: any) => {
    const name = typeof userObj === 'string' ? userObj : userObj.name || '';
    const id = typeof userObj === 'string' ? userObj : userObj.id || '';
    // Use name directly as the tag (spaces → underscores for clean tags)
    const tagBase = name.trim().replace(/\s+/g, '_');
    const tag = `@${tagBase}`;

    const textBefore = newCommentText.slice(0, mentionIndex);
    const textAfter = newCommentText.slice(
      mentionIndex + 1 + mentionFilter.length,
    );

    setNewCommentText(`${textBefore}${tag} ${textAfter.trimStart()}`);
    setTaggedUserMap((prev) => ({ ...prev, [tag]: id }));
    setShowMentionDropdown(false);
    setMentionHighlightIndex(0);
  };

  const getFilteredMentions = (): any[] => {
    const f = mentionFilter.toLowerCase();
    if (!f) return tagUsers;
    return tagUsers.filter((u) => {
      const name = typeof u === 'string' ? u : u.name || '';
      return (
        name.toLowerCase().includes(f) ||
        name.toLowerCase().replace(/\s+/g, '_').includes(f)
      );
    });
  };

  const handleCommentKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (!showMentionDropdown) return;
    const filtered = getFilteredMentions();
    if (filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelectMention(filtered[mentionHighlightIndex] ?? filtered[0]);
    } else if (e.key === 'Escape') {
      setShowMentionDropdown(false);
    }
  };

  const handleUpdateSubmit = async (commentId: string) => {
    if (
      (!editingCommentText.trim() && editingCommentFiles.length === 0) ||
      !selectedPO
    )
      return;

    // Extract tagged users
    const words = editingCommentText.trim().split(/\s+/);
    const taggedUserIds = words
      .filter((w) => w.startsWith('@'))
      .map((w) => {
        const cleanW = w.replace(/[.,!?;:]+$/, '');
        if (taggedUserMap[cleanW]) return taggedUserMap[cleanW];

        // Fallback: search in fetched tagUsers
        const found = tagUsers.find((u: any) => {
          const name = typeof u === 'string' ? u : u.name || '';
          const tagBase = name.trim().replace(/\s+/g, '_');
          return `@${tagBase}`.toLowerCase() === cleanW.toLowerCase();
        });
        return found ? (typeof found === 'string' ? found : found.id) : null;
      })
      .filter(Boolean);

    setUploadStatus('Compressing...');
    setIsPostingComment(true);

    const finalFilesToUpload: File[] = [];
    for (const raw of editingCommentFiles) {
      if ((raw as any).isCompressed) {
        finalFilesToUpload.push(raw);
      } else {
        const c = await compressImageIfNeeded(raw);
        (c as any).isCompressed = true;
        finalFilesToUpload.push(c);
      }
    }
    setEditingCommentFiles(finalFilesToUpload);

    setUploadStatus('Uploading...');

    if (commentScope === 'sku' && selectedSkuId) {
      updateItemComment(
        commentId,
        editingCommentText.trim(),
        taggedUserIds,
        finalFilesToUpload.length > 0 ? finalFilesToUpload : undefined,
      )
        .then(() => {
          setUploadStatus('');
          setFetchedSkuComments((prev) =>
            prev.map((c) =>
              c.id === commentId
                ? { ...c, message: editingCommentText.trim() }
                : c,
            ),
          );
          setEditingCommentId(null);
          setEditingCommentText('');
          setEditingCommentFiles([]);

          onAddActivity(
            `Updated comment on SKU (${selectedSkuId})`,
            'Vendor Comment',
          );
          return getItemComments(selectedSkuId);
        })
        .then((data: any) => {
          const rawComments = data?.comments || data || [];
          const mappedComments = rawComments.map((c: any) =>
            parseApiCommentObject(c, String(selectedSkuId), true),
          );
          setFetchedSkuComments(mappedComments);
        })
        .catch((err) => {
          console.error('Failed to update SKU comment', err);
          setUploadStatus('');
          toast.error('Network sync error: Comment may not have saved.', {
            autoClose: 2000,
          });
        })
        .finally(() => setIsPostingComment(false));
      return;
    }

    updatePOComment(
      commentId,
      editingCommentText.trim(),
      taggedUserIds,
      finalFilesToUpload.length > 0 ? finalFilesToUpload : undefined,
    )
      .then(() => {
        setUploadStatus('');
        setFetchedComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? { ...c, message: editingCommentText.trim() }
              : c,
          ),
        );
        setEditingCommentId(null);
        setEditingCommentText('');
        setEditingCommentFiles([]);

        // Re-fetch invisibly to sync real DB record (attachments in particular)
        const targetId = selectedPO.id.replace(/^PO-/i, '');
        return getPurchaseOrderById(targetId);
      })
      .then((detailData: any) => {
        if (!detailData) return;
        const rawComments = detailData.comments || [];
        const mappedComments = rawComments.map((c: any) =>
          parseApiCommentObject(c, String(selectedPO.id)),
        );
        // Only update if we didn't just switch away to another PO
        setFetchedComments((current) => {
          if (current.length > 0 && current[0].poId !== selectedPO.id)
            return current;
          return mappedComments;
        });
      })
      .catch((err) => {
        console.error('Failed to update PO comment', err);
        setUploadStatus('');
        toast.error('Network sync error: Comment may not have saved.', {
          autoClose: 2000,
        });
      })
      .finally(() => setIsPostingComment(false));
  };

  // Delete a discussion comment (PO-level or SKU-level)
  const handleDeleteComment = (commentId: string) => {
    if (String(commentId).includes('OPT-')) return;
    setDeleteCommentTarget({ type: 'comment', commentId });
  };

  // Delete a single attachment from a discussion comment (PO-level or SKU-level)
  const handleDeleteCommentAttachment = (
    commentId: string,
    attachmentId: string | null,
  ) => {
    if (!attachmentId) return;
    setDeleteCommentTarget({ type: 'attachment', commentId, attachmentId });
  };

  const handleConfirmDeleteComment = () => {
    if (!deleteCommentTarget) return;
    const { type, commentId, attachmentId } = deleteCommentTarget;
    setIsDeletingComment(true);

    if (type === 'comment') {
      if (commentScope === 'sku' && selectedSkuId) {
        const prevSkuComments = fetchedSkuComments;
        setFetchedSkuComments((prev) =>
          prev.filter((c) => c.id !== commentId && c.parentId !== commentId),
        );
        deleteItemComment(commentId)
          .then(() => {
            toast.success('Comment deleted successfully');
            onAddActivity(
              `Deleted comment on SKU (${selectedSkuId})`,
              'Vendor Comment',
            );
          })
          .catch((err) => {
            console.error('Failed to delete SKU comment', err);
            toast.error('Failed to delete comment.');
            setFetchedSkuComments(prevSkuComments);
          })
          .finally(() => {
            setIsDeletingComment(false);
            setDeleteCommentTarget(null);
          });
        return;
      }

      const prevComments = fetchedComments;
      setFetchedComments((prev) =>
        prev.filter((c) => c.id !== commentId && c.parentId !== commentId),
      );
      deletePOComment(commentId)
        .then(() => {
          toast.success('Comment deleted successfully');
          onAddActivity(
            `Deleted a comment on ${selectedPO?.id}`,
            'Vendor Comment',
          );
        })
        .catch((err) => {
          console.error('Failed to delete PO comment', err);
          toast.error('Failed to delete comment.');
          setFetchedComments(prevComments);
        })
        .finally(() => {
          setIsDeletingComment(false);
          setDeleteCommentTarget(null);
        });
      return;
    }

    const stripAttachment = (c: any) => {
      if (c.id !== commentId) return c;
      const newFiles = (c.files || []).filter(
        (f: any) => f.id !== attachmentId,
      );
      return {
        ...c,
        files: newFiles,
        fileUrl: newFiles.length > 0 ? newFiles[0].fileUrl : null,
        fileName: newFiles.length > 0 ? newFiles[0].fileName : null,
        fileType: newFiles.length > 0 ? newFiles[0].fileType : null,
      };
    };

    if (commentScope === 'sku' && selectedSkuId) {
      const prevSkuComments = fetchedSkuComments;
      setFetchedSkuComments((prev) => prev.map(stripAttachment));
      deleteItemCommentAttachment(attachmentId as string)
        .then(() => toast.success('Attachment deleted successfully'))
        .catch((err) => {
          console.error('Failed to delete SKU comment attachment', err);
          toast.error('Failed to delete attachment.');
          setFetchedSkuComments(prevSkuComments);
        })
        .finally(() => {
          setIsDeletingComment(false);
          setDeleteCommentTarget(null);
        });
      return;
    }

    const prevComments = fetchedComments;
    setFetchedComments((prev) => prev.map(stripAttachment));
    deletePOCommentAttachment(attachmentId as string)
      .then(() => toast.success('Attachment deleted successfully'))
      .catch((err) => {
        console.error('Failed to delete PO comment attachment', err);
        toast.error('Failed to delete attachment.');
        setFetchedComments(prevComments);
      })
      .finally(() => {
        setIsDeletingComment(false);
        setDeleteCommentTarget(null);
      });
  };

  // Add a discussion comment
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO || (!newCommentText.trim() && newCommentFiles.length === 0))
      return;

    const filesToUpload = newCommentFiles;
    let messageText = newCommentText.trim();

    // Extract tagged users — validation must happen BEFORE any state changes
    const words = newCommentText.trim().split(/\s+/);
    const taggedUserIds = words
      .filter((w) => w.startsWith('@'))
      .map((w) => {
        const cleanW = w.replace(/[.,!?;:]+$/, '');
        if (taggedUserMap[cleanW]) return taggedUserMap[cleanW];

        // Fallback: search in fetched tagUsers
        const found = tagUsers.find((u: any) => {
          const name = typeof u === 'string' ? u : u.name || '';
          const tagBase = name.trim().replace(/\s+/g, '_');
          return `@${tagBase}`.toLowerCase() === cleanW.toLowerCase();
        });
        return found ? (typeof found === 'string' ? found : found.id) : null;
      })
      .filter(Boolean);

    if (taggedUserIds.length === 0) {
      setCommentError(
        newCommentFiles.length > 0 && !newCommentText.trim()
          ? 'Please type a message with an @tag to send these attachments.'
          : 'You must @ tag at least one user to post a comment.',
      );
      return;
    }

    // All validation passed — now commit state changes
    setUploadStatus('Compressing...');
    setIsPostingComment(true);

    const finalFilesToUpload: File[] = [];
    for (const raw of newCommentFiles) {
      if ((raw as any).isCompressed) {
        finalFilesToUpload.push(raw);
      } else {
        const c = await compressImageIfNeeded(raw);
        (c as any).isCompressed = true;
        finalFilesToUpload.push(c);
      }
    }
    setNewCommentFiles(finalFilesToUpload);

    setUploadStatus('Uploading...');

    // No optimistic append for attachments (UI will say Compressing/Uploading)
    const replyId = replyToCommentId;

    if (commentScope === 'sku' && selectedSkuId) {
      setTimeout(() => setNewCommentText(''), 0);
      setNewCommentFiles([]);
      setShowMentionDropdown(false);

      postItemComment(
        selectedSkuId,
        messageText,
        taggedUserIds,
        replyId,
        finalFilesToUpload.length > 0 ? finalFilesToUpload : undefined,
      )
        .then(() => {
          setUploadStatus('');
          setReplyToCommentId(null);
          setReplyToUser(null);
          setReplyToText(null);
          setNewCommentText('');
          setNewCommentFiles([]);
          setShowMentionDropdown(false);
          onAddActivity(
            `Added discussion comment on SKU (${selectedSkuId})`,
            'Vendor Comment',
          );
          toast.success('Comment posted successfully');
          return getItemComments(selectedSkuId);
        })
        .then((data: any) => {
          const rawComments = data?.comments || data || [];
          const mappedComments = rawComments.map((c: any) =>
            parseApiCommentObject(c, selectedSkuId, true),
          );
          setFetchedSkuComments(mappedComments);
        })
        .catch((err) => {
          console.error('Failed to save comment to server:', err);
          setUploadStatus('');
          toast.error('Network sync error: Comment may not have saved.', {
            autoClose: 2000,
          });
        })
        .finally(() => {
          setIsPostingComment(false);
        });
      return;
    }

    // Fire-and-forget background sync (No UI locks!)
    const targetId = selectedPO.id.replace(/^PO-/i, '');

    postPOComment(
      targetId,
      messageText,
      taggedUserIds,
      replyId,
      finalFilesToUpload.length > 0 ? finalFilesToUpload : undefined,
    )
      .then(() => {
        setUploadStatus('');
        setReplyToCommentId(null);
        setReplyToUser(null);
        setReplyToText(null);
        setNewCommentText('');
        setNewCommentFiles([]);
        setShowMentionDropdown(false);

        onAddActivity(
          `Added discussion comment on ${selectedPO.id}`,
          'Vendor Comment',
        );

        toast.success('Comment posted successfully');

        // Re-fetch invisibly to sync real DB record
        return getPurchaseOrderById(targetId);
      })
      .then((detailData: any) => {
        if (!detailData) return;
        const rawComments = detailData.comments || [];
        const mappedComments = rawComments.map((c: any) =>
          parseApiCommentObject(c, selectedPO.id),
        );

        // Only update if we didn't just switch away to another PO
        setFetchedComments((current) => {
          // We might have multiple optimistics in flight. For absolute safety WhatsApp-style,
          // we just replace the whole array with the fresh backend truth.
          return mappedComments;
        });

        // Optimistically update the PO list commentsCount to avoid reloading the whole table
        if (selectedPO) {
          const updatedPOs = purchaseOrders.map((p: any) =>
            p.id === selectedPO.id
              ? {
                  ...p,
                  commentsCount:
                    detailData.total_comments_count ??
                    (p.commentsCount || 0) + 1,
                }
              : p,
          );
          dispatch(setPurchaseOrdersList(updatedPOs));
        }
      })
      .catch((err) => {
        console.error('Failed to save comment to server:', err);
        // Silently fail UI or show a tiny toast, but don't disrupt user
        toast.error('Network sync error: Comment may not have saved.', {
          autoClose: 2000,
        });
      })
      .finally(() => {
        setIsPostingComment(false);
      });
  };

  // Move a card on production board
  const handleMoveKanban = (
    po: PurchaseOrder,
    newStage: typeof po.productionStage,
  ) => {
    const updated: PurchaseOrder = {
      ...po,
      productionStage: newStage,
      status: newStage === 'Ready to Ship' ? 'In Transit' : po.status,
    };
    onUpdatePO(updated);
    onAddActivity(
      `Moved ${po.id} production stage to ${newStage}`,
      'PO Updated',
    );
    onAddAudit(
      po.id,
      'Production Stage Shift',
      po.productionStage,
      newStage,
      'Chrome 122',
      '127.0.0.1',
    );
  };

  const handleVendorStatusUpdate = (poId: string, newStatus: string) => {
    updatePOStatus(poId, newStatus)
      .then(() => {
        const updatedPOs = purchaseOrders.map((p) =>
          p.id === poId || (p as any).uuid === poId
            ? { ...p, status: newStatus }
            : p,
        );
        dispatch(setPurchaseOrdersList(updatedPOs));
        toast.success(`Vendor Status updated to ${newStatus}`);
        if (newStatus.toUpperCase() === 'DELAYED') {
          setAutoOpenPOId(poId);
        }
      })
      .catch((err) => {
        console.error('Failed to update vendor status:', err);
        toast.error('Failed to update status');
      });
  };

  const handleReasonUpdate = (poId: string, value: string) => {
    // Determine current status if we wanted to pass it, but endpoint permits omitting it for pure reason update.
    updatePODelayReason(poId, value)
      .then(() => {
        const updatedPOs = purchaseOrders.map((p) =>
          p.id === poId || (p as any).uuid === poId
            ? { ...p, delay_reason: value, reason: value }
            : p,
        );
        dispatch(setPurchaseOrdersList(updatedPOs));
        toast.success('Reason updated successfully');
      })
      .catch((err) => {
        console.error('Failed to update reason:', err);
        toast.error('Failed to update reason');
      });
  };

  const poColumns = React.useMemo(
    () => [
      {
        header: (
          <div
            className="flex items-center gap-1"
            onClick={() => handleSort('id')}
          >
            PO Number
            <span className="group-hover:text-mc-black text-slate-400">
              {activeSortConfig.key === 'id' ? (
                activeSortConfig.direction === 'asc' ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )
              ) : (
                <ArrowUpDown className="h-3 w-3 opacity-50 outline-hidden" />
              )}
            </span>
          </div>
        ),
        accessor: 'id',
        headerClassName:
          'px-6 py-4  cursor-pointer select-none group hover:text-mc-black transition-colors',
        className: 'px-6 py-4',
        render: (po: any) => (
          <div className="flex flex-col items-start gap-1">
            <div className="flex max-w-[120px] items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
              <button
                className="hover:text-mc-gold m-0 cursor-pointer truncate border-none bg-transparent p-0 font-mono text-[10px] font-bold text-slate-900 hover:underline"
                title={String(po.id).replace(/^PO-/i, '')}
                onClick={(e: any) => {
                  e.stopPropagation();
                  setIsCommentOnlyView(false);
                  onSelectPO(po.id);
                  setActiveDrawerSection('details');
                }}
              >
                {highlightText(String(po.id).replace(/^PO-/i, ''), searchQuery)}
              </button>
              {po.delta_sellercloud_link && !isVendor && (
                <a
                  title="Open in Sellercloud (Purchasing)"
                  href={po.delta_sellercloud_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e: any) => e.stopPropagation()}
                  className="text-mc-gray-soft hover:text-mc-black inline-flex shrink-0 items-center transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              <button
                type="button"
                title="View PO Insights"
                onClick={(e: any) => {
                  e.stopPropagation();
                  setIsCommentOnlyView(false);
                  onSelectPO(po.id);
                  setActiveDrawerSection('details');
                }}
                className="hover:text-mc-black ml-0.5 inline-flex shrink-0 items-center text-slate-400 transition-colors"
              >
                <Eye className="h-3 w-3" />
              </button>
              {po.status === 'Delayed' && (
                <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-rose-500" />
              )}
            </div>
            {po.containerLeadTimeDays && (
              <span className="font-mono text-[9px] text-slate-500">
                Lead Days: {po.containerLeadTimeDays}d
              </span>
            )}
          </div>
        ),
      },
      {
        header: 'Order Id',
        accessor: 'orderId',
        headerClassName: 'px-6 py-4 ',
        className: 'px-6 py-4',
        render: (po: any) => (
          <div className="flex items-center gap-1.5">
            <span
              className={
                !po.orderId || po.orderId === 'N/A'
                  ? 'rounded-sm border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] text-slate-500'
                  : 'text-[11px] font-bold text-slate-700'
              }
            >
              {!po.orderId || po.orderId === 'N/A'
                ? 'Stock'
                : highlightText(po.orderId, searchQuery)}
            </span>
            {po.sellercloud_link && !isVendor && (
              <a
                title="Open in Sellercloud (Order)"
                href={po.sellercloud_link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e: any) => e.stopPropagation()}
                className="text-mc-gray-soft hover:text-mc-black inline-flex shrink-0 items-center transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        ),
      },
      {
        header: 'Channel ID',
        accessor: 'channel_order_id',
        headerClassName: 'px-6 py-4',
        className: 'px-6 py-4',
        render: (po: any) => (
          <span
            className={
              !po.channel_order_id || po.channel_order_id === 'N/A'
                ? 'rounded-sm border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] text-slate-500'
                : 'block max-w-[120px] truncate text-[11px] font-bold text-slate-700'
            }
            data-tooltip-id={
              !po.channel_order_id || po.channel_order_id === 'N/A'
                ? undefined
                : 'po-item-tooltip'
            }
            data-tooltip-content={
              !po.channel_order_id || po.channel_order_id === 'N/A'
                ? undefined
                : po.channel_name || po.channel || po.channel_order_id
            }
          >
            {!po.channel_order_id || po.channel_order_id === 'N/A'
              ? 'N/A'
              : highlightText(po.channel_order_id, searchQuery)}
          </span>
        ),
      },
      ...(['Vendor', 'Warehouse', 'Administrator'].includes(userRole)
        ? [
            {
              header: 'Status',
              accessor: 'status',
              headerClassName: 'px-6 py-4  relative',
              className: 'px-6 py-4 min-w-[200px]',
              render: (po: any) => (
                <VendorStatusDropdown
                  poId={po.id}
                  currentStatus={po.status || 'NOT_STARTED'}
                  onUpdate={handleVendorStatusUpdate}
                />
              ),
            },
          ]
        : []),
      {
        header: 'Reason for Delay',
        accessor: 'delay_reason',
        headerClassName: 'px-6 py-4',
        className: 'px-6 py-4 min-w-[150px]',
        render: (po: any) => (
          <ReasonCell
            po={po}
            onSave={handleReasonUpdate}
            autoOpen={
              autoOpenPOId === po.id || autoOpenPOId === (po as any).uuid
            }
            onClearAutoOpen={() => setAutoOpenPOId(null)}
          />
        ),
      },
      {
        header: 'Comments',
        accessor: 'commentsCount',
        headerClassName: 'px-4 py-4  text-center flex-shrink-0 w-20',
        className: 'px-4 py-4 text-center',
        render: (po: any) => {
          const count =
            parseInt(po.total_comments_count ?? po.commentsCount, 10) || 0;
          const hasComments = count > 0;
          return (
            <button
              onClick={(e: any) => {
                e.stopPropagation();
                setIsCommentOnlyView(true);
                onSelectPO(po.id);
                setTimeout(() => {
                  setActiveDrawerSection('comments');
                }, 10);
              }}
              className={`relative rounded-xl border p-2 transition ${
                hasComments
                  ? 'border-mc-gold/50 bg-mc-gold/10 text-mc-black hover:bg-mc-gold/20 hover:border-mc-gold'
                  : 'border-mc-beige-dark bg-mc-white hover:bg-mc-beige-light/50 hover:text-mc-black text-slate-400'
              }`}
              title="View Comments"
            >
              <MessageSquare className="h-5 w-5" />
              {hasComments && (
                <span className="absolute -top-2 -right-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-white bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs">
                  {count >= 1000 ? `${Math.floor(count / 1000)}K+` : count}
                </span>
              )}
            </button>
          );
        },
      },
      {
        header: (
          <div
            className="flex items-center gap-1"
            onClick={() => handleSort('creationDate')}
          >
            <div className="flex flex-col">
              <span>Order Date</span>
              <span className="text-[9px] text-slate-400 normal-case">
                (YYYY-MM-DD)
              </span>
            </div>
            <span className="group-hover:text-mc-black text-slate-400">
              {activeSortConfig.key === 'creationDate' ? (
                activeSortConfig.direction === 'asc' ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )
              ) : (
                <ArrowUpDown className="h-3 w-3 opacity-50 outline-hidden" />
              )}
            </span>
          </div>
        ),
        accessor: 'creationDate',
        headerClassName:
          'px-6 py-4  cursor-pointer select-none group hover:text-mc-black transition-colors',
        className: 'px-6 py-4',
        render: (po: any) =>
          po.creationDate && po.creationDate !== 'N/A' ? (
            <span className="text-[11px] font-bold text-slate-700">
              {po.creationDate}
            </span>
          ) : (
            <span className="rounded-sm border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] text-slate-500">
              N/A
            </span>
          ),
      },
      {
        header: 'Vendor',
        accessor: 'vendorName',
        headerClassName: 'px-6 py-4 ',
        className:
          'px-6 py-4 text-slate-700 font-medium max-w-[150px] truncate',
        render: (po: any) => {
          const rawName = po.vendorName || 'N/A';
          const truncated =
            rawName.length > 40 ? rawName.slice(0, 40) + '...' : rawName;
          return (
            <span
              className="inline-block w-full cursor-pointer truncate"
              data-tooltip-id="po-item-tooltip"
              data-tooltip-content={rawName}
            >
              {highlightText(truncated, searchQuery)}
            </span>
          );
        },
      },
      {
        header: 'Customer Name',
        accessor: 'customerName',
        headerClassName: 'px-6 py-4 ',
        className: 'px-6 py-4 text-slate-700 max-w-[150px] truncate',
        render: (po: any) => {
          let customerName = 'N/A';

          const cust = Array.isArray(po.customer)
            ? po.customer[0]
            : po.customer;

          if (cust && cust.last_name) {
            customerName = cust.last_name.trim();
          } else if (cust && cust.first_name) {
            customerName = cust.first_name.trim();
          } else if (po.last_name) {
            customerName = po.last_name.trim();
          } else if (po.first_name) {
            customerName = po.first_name.trim();
          } else if (po.customerName || po.customer_name) {
            customerName = po.customerName || po.customer_name;
          } else if (cust && (cust.customer_name || cust.name)) {
            customerName = cust.customer_name || cust.name;
          }

          return (
            <span
              className="inline-block w-full cursor-pointer truncate"
              data-tooltip-id="po-item-tooltip"
              data-tooltip-content={customerName}
            >
              {highlightText(customerName, searchQuery)}
            </span>
          );
        },
      },
      {
        header: 'Warehouse',
        accessor: 'warehouseName',
        headerClassName: 'px-6 py-4',
        className: 'px-6 py-4 text-slate-700 max-w-[150px] truncate',
        render: (po: any) => {
          const warehouse =
            po.warehouse?.name ||
            po.warehouseName ||
            po.warehouse_name ||
            (typeof po.warehouse === 'string' ? po.warehouse : 'N/A');
          return (
            <span
              className={
                warehouse === 'N/A'
                  ? 'rounded-sm border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] text-slate-500'
                  : 'inline-block w-full cursor-pointer truncate text-[11px] font-bold text-slate-700'
              }
              title={warehouse !== 'N/A' ? warehouse : undefined}
            >
              {warehouse !== 'N/A'
                ? highlightText(warehouse, searchQuery)
                : 'N/A'}
            </span>
          );
        },
      },
      {
        header: 'PO Items',
        accessor: 'items',
        headerClassName: 'px-6 py-4 ',
        className: 'px-6 py-4',
        render: (po: any) => {
          const itemCount =
            po.total_item_count ??
            (po.items && po.items.length > 0 ? po.items.length : 'N/A');
          return (
            <span
              title={
                po.items && po.items.length > 0
                  ? po.items.map((item: any) => item.name).join(', ')
                  : 'N/A'
              }
              className={
                itemCount === 'N/A' || itemCount === 0
                  ? 'rounded-sm border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] text-slate-500'
                  : 'text-[11px] font-bold text-slate-700'
              }
            >
              {itemCount}
            </span>
          );
        },
      },
      {
        header: 'Ordered / Received Qty',
        accessor: 'orderedQty',
        headerClassName: 'px-6 py-4 ',
        className: 'px-6 py-4 text-slate-600',
        render: (po: any) => {
          const ordered = po.total_qty_ordered || po.orderedQty || 0;
          const received = po.total_qty_received || po.receivedQty || 0;
          return (
            <>
              <span className="font-bold text-slate-800">{ordered}</span>
              <span className="text-slate-400"> / {received}</span>
            </>
          );
        },
      },
      {
        header: (
          <div
            className="group flex cursor-pointer items-center gap-1 select-none"
            onClick={() => handleSort('invoiceDelayStatus' as any)}
          >
            <span>Approved PO</span>
            <div
              data-tooltip-id="po-metrics-tooltip"
              data-tooltip-content="This is based on the 10-day formula. Please compare it with the Created Date to determine the result."
              className="text-mc-black hover:bg-mc-black border-mc-beige-dark bg-mc-beige-light ml-1 flex cursor-pointer items-center justify-center rounded-full border p-[1.5px] outline-hidden transition-colors hover:text-white"
            >
              <Info className="h-3 w-3" />
            </div>
            <span className="group-hover:text-mc-black text-slate-400">
              {activeSortConfig.key === 'invoiceDelayStatus' ? (
                activeSortConfig.direction === 'asc' ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )
              ) : (
                <ArrowUpDown className="h-3 w-3 opacity-50 transition hover:opacity-100" />
              )}
            </span>
          </div>
        ),
        accessor: 'invoiceDelayStatus',
        headerClassName: 'px-6 py-4 ',
        className: 'px-6 py-4',
        render: (po: any) => {
          const invoiceDate =
            (po as any).invoice_date || po.invoiceDetails?.date;
          const createdOn = (po as any).created_on || po.creationDate;
          if (invoiceDate)
            return (
              <span className="rounded-sm border border-emerald-100 bg-emerald-50 px-2 py-0.5 font-mono text-[10px] text-emerald-700">
                On Time
              </span>
            );
          if (!createdOn || createdOn === 'N/A')
            return (
              <span className="rounded-sm border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] text-slate-500">
                N/A
              </span>
            );
          const orderDate = new Date(createdOn);
          const today = new Date();
          const diffDays = Math.floor(
            (today.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24),
          );

          let hasContainer = false;
          let cArray = po.containers || [];
          if (!cArray || cArray.length === 0) {
            let fallbackIds = po.containerIds || po.containerNames || [];
            if (!fallbackIds || fallbackIds.length === 0) {
              if (po.container && po.container !== 'N/A') {
                fallbackIds = String(po.container)
                  .split(',')
                  .map((c) => c.trim())
                  .filter(Boolean);
              }
            }
            cArray = fallbackIds;
          }
          if (cArray && cArray.length > 0) hasContainer = true;

          if (diffDays > 10) {
            if (hasContainer) {
              return (
                <div className="flex flex-col items-start gap-0.5">
                  <span className="rounded-sm border border-emerald-100 bg-emerald-50 px-2 py-0.5 font-mono text-[10px] text-emerald-700">
                    On Time
                  </span>
                  <span className="font-mono text-[9px] whitespace-nowrap text-slate-500">
                    Container On Time, Invoice Delayed
                  </span>
                </div>
              );
            }
            return (
              <span className="animate-pulse rounded-sm border border-rose-100 bg-rose-50 px-2 py-0.5 font-mono text-[10px] text-rose-700">
                Delayed
              </span>
            );
          }
          return (
            <span className="rounded-sm border border-amber-100 bg-amber-50 px-2 py-0.5 font-mono text-[10px] text-amber-700">
              Pending
            </span>
          );
        },
      },
      {
        header: (
          <div
            className="flex items-center gap-1"
            onClick={() => handleSort('eta')}
          >
            <div className="flex flex-col">
              <span>ETA Delivery</span>
              <span className="text-mc-gray-soft text-[9px] normal-case">
                (YYYY-MM-DD)
              </span>
            </div>
            <span className="group-hover:text-mc-black text-mc-gray-soft">
              {activeSortConfig.key === 'eta' ? (
                activeSortConfig.direction === 'asc' ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )
              ) : (
                <ArrowUpDown className="h-3 w-3 opacity-50 outline-hidden" />
              )}
            </span>
            <div
              data-tooltip-id="po-metrics-tooltip"
              data-tooltip-content="This is based on the formula calculated using the Lead Days available after the Invoice Date."
              className="text-mc-black hover:bg-mc-black ml-1 flex cursor-pointer items-center justify-center rounded-full border border-slate-300 bg-slate-100 p-[1.5px] outline-hidden transition-colors hover:text-white"
              onClick={(e: any) => e.stopPropagation()}
            >
              <Info className="h-3 w-3" />
            </div>
          </div>
        ),
        accessor: 'expected_delivery_date',
        headerClassName:
          'px-6 py-4  cursor-pointer select-none group hover:text-mc-black transition-colors',
        className: 'px-6 py-4 text-slate-600 font-mono',
        render: (po: any) => (
          <span
            className={
              !po.expected_delivery_date || po.expected_delivery_date === 'N/A'
                ? 'rounded-sm border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] text-slate-500'
                : 'text-[11px] font-bold text-slate-700'
            }
          >
            {po.expected_delivery_date || 'N/A'}
          </span>
        ),
      },
      {
        header: 'Containers',
        accessor: 'containerIds',
        headerClassName: 'px-6 py-4  w-[200px] min-w-[200px] max-w-[200px]',
        className:
          'px-6 py-4 text-slate-600 font-mono text-xs w-[200px] max-w-[200px]',
        render: (po: any) => {
          let cArray = po.containers || [];
          if (!cArray || cArray.length === 0) {
            let fallbackIds = po.containerIds || po.containerNames || [];
            if (!fallbackIds || fallbackIds.length === 0) {
              if (po.container && po.container !== 'N/A') {
                fallbackIds = String(po.container)
                  .split(',')
                  .map((c) => c.trim())
                  .filter(Boolean);
              }
            }
            cArray = fallbackIds.map((id: string) => ({
              id,
              name: id,
              container_name: id,
              sellercloud_container_id: id,
            }));
          }

          if (!cArray || cArray.length === 0) {
            return (
              <span className="rounded-sm border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] text-slate-500">
                N/A
              </span>
            );
          }

          cArray = [...cArray].sort((a: any, b: any) => {
            const aHasDate =
              typeof a === 'object' && a !== null && !!a.received_date ? 1 : 0;
            const bHasDate =
              typeof b === 'object' && b !== null && !!b.received_date ? 1 : 0;
            return bHasDate - aHasDate;
          });
          const poKey = String(po.id || po.uuid || po.containerIds);
          const isExpanded = expandedContainerRows.has(poKey);
          const maxShow = 4;
          const visible = isExpanded ? cArray : cArray.slice(0, maxShow);
          const overflow = cArray.length - maxShow;
          return (
            <div className="flex max-w-[188px] flex-wrap gap-1">
              {visible.map((cObj: any, idx: number) => {
                const isObj = typeof cObj === 'object' && cObj !== null;
                const cId = isObj
                  ? cObj.id ||
                    cObj.sellercloud_container_id ||
                    cObj.name ||
                    cObj.container_name
                  : cObj;
                const displayName = isObj
                  ? cObj.sellercloud_container_id ||
                    cObj.container_name ||
                    cObj.name ||
                    cId
                  : cId;

                const hasReceivedDate = isObj && !!cObj.received_date;
                const highlightClass = hasReceivedDate
                  ? 'text-emerald-800 bg-emerald-100'
                  : 'text-rose-800 bg-rose-100';

                return (
                  <React.Fragment key={String(cId) + idx}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const cNameToPass = isObj
                          ? cObj.container_name || cObj.name
                          : undefined;
                        handleOpenContainerDetails(String(cId), cNameToPass);
                      }}
                      className={`max-w-[80px] cursor-pointer truncate rounded-[3px] px-[3px] text-[10px] font-medium transition-opacity hover:underline hover:opacity-80 ${highlightClass}`}
                      title={String(displayName)}
                    >
                      {String(displayName)}
                    </button>
                    {idx < visible.length - 1 && (
                      <span className="text-slate-400">,</span>
                    )}
                  </React.Fragment>
                );
              })}
              {!isExpanded && overflow > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedContainerRows((prev) => {
                      const next = new Set(prev);
                      next.add(poKey);
                      return next;
                    });
                  }}
                  className="text-mc-black cursor-pointer rounded border border-slate-300 bg-slate-100 px-1 text-[10px] leading-[18px] font-semibold transition-colors hover:bg-slate-200"
                  title="Show all containers"
                >
                  +{overflow} more
                </button>
              )}
              {isExpanded && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedContainerRows((prev) => {
                      const next = new Set(prev);
                      next.delete(poKey);
                      return next;
                    });
                  }}
                  className="cursor-pointer rounded border border-slate-200 bg-slate-100 px-1 text-[10px] leading-[18px] font-semibold text-slate-500 transition-colors hover:bg-slate-200"
                  title="Show less"
                >
                  Show less
                </button>
              )}
            </div>
          );
        },
      },

      {
        header: 'Actions',
        accessor: 'actions',
        headerClassName: 'px-6 py-4 text-center',
        className: 'px-6 py-4 text-center',
        render: (po: any) => {
          const poKey = String(
            po.id ||
              po.sellercloud_po_id ||
              String(po.uuid || '').replace(/^P[O0]-/i, '') ||
              '',
          );
          const isSyncingThisPO =
            syncingPOIds.has(poKey) ||
            (po.sellercloud_po_id &&
              syncingPOIds.has(String(po.sellercloud_po_id))) ||
            (po.id && syncingPOIds.has(String(po.id)));

          return (
            <div className="flex items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={(e: any) => {
                  e.stopPropagation();
                  handleSyncSinglePO(po);
                }}
                disabled={isSyncingThisPO}
                title={isSyncingThisPO ? 'Syncing...' : 'Sync Purchase Order'}
                className="text-mc-black hover:bg-mc-beige-light hover:text-mc-gold inline-flex items-center justify-center rounded-md p-1.5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isSyncingThisPO ? 'animate-spin text-mc-gold' : ''}`}
                />
              </button>
              <button
                type="button"
                onClick={(e: any) => {
                  e.stopPropagation();
                  setIsCommentOnlyView(false);
                  onSelectPO(po.id);
                }}
                title="View Details"
                className="text-mc-black inline-flex items-center gap-1 rounded-md p-1.5 font-semibold hover:bg-slate-100"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        },
      },
    ],
    [
      activeSortConfig,
      handleSort,
      selectedPOId,
      onSelectPO,
      userRole,
      purchaseOrders,
      searchQuery,
      syncingPOIds,
      handleSyncSinglePO,
    ],
  );

  const visiblePOColumns = React.useMemo(
    () => poColumns.filter((col: any) => isPOColumnVisible(col.accessor)),
    [poColumns, isPOColumnVisible],
  );

  const handleUpdateItemQty = React.useCallback(
    async (itemIdOrSku: string, newQty: number) => {
      if (!selectedPOId) return;
      try {
        try {
          await updatePurchaseOrderItemQuantity(itemIdOrSku, newQty);
        } catch (itemErr) {
          console.warn(
            'Item specific update failed, falling back to PO patch.',
            itemErr,
          );
          await patchPurchaseOrder(selectedPOId.replace(/^PO-/i, ''), {
            items: [
              { sku: itemIdOrSku, qty: newQty, qty_ordered: newQty } as any,
            ],
          });
        }
        toast.success('Ordered Quantity updated successfully.');
        onAddActivity(
          `Updated Ordered Quantity for Item ${itemIdOrSku} to ${newQty}`,
          'PO Updated',
        );
        // Optimistic UI state update initially
        const targetPo = purchaseOrders.find(
          (p: any) => p.id === selectedPOId || p.uuid === selectedPOId,
        );
        if (targetPo) {
          const newItems = targetPo.items.map((it: any) =>
            it.sku === itemIdOrSku ||
            it.id === itemIdOrSku ||
            it.uuid === itemIdOrSku ||
            it.po_item_id === itemIdOrSku ||
            it.poItemId === itemIdOrSku
              ? { ...it, qty: newQty, qty_ordered: newQty, orderedQty: newQty }
              : it,
          );
          const updatedPo = {
            ...targetPo,
            items: newItems,
            orderedQty: newItems.reduce(
              (acc: number, it: any) => acc + (it.qty || it.qty_ordered || 0),
              0,
            ),
          };
          dispatch(
            setPurchaseOrdersList(
              purchaseOrders.map((p: any) =>
                p.id === updatedPo.id ? updatedPo : p,
              ),
            ),
          );
          setDetailedPOItems((prev) => (prev.length > 0 ? newItems : prev));

          // Background call to ensure true backend sync without flashing loaders
          getPurchaseOrderById(selectedPOId.replace(/^PO-/i, ''))
            .then((rawPo) => {
              if (rawPo && rawPo.items) {
                const verifiedItems = rawPo.items.map((rawItem: any) => ({
                  ...rawItem,
                  sku: rawItem.sku || 'N/A',
                  name: rawItem.product_name || rawItem.name || 'N/A',
                  qty:
                    rawItem.qty_ordered !== undefined
                      ? rawItem.qty_ordered
                      : rawItem.qty || 0,
                  receivedQty:
                    rawItem.qty_received !== undefined
                      ? rawItem.qty_received
                      : rawItem.receivedQty || 0,
                  unitPrice:
                    rawItem.unit_price !== undefined
                      ? rawItem.unit_price
                      : rawItem.unitPrice || 0,
                  expected_delivery_date: rawItem.expected_delivery_date
                    ? rawItem.expected_delivery_date.split('T')[0]
                    : null,
                }));
                const verifiedPo = {
                  ...updatedPo,
                  items: verifiedItems,
                  orderedQty: verifiedItems.reduce(
                    (acc: number, it: any) =>
                      acc + (it.qty || it.qty_ordered || 0),
                    0,
                  ),
                };
                dispatch(
                  setPurchaseOrdersList(
                    purchaseOrders.map((p: any) =>
                      p.id === verifiedPo.id ? verifiedPo : p,
                    ),
                  ),
                );
                setDetailedPOItems((prev) =>
                  prev.length > 0 ? verifiedItems : prev,
                );
              }
            })
            .catch((err) => {
              console.error('Background PO refresh failed', err);
            });
        }
      } catch (error) {
        toast.error('Failed to update Ordered Quantity.');
        throw error;
      }
    },
    [selectedPOId, purchaseOrders, dispatch, onRefreshData, onAddActivity],
  );

  const poItemColumns = React.useMemo(
    () => [
      {
        header: 'SKU',
        accessor: 'sku',
        headerClassName: 'px-3 py-2 w-40',
        className: 'px-3 py-2 min-w-[140px] whitespace-nowrap',
        render: (item: any) => (
          <div
            className="group flex cursor-pointer items-center gap-1.5"
            onClick={(e: any) => {
              e.stopPropagation();
              if (item.sku) {
                navigator.clipboard.writeText(item.sku);
                toast.success('SKU copied to clipboard!');
              }
            }}
          >
            <span
              className="group-hover:text-mc-gold truncate font-mono font-bold text-slate-500 transition-colors"
              data-tooltip-id="po-item-tooltip"
              data-tooltip-content={item.sku}
            >
              {item.sku}
            </span>
            {item.sku && (
              <Copy className="group-hover:text-mc-gold h-3.5 w-3.5 text-slate-400 transition-colors" />
            )}
          </div>
        ),
      },
      {
        header: 'Image',
        accessor: 'image',
        headerClassName: 'px-3 py-2 w-16 text-center pr-6',
        className: 'px-3 py-2 w-16 text-center pr-6',
        render: (item: any) => {
          const imageSrc =
            item.image_url ||
            item.imageUrl ||
            item.image ||
            item.imageSource ||
            item.product_image ||
            null;

          if (imageSrc) {
            return (
              <div
                className="group/img relative mx-auto flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded border border-slate-200 transition-colors hover:border-slate-400"
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  setPreviewAnchor({ top: rect.bottom + 6, left: rect.left });
                  setPreviewImage(imageSrc);
                }}
              >
                <img
                  src={imageSrc}
                  alt={item.sku || 'Product Image'}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover/img:bg-black/40 group-hover/img:opacity-100">
                  <Eye className="h-3.5 w-3.5 text-white" />
                </div>
              </div>
            );
          }
          return (
            <div
              className="bg-mc-beige-light text-mc-gray-soft mx-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded"
              title="No image available"
            >
              <Package className="h-4 w-4" />
            </div>
          );
        },
      },

      {
        header: 'Product Name',
        accessor: 'name',
        headerClassName: 'px-3 py-2 pl-6',
        className: 'px-3 py-2 max-w-[150px] pl-6',
        render: (item: any) => {
          const productName =
            item.name ||
            item.product_name ||
            item.productName ||
            item.ProductName ||
            'Unknown Product';

          return (
            <div className="group flex items-start gap-1">
              <span
                className="cursor-pointer font-medium text-slate-800"
                data-tooltip-id="po-item-tooltip"
                data-tooltip-content={productName}
              >
                {productName.length > 25
                  ? productName.substring(0, 25) + '...'
                  : productName}
              </span>
              <button
                title="Copy Product Name"
                onClick={(e: any) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(productName);
                  toast.success('Product Name copied!');
                }}
                className="hover:text-mc-black mt-0.5 shrink-0 text-slate-400 opacity-0 transition group-hover:opacity-100"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
          );
        },
      },
      {
        header: 'Ordered Qty',
        accessor: 'qty',
        headerClassName: 'px-3 py-2 text-right',
        className: 'px-3 py-2 pr-4', // Provide some padding for the inline editor
        render: (item: any) => {
          const qty = item.qty_ordered ?? item.qty ?? item.orderedQty ?? 0;
          return (
            <InlineQtyEditor
              item={item}
              initialQty={qty}
              poId={selectedPOId}
              onSave={handleUpdateItemQty}
              userRole={userRole}
            />
          );
        },
      },
      {
        header: 'Received Qty',
        accessor: 'receivedQty',
        headerClassName: 'px-3 py-2  text-right',
        className: 'px-3 py-2 text-right font-mono font-medium text-slate-500',
        render: (item: any) => {
          const rQty =
            item.qty_received ?? item.receivedQty ?? item.received_qty ?? 0;
          return Number(rQty).toLocaleString();
        },
      },
      {
        header: 'Remaining Qty',
        accessor: 'remainingQty',
        headerClassName: 'px-3 py-2  text-right',
        className: (item: any) => {
          const oQty = item.qty_ordered ?? item.qty ?? item.orderedQty ?? 0;
          const rQty =
            item.qty_received ?? item.receivedQty ?? item.received_qty ?? 0;
          const remQty =
            item.qty_remaining !== undefined && item.qty_remaining !== null
              ? item.qty_remaining
              : item.remainingQty !== undefined && item.remainingQty !== null
                ? item.remainingQty
                : Math.max(0, oQty - rQty);
          return `px-3 py-2 text-right font-mono ${remQty > 0 ? 'text-amber-700 font-bold' : 'font-medium text-slate-500'}`;
        },
        render: (item: any) => {
          const oQty = item.qty_ordered ?? item.qty ?? item.orderedQty ?? 0;
          const rQty =
            item.qty_received ?? item.receivedQty ?? item.received_qty ?? 0;
          const remQty =
            item.qty_remaining !== undefined && item.qty_remaining !== null
              ? item.qty_remaining
              : item.remainingQty !== undefined && item.remainingQty !== null
                ? item.remainingQty
                : Math.max(0, oQty - rQty);
          return Number(remQty).toLocaleString();
        },
      },
      {
        header: 'Unit Price',
        accessor: 'unitPrice',
        headerClassName: 'px-3 py-2  text-right',
        className: 'px-3 py-2 text-right font-mono font-medium text-slate-500',
        render: (item: any) => {
          const uPrice = item.unit_price ?? item.unitPrice ?? item.price ?? 0;
          return `$${Number(uPrice).toFixed(2)}`;
        },
      },
      {
        header: 'Total',
        accessor: 'total',
        headerClassName: 'px-3 py-2  text-right',
        className: 'px-3 py-2 text-right font-mono font-bold text-slate-800',
        render: (item: any) => {
          const oQty = item.qty_ordered ?? item.qty ?? item.orderedQty ?? 0;
          const uPrice = item.unit_price ?? item.unitPrice ?? item.price ?? 0;
          return `$${(Number(oQty) * Number(uPrice)).toFixed(2)}`;
        },
      },
      {
        header: 'Container/Items Count',
        accessor: 'containerInfo',
        headerClassName: 'px-3 py-2  text-left',
        className: 'px-3 py-2 text-left font-mono font-medium text-slate-600',
        render: (item: any) => {
          if (!item.containers || item.containers.length === 0)
            return (
              <span className="rounded-sm border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                Unassigned
              </span>
            );
          return (
            <div className="flex flex-col gap-0.5">
              {item.containers.map((c: any, idx: number) => {
                const isObj = typeof c === 'object' && c !== null;
                const cDbId = isObj ? c.id : null;
                const cScId = isObj ? c.sellercloud_container_id : null;
                const cName = isObj
                  ? c.container_name || c.name || 'Unnamed'
                  : String(c);
                const cClickId = isObj
                  ? c.id ||
                    c.sellercloud_container_id ||
                    c.name ||
                    c.container_name
                  : c;
                const qty = isObj ? (c.qty_in_container ?? 0) : 0;
                const displayId = cScId || cDbId;
                return (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (cClickId)
                        handleOpenContainerDetails(
                          String(cClickId),
                          String(cName),
                        );
                    }}
                    className="text-mc-black cursor-pointer rounded-sm bg-slate-100 px-1.5 py-0.5 text-left font-mono text-[11px] whitespace-nowrap transition-colors hover:bg-slate-200"
                  >
                    {displayId ? `[${displayId}]` : ''}
                    {cName}({qty})
                  </button>
                );
              })}
            </div>
          );
        },
      },
      {
        header: 'Container Details',
        accessor: 'details',
        headerClassName: 'px-3 py-2  text-left',
        className: 'px-3 py-2 text-left font-mono text-[11px] text-slate-500',
        render: (item: any) => {
          if (!item.containers || item.containers.length === 0)
            return <span className="text-[10px] text-slate-400">N/A</span>;
          return (
            <div className="flex flex-col gap-0.5">
              {item.containers.map((c: any, idx: number) => {
                const isObj = typeof c === 'object' && c !== null;
                const rawDate = isObj
                  ? c.estimated_arrival_date || c.received_date
                  : null;
                const displayDate = rawDate ? rawDate.split('T')[0] : 'TBD';
                const cId = isObj
                  ? c.id ||
                    c.sellercloud_container_id ||
                    c.name ||
                    c.container_name
                  : c;
                return (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (cId) {
                        const passName = isObj
                          ? c.container_name || c.name
                          : undefined;
                        handleOpenContainerDetails(String(cId), passName);
                      }
                    }}
                    className="cursor-pointer rounded-sm border border-slate-100 bg-slate-50 px-1.5 py-0.5 text-left whitespace-nowrap transition-colors hover:border-slate-300 hover:bg-slate-100"
                  >
                    ETA:{' '}
                    <strong className="text-mc-black">{displayDate}</strong>
                  </button>
                );
              })}
            </div>
          );
        },
      },
      {
        header: 'Comments',
        accessor: 'id', // or just a placeholder
        headerClassName: 'px-6 py-4  text-center w-24',
        className: 'px-3 py-2 text-center',
        render: (item: any) => {
          const count =
            parseInt(
              item.commentsCount ||
                item.comments_count ||
                item.commentCount ||
                item.comment_count ||
                item.total_comments ||
                (Array.isArray(item.comments) ? item.comments.length : 0),
              10,
            ) || 0;
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (item.id !== undefined || item.sku) {
                  // Determine ID natively or fallback only if strictly missing
                  const resolvedId =
                    item.id !== undefined && item.id !== null
                      ? item.id
                      : item.sku;
                  const detailItem = { ...item, id: resolvedId };
                  const event = new CustomEvent('open-item-comments', {
                    detail: detailItem,
                  });
                  window.dispatchEvent(event);
                } else {
                  toast.error('This item lacks an identifier.');
                }
              }}
              className={`relative inline-flex rounded-lg border p-1.5 transition ${
                count > 0
                  ? 'border-mc-gold/50 bg-mc-gold/10 text-mc-black hover:bg-mc-gold/20 hover:border-mc-gold'
                  : 'border-mc-beige-dark bg-mc-white hover:bg-mc-beige-light/50 hover:text-mc-black text-slate-400'
              }`}
              title="Item Comments"
            >
              <MessageSquare className="h-4 w-4" />
              {count > 0 && (
                <span className="absolute -top-2 -right-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-white bg-rose-500 px-1 text-[9px] font-bold text-white shadow-xs">
                  {count >= 1000 ? `${Math.floor(count / 1000)}K+` : count}
                </span>
              )}
            </button>
          );
        },
      },
    ],
    [selectedPOId, handleUpdateItemQty, userRole],
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col space-y-6 overflow-hidden">
      <div className="absolute top-0 left-0 z-[9999] h-0 w-0 overflow-visible">
        <Tooltip
          id="po-item-tooltip"
          place="top"
          positionStrategy="fixed"
          style={{
            backgroundColor: '#F4EFE8',
            color: '#151717',
            fontWeight: 500,
            fontSize: '11px',
            zIndex: 100,
            padding: '4px 8px',
            borderRadius: '6px',
            maxWidth: '300px',
          }}
        />
      </div>
      {/* Tab Header Controls */}
      <div className="border-mc-beige-dark bg-mc-white flex flex-shrink-0 flex-col gap-4 rounded-xl border p-4 shadow-none md:flex-row md:items-center md:justify-between">
        <div className="bg-mc-beige-light text-mc-black flex w-fit items-center gap-1 rounded-lg p-1">
          <button
            onClick={() => setActiveSubTab('grid')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition ${
              activeSubTab === 'grid'
                ? 'bg-mc-white text-mc-black shadow-none'
                : 'text-mc-gray-soft hover:text-mc-black'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Master Grid View</span>
          </button>

          <button
            onClick={() => setActiveSubTab('kanban')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition ${
              activeSubTab === 'kanban'
                ? 'bg-mc-white text-mc-black shadow-none'
                : 'text-mc-gray-soft hover:text-mc-black'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>kanban Overview</span>
          </button>
        </div>

        {/* Global actions: Create PO, Import, Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-xs font-medium transition"
          >
            <FileUp className="h-3.5 w-3.5" />
            <span>Import CSV</span>
          </button> */}

          {activeSubTab !== 'kanban' && (
            <>
              {!isVendor && (
                <div className="relative" ref={syncMenuRef}>
                  <button
                    onClick={() => setShowSyncMenu(!showSyncMenu)}
                    disabled={isSyncing}
                    className="border-mc-beige-dark bg-mc-beige-light text-mc-black hover:bg-mc-beige-dark flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`}
                    />
                    <span>
                      {isSyncing ? 'Syncing...' : 'Sync Order SellerCloud'}
                    </span>
                    <ChevronDown className="ml-0.5 h-3.5 w-3.5 text-slate-500" />
                  </button>

                  {showSyncMenu && (
                    <div className="border-mc-beige-dark animate-fadeIn absolute top-full right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border bg-white shadow-xl">
                      <div className="border-mc-beige-dark border-b bg-slate-50 px-3 py-2">
                        <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                          Select timeframe
                        </span>
                      </div>
                      <div className="flex flex-col py-1">
                        <button
                          onClick={() => handleSyncSellerCloud('1')}
                          className="text-mc-black hover:bg-mc-beige-light px-4 py-2 text-left text-xs font-medium transition"
                        >
                          Past 1 Day
                        </button>
                        <button
                          onClick={() => handleSyncSellerCloud('3')}
                          className="text-mc-black hover:bg-mc-beige-light px-4 py-2 text-left text-xs font-medium transition"
                        >
                          Past 3 Days
                        </button>
                        <button
                          onClick={() => handleSyncSellerCloud('7')}
                          className="text-mc-black hover:bg-mc-beige-light px-4 py-2 text-left text-xs font-medium transition"
                        >
                          Past 7 Days
                        </button>
                        <button
                          onClick={() => handleSyncSellerCloud('all')}
                          className="text-mc-black hover:bg-mc-beige-light px-4 py-2 text-left text-xs font-medium transition"
                        >
                          Fetch All
                        </button>
                      </div>

                      {/* Manual PO Number Sync */}
                      <div className="border-t border-slate-100 bg-slate-50/70 p-3">
                        <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-1.5">
                          Or Sync Specific PO
                        </span>
                        <form
                          onSubmit={handleManualPOSync}
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            placeholder="Enter PO # (e.g. 104523)"
                            value={manualPoInput}
                            onChange={(e) => setManualPoInput(e.target.value)}
                            className="focus:border-mc-gold focus:ring-mc-gold w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:ring-1 focus:outline-none"
                          />
                          <button
                            type="submit"
                            disabled={!manualPoInput.trim() || isSyncingManualPO}
                            className="bg-mc-black hover:bg-black text-white flex items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isSyncingManualPO ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              'Sync'
                            )}
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {onRefreshData && (
                <button
                  onClick={onRefreshData}
                  disabled={loading}
                  className="border-mc-beige-dark bg-mc-white text-mc-gray-soft hover:bg-mc-beige-light hover:text-mc-black flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
                  />
                  <span>{loading ? 'Refreshing...' : 'Refresh Data'}</span>
                </button>
              )}
              <button
                onClick={handleExportCSVClick}
                className="border-mc-beige-dark bg-mc-white text-mc-gray-soft hover:bg-mc-beige-light hover:text-mc-black flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-bold transition"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </button>
            </>
          )}

          {/* {userRole !== 'Vendor' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1 px-3.5 py-1.5 bg-mc-black text-white rounded-lg hover:bg-black text-xs font-medium transition shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Purchase Order</span>
            </button>
          )} */}
        </div>
      </div>

      <div className="border-mc-beige-dark bg-mc-white flex flex-shrink-0 flex-col gap-3 rounded-xl border p-4 shadow-none">
        {/* Row 1: Search */}
        <div className="flex w-full">
          {activeSubTab === 'kanban' && (
            <div className="flex-1">
              <h3 className="font-display text-mc-black text-sm font-bold">
                Purchase Order Overview
              </h3>
            </div>
          )}
          {activeSubTab !== 'kanban' && (
            <div className="relative w-full">
              <Search className="text-mc-gray-soft absolute top-2.5 left-3 h-4 w-4" />
              <input
                type="text"
                placeholder="Smart Search: PO number, Order id, Vendor, Customer name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-mc-beige-dark bg-mc-white focus:border-mc-black w-full rounded-lg border py-2 pr-8 pl-9 text-sm transition focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-mc-gray-soft hover:bg-mc-beige-light hover:text-mc-black absolute top-2.5 right-3 rounded-full p-0.5 transition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Row 2: Filters */}
        <div className="flex flex-wrap items-center gap-4">
          {activeSubTab !== 'kanban' && (
            <>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Filter className="text-mc-gray-soft h-3.5 w-3.5" />
                  <span className="text-mc-gray-soft text-xs font-bold">
                    PO Completion:
                  </span>
                </div>
                <div className="w-32">
                  <CompletionFilterDropdown
                    currentStatus={completionFilter}
                    onChange={setCompletionFilter}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Filter className="text-mc-gray-soft h-3.5 w-3.5" />
                  <span className="text-mc-gray-soft text-xs font-bold">
                    Status:
                  </span>
                </div>
                <div className="w-40">
                  <StatusFilterDropdown
                    currentStatus={statusFilter}
                    onChange={setStatusFilter}
                  />
                </div>
              </div>
            </>
          )}
          {activeSubTab !== 'kanban' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Filter className="text-mc-gray-soft h-3.5 w-3.5" />
                <span className="text-mc-gray-soft text-xs font-bold whitespace-nowrap">
                  Approved Status:
                </span>
              </div>
              <div className="w-44">
                <ApprovedStatusFilterDropdown
                  currentStatus={approvedStatusFilter}
                  onChange={setApprovedStatusFilter}
                />
              </div>
            </div>
          )}
          {userRole !== 'Vendor' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Filter className="text-mc-gray-soft h-3.5 w-3.5" />
                <span className="text-mc-gray-soft text-xs font-bold">
                  Vendor:
                </span>
              </div>
              <div className="w-40">
                <VendorInfiniteDropdown
                  value={vendorFilter}
                  onChange={setVendorFilter}
                  showAllOption={true}
                  placeholder="All Vendors"
                  className="border-mc-beige-dark bg-mc-white text-mc-black focus:border-mc-gold focus:ring-mc-gold w-full rounded-lg border p-2 text-xs focus:ring-1 focus:outline-none"
                />
              </div>
            </div>
          )}
          {userRole !== 'Vendor' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Filter className="text-mc-gray-soft h-3.5 w-3.5" />
                <span className="text-mc-gray-soft text-xs font-bold">
                  Customer:
                </span>
              </div>
              <div className="w-40">
                <CustomerDropdown
                  value={propCustomerFilter ?? localCustomerFilter}
                  onChange={(val) => {
                    if (propOnCustomerFilterChange)
                      propOnCustomerFilterChange(val);
                    else setLocalCustomerFilter(val);
                  }}
                  showAllOption={true}
                  placeholder="All Customers"
                  className="border-mc-beige-dark bg-mc-white text-mc-black focus:border-mc-gold focus:ring-mc-gold w-full rounded-lg border p-2 text-xs focus:ring-1 focus:outline-none"
                />
              </div>
            </div>
          )}
          {userRole !== 'Vendor' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Filter className="text-mc-gray-soft h-3.5 w-3.5" />
                <span className="text-mc-gray-soft text-xs font-bold">
                  Channel Id:
                </span>
              </div>
              <div className="w-40">
                <ChannelDropdown
                  value={propChannelFilter ?? localChannelFilter}
                  onChange={(val) => {
                    if (propOnChannelFilterChange)
                      propOnChannelFilterChange(val);
                    else setLocalChannelFilter(val);
                  }}
                  showAllOption={true}
                  placeholder="All Channels"
                  className="border-mc-beige-dark bg-mc-white text-mc-black focus:border-mc-gold focus:ring-mc-gold w-full rounded-lg border p-2 text-xs focus:ring-1 focus:outline-none"
                />
              </div>
            </div>
          )}
          {activeSubTab !== 'kanban' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <CalendarDays className="text-mc-gray-soft h-3.5 w-3.5" />
                <span className="text-mc-gray-soft text-xs font-bold whitespace-nowrap">
                  Order Date:
                </span>
              </div>
              <div className="flex items-center gap-1">
                <DateFilterInput
                  value={dateFrom || ''}
                  onChange={(val) => {
                    setDateFrom(val);
                    handlePageChange(1);
                  }}
                  title="Order Date From"
                  mode="date"
                />
                <span className="text-mc-gray-soft font-bold">-</span>
                <DateFilterInput
                  value={dateTo || ''}
                  onChange={(val) => {
                    setDateTo(val);
                    handlePageChange(1);
                  }}
                  title="Order Date To"
                  mode="date"
                  minDate={dateFrom}
                />
              </div>
            </div>
          )}
          {activeSubTab === 'grid' && (
            <ColumnsDropdown
              columns={PO_COLUMN_DEFS}
              isVisible={isPOColumnVisible}
              onToggle={togglePOColumn}
              onSave={savePOColumnVisibility}
              saving={savingPOColumns}
            />
          )}
        </div>
      </div>

      {/* SUB-VIEW 1: MASTER GRID VIEW */}
      {activeSubTab === 'grid' && (
        <div className="border-mc-beige-dark bg-mc-white relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border shadow-xs">
          {loading && <TableLoader />}
          <TypedDataTable
            columns={visiblePOColumns}
            data={paginatedPOs}
            keyField="id"
            containerClassName="flex-1 flex flex-col min-h-0 w-full relative"
            tableWrapperClassName="overflow-auto flex-1 custom-scrollbar scroll-smooth"
            tableWrapperRef={poTableRef}
            theadClassName="bg-mc-beige-light border-b border-mc-beige-dark text-mc-black uppercase tracking-widest text-[10px] font-extrabold sticky top-0 z-10"
            tableClassName="w-full min-w-max whitespace-nowrap text-left text-xs border-collapse"
            tbodyClassName="divide-y divide-mc-beige-dark/40 bg-mc-white"
            trClassName={(po: any) =>
              `transition bg-mc-white ${isPoMatch(po, selectedPOId) ? 'bg-mc-gold/10 font-bold' : 'hover:bg-mc-beige-light/30'}`
            }
            emptyMessage="No Purchase Orders found matching search or filter parameters."
            pagination={
              validTotalCount > 5 ? (
                <Pagination
                  currentPage={normalizedCurrentPage}
                  totalCount={validTotalCount}
                  pageSize={pageSize}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                />
              ) : null
            }
          />
        </div>
      )}

      {/* SUB-VIEW 2: KANBAN PRODUCTION STAGES */}
      {activeSubTab === 'kanban' && (
        <div className="relative flex min-h-0 flex-1 flex-col">
          {loading && <TableLoader />}
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto pb-4 md:grid-cols-4">
            {[
              { name: '1. New', key: 'new_without_invoice' },
              { name: '2. Invoice Delayed', key: 'invoice_delayed' },
              { name: '3. Delivery Delayed', key: 'delivery_overdue' },
              { name: '4. Remaining Order Items', key: 'remaining_items' },
            ].map(({ name: stage, key }) => {
              const stagePOs = kanbanList[key] || [];
              return (
                <div
                  key={stage}
                  className="flex min-h-[500px] flex-col rounded-xl border border-slate-200/50 bg-slate-100/50 p-4"
                >
                  <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-2">
                    <h4 className="text-xs font-bold tracking-wide text-slate-800 uppercase">
                      {stage}
                    </h4>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-700">
                      {stagePOs.length}
                    </span>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto">
                    {stagePOs.map((po) => (
                      <div
                        key={po.id}
                        onClick={() => onSelectPO(po.id)}
                        className="group relative cursor-pointer space-y-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition hover:shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-slate-800">
                            {po.id}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSyncSinglePO(po);
                            }}
                            disabled={
                              syncingPOIds.has(String(po.id || '')) ||
                              (po.sellercloud_po_id &&
                                syncingPOIds.has(String(po.sellercloud_po_id)))
                            }
                            title="Sync Purchase Order"
                            className="text-mc-black hover:bg-slate-100 rounded-md p-1 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <RefreshCw
                              className={`h-3.5 w-3.5 ${
                                syncingPOIds.has(String(po.id || '')) ||
                                (po.sellercloud_po_id &&
                                  syncingPOIds.has(String(po.sellercloud_po_id)))
                                  ? 'animate-spin text-mc-gold'
                                  : ''
                              }`}
                            />
                          </button>
                        </div>

                        <div>
                          <p className="truncate text-[11px] font-bold text-slate-700">
                            {po.vendorName}
                          </p>
                          <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                            ETA: {po.eta}
                          </p>
                        </div>

                        <div className="flex flex-col gap-2 border-t border-slate-100/60 pt-2.5 font-mono text-[10px] text-slate-500">
                          <div className="flex items-center justify-between">
                            <span>
                              Ordered:{' '}
                              <span className="font-bold text-slate-700">
                                {po.total_qty_ordered ?? po.orderedQty ?? 0}
                              </span>
                            </span>
                            <span>
                              Received:{' '}
                              <span className="font-bold text-slate-700">
                                {po.total_qty_received ?? po.receivedQty ?? 0}
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>
                              Created:{' '}
                              <span className="font-bold text-slate-700">
                                {po.creationDate || 'N/A'}
                              </span>
                            </span>
                            {po.container && po.container !== 'N/A' && (
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-sans text-[9px] text-slate-600">
                                {po.container}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 text-[10px] font-medium text-slate-600">
                          <span>
                            Items:{' '}
                            {po.total_item_count || po.items?.length || 0}
                          </span>
                          <span>
                            Comments:{' '}
                            {po.total_comments_count ?? po.commentsCount ?? 0}
                          </span>
                        </div>

                        <div className="flex items-center justify-center pt-2">
                          <span className="text-mc-black group-hover:text-mc-black flex items-center gap-1 text-[10px] font-semibold transition">
                            Show more details <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    ))}
                    {stagePOs.length === 0 && (
                      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 text-[10px] text-slate-400 italic">
                        No orders in stage
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <SellerCloudSyncLoading
        isOpen={isSyncing}
        title="Syncing  Order Data"
        onForceClose={() => setIsSyncing(false)}
      />
      {isLocatingComment && (
        <FullPageLoader message="Locating shared comment..." />
      )}
      {/* PO DETAIL OVERLAY MODAL (Rule 2) */}
      {selectedPO &&
        createPortal(
          <div
            onClick={() => {
              onSelectPO(null);
              setIsCommentOnlyView(false);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`rounded-2xl border border-slate-100 bg-white shadow-xl ${isCommentOnlyView ? 'h-[80vh] max-h-[80vh] max-w-xl w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl' : 'h-[900px] max-h-[95vh] w-[1400px] max-w-[95vw]'} animate-scaleUp flex flex-col overflow-hidden`}
            >
              {/* Header */}
              {!isCommentOnlyView && (
                <div className="z-20 flex items-center justify-between border-b border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg border border-slate-200 bg-white px-3 py-1 font-mono text-base font-bold text-slate-900">
                      {selectedPO.id}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">
                        {selectedPO.vendorName}
                      </h3>
                      <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                        Order ID:{' '}
                        {!selectedPO.orderId || selectedPO.orderId === 'N/A'
                          ? 'Stock'
                          : selectedPO.orderId}{' '}
                        • Created: {selectedPO.creationDate}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSyncSinglePO(selectedPO)}
                      disabled={
                        syncingPOIds.has(String(selectedPO.id || '')) ||
                        (selectedPO.sellercloud_po_id &&
                          syncingPOIds.has(String(selectedPO.sellercloud_po_id)))
                      }
                      className="text-mc-black mr-2 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold shadow-sm transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Sync this Purchase Order"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${
                          syncingPOIds.has(String(selectedPO.id || '')) ||
                          (selectedPO.sellercloud_po_id &&
                            syncingPOIds.has(String(selectedPO.sellercloud_po_id)))
                            ? 'animate-spin text-mc-gold'
                            : ''
                        }`}
                      />
                      <span>
                        {syncingPOIds.has(String(selectedPO.id || '')) ||
                        (selectedPO.sellercloud_po_id &&
                          syncingPOIds.has(String(selectedPO.sellercloud_po_id)))
                          ? 'Syncing...'
                          : 'Sync PO'}
                      </span>
                    </button>

                    <button
                      onClick={() => handleExportPO(selectedPO)}
                      className="text-mc-black mr-2 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold shadow-sm transition hover:bg-slate-200"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Export File
                    </button>

                    {selectedPO.sellercloud_link && !isVendor && (
                      <button
                        onClick={() =>
                          window.open(selectedPO.sellercloud_link, '_blank')
                        }
                        className="text-mc-black mr-2 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold shadow-sm transition hover:bg-slate-200"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open in Sellercloud
                      </button>
                    )}

                    <button
                      onClick={() => {
                        onSelectPO(null);
                        setIsCommentOnlyView(false);
                      }}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}

              {isCommentOnlyView && (
                <div className="z-20 flex items-center justify-between border-b border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-slate-800">
                      {selectedPO.id} - Comments
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      onSelectPO(null);
                      setIsCommentOnlyView(false);
                    }}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}

              {/* Tab Selection inside Modal */}
              {!isCommentOnlyView && (
                <div className="z-20 flex border-b border-slate-100 bg-slate-50/50">
                  {(['details', 'comments'] as const).map((section) => (
                    <button
                      key={section}
                      onClick={() => setActiveDrawerSection(section)}
                      className={`flex-1 border-b-2 py-3 text-xs font-bold capitalize transition ${
                        activeDrawerSection === section
                          ? 'text-mc-black border-mc-gold bg-white'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {section}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex min-h-0 flex-1 flex-col p-6">
                {/* TAB: DETAILS */}
                {activeDrawerSection === 'details' && !isCommentOnlyView && (
                  <div className="flex min-h-0 flex-1 flex-col">
                    <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 md:grid-cols-3">
                      {/* Stats Panel - Changed from col-span-2 to col-span-3 to occupy full width while Internal Approval Status is temporarily hidden */}
                      <div className="flex min-h-0 flex-col space-y-3 md:col-span-3">
                        <div className="grid shrink-0 grid-cols-6 gap-4">
                          <div className="border-mc-beige-dark bg-mc-white rounded-xl border p-3 shadow-xs">
                            <span className="block text-[10px] font-medium text-slate-400">
                              PO Number
                            </span>
                            <strong className="font-mono text-sm font-bold text-slate-800">
                              {selectedPO.id}
                            </strong>
                          </div>
                          <div className="border-mc-beige-dark bg-mc-white rounded-xl border p-3 shadow-xs">
                            <span className="block text-[10px] font-medium text-slate-400">
                              Order ID
                            </span>
                            <strong className="font-mono text-sm font-bold text-slate-800">
                              {!selectedPO.orderId ||
                              selectedPO.orderId === 'N/A'
                                ? 'Stock'
                                : selectedPO.orderId}
                            </strong>
                          </div>
                          <div className="border-mc-beige-dark bg-mc-white rounded-xl border p-3 shadow-xs">
                            <span className="block text-[10px] font-medium text-slate-400">
                              Ordered Quantity
                            </span>
                            <strong className="font-mono text-sm font-bold text-slate-800">
                              {selectedPO.orderedQty ||
                                allItemsForPO.reduce(
                                  (sum: number, i: any) =>
                                    sum +
                                    (i.qty_ordered ??
                                      i.qty ??
                                      i.orderedQty ??
                                      0),
                                  0,
                                )}{' '}
                              units
                            </strong>
                          </div>
                          <div className="border-mc-beige-dark bg-mc-white rounded-xl border p-3 shadow-xs">
                            <span className="block text-[10px] font-medium text-slate-400">
                              Received Quantity
                            </span>
                            <strong className="font-mono text-sm font-bold text-slate-800">
                              {selectedPO.receivedQty ||
                                allItemsForPO.reduce(
                                  (sum: number, i: any) =>
                                    sum +
                                    (i.qty_received ??
                                      i.receivedQty ??
                                      i.received_qty ??
                                      0),
                                  0,
                                )}{' '}
                              units
                            </strong>
                          </div>
                          <div className="border-mc-beige-dark bg-mc-white rounded-xl border p-3 shadow-xs">
                            <span className="block text-[10px] font-medium text-slate-400">
                              Remaining Quantity
                            </span>
                            <strong className="font-mono text-sm font-bold text-slate-800">
                              {Math.max(
                                0,
                                (selectedPO.orderedQty ||
                                  allItemsForPO.reduce(
                                    (sum: number, i: any) =>
                                      sum +
                                      (i.qty_ordered ??
                                        i.qty ??
                                        i.orderedQty ??
                                        0),
                                    0,
                                  )) -
                                  (selectedPO.receivedQty ||
                                    allItemsForPO.reduce(
                                      (sum: number, i: any) =>
                                        sum +
                                        (i.qty_received ??
                                          i.receivedQty ??
                                          i.received_qty ??
                                          0),
                                      0,
                                    )),
                              )}{' '}
                              units
                            </strong>
                          </div>
                          {String(userRole).toLowerCase() === 'administrator' ||
                          String(userRole).toLowerCase() === 'office' ? (
                            <div className="border-mc-beige-dark bg-mc-white rounded-xl border p-3 shadow-xs">
                              <label className="mb-1 block text-[10px] font-medium text-slate-400">
                                Enter lead days for po order
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  value={leadTimeDays}
                                  onChange={(e) =>
                                    setLeadTimeDays(e.target.value)
                                  }
                                  className="focus:border-mc-black focus:ring-mc-black w-full rounded border border-slate-200 bg-white px-2 py-1 font-mono text-sm font-bold text-slate-800 focus:ring-1 focus:outline-none"
                                  placeholder="0"
                                />
                                <button
                                  onClick={async () => {
                                    if (!leadTimeDays) return;
                                    try {
                                      await updatePOLeadTime(
                                        selectedPO.id.replace(/^PO-/i, ''),
                                        Number(leadTimeDays),
                                      );
                                      const updatedPOs = purchaseOrders.map(
                                        (p: any) =>
                                          p.id === selectedPO.id ||
                                          p.uuid === selectedPO.uuid
                                            ? {
                                                ...p,
                                                containerLeadTimeDays:
                                                  Number(leadTimeDays),
                                              }
                                            : p,
                                      );
                                      dispatch(
                                        setPurchaseOrdersList(updatedPOs),
                                      );
                                      onAddActivity(
                                        `Updated Lead Time for ${selectedPO.id} to ${leadTimeDays} days`,
                                        'PO Updated',
                                      );
                                      toast.success(
                                        'Lead time updated successfully!',
                                      );
                                    } catch (error) {
                                      console.error(error);
                                      toast.error(
                                        'Failed to update lead time.',
                                      );
                                    }
                                  }}
                                  className="bg-mc-gold text-mc-black hover:bg-mc-gold/80 rounded px-3 py-1 text-xs font-bold whitespace-nowrap transition-colors hover:shadow-sm"
                                >
                                  {selectedPO.containerLeadTimeDays
                                    ? 'Update'
                                    : 'Save'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="border-mc-beige-dark bg-mc-white rounded-xl border p-3 shadow-xs">
                              <span className="block text-[10px] font-medium text-slate-400">
                                Lead Days
                              </span>
                              <strong className="font-mono text-sm font-bold text-slate-800">
                                {selectedPO.containerLeadTimeDays || 0} days
                              </strong>
                            </div>
                          )}
                          {/* <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-medium block">
                            Container IDs
                          </span>
                          <strong className="text-xs font-bold text-mc-black font-mono block truncate" title={selectedPO.containerNames?.join(', ') || selectedPO.container || 'Awaiting Vessel Booking'}>
                            {selectedPO.containerNames && selectedPO.containerNames.length > 0 
                               ? selectedPO.containerNames.join(', ') 
                               : selectedPO.container || 'Awaiting Vessel Booking'}
                          </strong>
                        </div>
                        <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-medium block">
                            Delivery ETA
                          </span>
                          <strong className="text-sm font-bold text-slate-800 font-mono">
                            {selectedPO.expected_delivery_date || selectedPO.eta || 'N/A'}
                          </strong>
                        </div> */}
                        </div>

                        <div className="border-mc-beige-dark bg-mc-white mt-3 flex min-h-0 flex-1 flex-col rounded-xl border p-4 shadow-sm">
                          <h5 className="text-mc-black mb-3 shrink-0 text-xs font-extrabold tracking-wider uppercase">
                            Item Specifications (Products)
                          </h5>
                          <TypedDataTable
                            columns={poItemColumns}
                            data={paginatedItems}
                            keyField="sku"
                            isLoading={
                              isLoadingComments || isItemsPaginationLoading
                            }
                            containerClassName="flex-1 flex flex-col min-h-0 rounded-xl border border-mc-beige-dark bg-mc-white w-full overflow-hidden"
                            tableWrapperClassName="overflow-auto flex-1 custom-scrollbar scroll-smooth"
                            tableWrapperRef={itemsTableRef}
                            defaultThClassName="px-6 py-3 bg-transparent"
                            theadClassName="bg-mc-beige-light border-b border-mc-beige-dark text-mc-black uppercase tracking-widest font-extrabold text-[10px] sticky top-0 z-10"
                            tableClassName="w-full min-w-max whitespace-nowrap text-left text-xs border-collapse"
                            tbodyClassName="divide-y divide-mc-beige-dark/40 text-mc-black"
                            trClassName={(item: any) =>
                              `transition ${Math.max(0, (item.qty || 0) - (item.receivedQty || 0)) > 0 ? 'bg-mc-beige-light/30 hover:bg-mc-gold/5 text-mc-black' : 'bg-mc-white hover:bg-mc-beige-light/30'}`
                            }
                            emptyMessage="No items specified for this purchase order."
                          />

                          {totalItemsCount > 5 && (
                            <div className="border-mc-beige-dark bg-mc-white mt-3 rounded-xl border p-1 shadow-sm">
                              <Pagination
                                currentPage={itemsCurrentPage}
                                totalCount={totalItemsCount}
                                pageSize={itemsPageSize}
                                onPageChange={(page) => {
                                  setIsItemsPaginationLoading(true);
                                  setItemsCurrentPage(page);
                                  setTimeout(
                                    () => setIsItemsPaginationLoading(false),
                                    300,
                                  );
                                }}
                                onPageSizeChange={(newSize) => {
                                  setIsItemsPaginationLoading(true);
                                  setItemsPageSize(newSize);
                                  setItemsCurrentPage(1);
                                  setTimeout(
                                    () => setIsItemsPaginationLoading(false),
                                    300,
                                  );
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: COMMENTS DISCUSSION ENGINE */}
                {activeDrawerSection === 'comments' && (
                  <div className="flex min-h-0 flex-1 flex-col gap-4">
                    {isCommentOnlyView && (
                      <div className="mt-1 flex shrink-0 flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <label className="text-[10px] font-bold tracking-wide text-slate-500 uppercase">
                          Discussion Scope
                        </label>
                        <div className="relative">
                          <button
                            onClick={() =>
                              setIsScopeDropdownOpen(!isScopeDropdownOpen)
                            }
                            className="focus:border-mc-black flex w-full items-center justify-between rounded-md border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-700 focus:outline-hidden"
                          >
                            <span className="truncate">
                              {commentScope === 'po'
                                ? 'General PO Comments'
                                : selectedPO?.items?.find(
                                      (i: any) =>
                                        (i.id || i.sku) === selectedSkuId,
                                    )
                                  ? `SKU: ${selectedPO?.items?.find((i: any) => (i.id || i.sku) === selectedSkuId)?.sku}`
                                  : 'General PO Comments'}
                            </span>
                            <ChevronDown
                              className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isScopeDropdownOpen ? 'rotate-180' : ''}`}
                            />
                          </button>

                          {isScopeDropdownOpen && (
                            <div className="absolute top-full right-0 left-0 z-50 mt-1 max-h-60 overflow-hidden overflow-y-auto rounded-md border border-slate-200 bg-white text-xs shadow-lg">
                              <button
                                className={`w-full px-3 py-2 text-left font-bold transition-colors hover:bg-slate-50 ${commentScope === 'po' ? 'text-mc-black bg-slate-100/50' : 'text-slate-700'}`}
                                onClick={() => {
                                  setCommentScope('po');
                                  setSelectedSkuId(null);
                                  setIsScopeDropdownOpen(false);
                                }}
                              >
                                General PO Comments
                              </button>

                              {selectedPO?.items?.length > 0 && (
                                <div className="border-y border-slate-100 bg-slate-50 px-3 py-1.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                                  SKU-wise Comments
                                </div>
                              )}

                              {selectedPO?.items?.map((item: any) => {
                                const itemId = item.id || item.sku;
                                const isSelected =
                                  commentScope === 'sku' &&
                                  selectedSkuId === itemId;
                                return (
                                  <button
                                    key={`sku-${itemId}`}
                                    className={`w-full px-3 py-2 text-left transition-colors ${isSelected ? 'text-mc-black bg-slate-100/50 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                                    onClick={() => {
                                      setCommentScope('sku');
                                      setSelectedSkuId(itemId);
                                      setIsScopeDropdownOpen(false);
                                    }}
                                  >
                                    <div className="flex w-full items-center justify-between">
                                      <span className="truncate">
                                        SKU: {item.sku}
                                      </span>
                                      {(() => {
                                        const count =
                                          item.total_comments_count ??
                                          item.comments_count ??
                                          item.commentsCount ??
                                          item.comment_count ??
                                          (Array.isArray(item.comments)
                                            ? item.comments.length
                                            : 0);
                                        return count > 0 ? (
                                          <span className="ml-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-slate-200 px-1 text-[9px] font-bold text-slate-600">
                                            {count}
                                          </span>
                                        ) : null;
                                      })()}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="custom-scrollbar flex-1 space-y-3.5 overflow-y-auto pr-2">
                      {(
                        isCommentOnlyView && commentScope === 'sku'
                          ? isLoadingSkuComments
                          : isLoadingComments
                      ) ? (
                        <div className="flex flex-col items-center justify-center space-y-3 py-12">
                          <Loader2 className="text-mc-black h-6 w-6 animate-spin" />
                          <p className="font-mono text-xs font-medium text-slate-500">
                            Loading messages...
                          </p>
                        </div>
                      ) : (
                        <>
                          {(() => {
                            const commentMap = new Map<string, any>();
                            (isCommentOnlyView && commentScope === 'sku'
                              ? fetchedSkuComments
                              : selectedPOComments
                            ).forEach((c) => {
                              commentMap.set(c.id, { ...c, children: [] });
                            });

                            const rootNodes: any[] = [];
                            (isCommentOnlyView && commentScope === 'sku'
                              ? fetchedSkuComments
                              : selectedPOComments
                            ).forEach((c) => {
                              const node = commentMap.get(c.id);
                              if (
                                node.parentId &&
                                commentMap.has(node.parentId)
                              ) {
                                commentMap
                                  .get(node.parentId)
                                  .children.push(node);
                              } else {
                                rootNodes.push(node);
                              }
                            });

                            // Sort chronologically (assuming timestamp ordering natively or enforce here)
                            const sortNodes = (nodes: any[]) => {
                              return nodes.sort(
                                (a, b) =>
                                  new Date(a.rawTimestamp).getTime() -
                                  new Date(b.rawTimestamp).getTime(),
                              );
                            };

                            const renderCommentTree = (
                              node: any,
                              depth: number = 0,
                            ) => {
                              const isMeStr = (node.user || '').toLowerCase();
                              const isMe =
                                isMeStr === 'sourcing lead (you)' ||
                                (currentUser &&
                                  (isMeStr ===
                                    `${currentUser.first_name || ''} ${currentUser.last_name || ''}`
                                      .trim()
                                      .toLowerCase() ||
                                    isMeStr ===
                                      String(
                                        currentUser.username || '',
                                      ).toLowerCase() ||
                                    isMeStr ===
                                      String(
                                        currentUser.email || '',
                                      ).toLowerCase() ||
                                    isMeStr ===
                                      String(
                                        currentUser.first_name || '',
                                      ).toLowerCase() ||
                                    (currentUser.id &&
                                      String(node.userId) ===
                                        String(currentUser.id))));

                              const isCollapsed =
                                collapsedComments[node.id] || false;

                              return (
                                <div
                                  key={node.id}
                                  id={node.id} // Added id for deep link scrolling
                                  className={`relative mb-3 flex scroll-mt-20 flex-col ${
                                    highlightedCommentId === node.id
                                      ? 'rounded-xl p-1 ring-2 ring-red-500 transition-all duration-1000 ring-inset'
                                      : ''
                                  }`}
                                >
                                  <div className="group relative flex items-start gap-3 transition-colors">
                                    <div
                                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-100 text-xs font-bold shadow-sm ${isMe ? 'bg-mc-black text-white' : 'bg-slate-50 text-slate-700'}`}
                                    >
                                      {(node.user[0] || 'U').toUpperCase()}
                                    </div>
                                    <div
                                      className={`flex min-w-0 flex-1 flex-col rounded-2xl border p-3 ${isMe ? 'border-slate-200 bg-slate-100/30 shadow-sm' : 'border-slate-100/80 bg-white shadow-xs'}`}
                                    >
                                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                        <span className="text-[13px] font-bold text-slate-800">
                                          {node.user}
                                        </span>
                                        <span className="text-[10px] font-medium whitespace-nowrap text-slate-400">
                                          {node.timestamp}
                                        </span>
                                        {!isMe && node.role && (
                                          <span className="rounded-sm border border-slate-100 bg-slate-50 px-1 py-0.5 text-[8px] font-bold text-slate-500 uppercase">
                                            {node.role}
                                          </span>
                                        )}
                                      </div>
                                      {editingCommentId === node.id ? (
                                        <div className="mt-1 flex w-full flex-col gap-2">
                                          {editingCommentFiles.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                              {editingCommentFiles.map(
                                                (file, index) => (
                                                  <div
                                                    key={`${file.name}-${index}`}
                                                    className="flex items-center gap-2 rounded-lg bg-slate-100 px-2 py-1 text-[11px] text-slate-600"
                                                  >
                                                    <Paperclip className="h-3.5 w-3.5" />
                                                    <span className="max-w-40 truncate">
                                                      {file.name}
                                                    </span>
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        setEditingCommentFiles(
                                                          (files) =>
                                                            files.filter(
                                                              (_, fileIndex) =>
                                                                fileIndex !==
                                                                index,
                                                            ),
                                                        )
                                                      }
                                                      className="text-slate-400 hover:text-red-500"
                                                      aria-label={`Remove ${file.name}`}
                                                    >
                                                      <X className="h-3 w-3" />
                                                    </button>
                                                  </div>
                                                ),
                                              )}
                                            </div>
                                          )}
                                          <div className="relative">
                                            <textarea
                                              value={editingCommentText}
                                              onChange={(e) =>
                                                setEditingCommentText(
                                                  e.target.value,
                                                )
                                              }
                                              className="w-full rounded border border-slate-300 bg-white p-2 pr-9 text-[13px] text-slate-800 focus:border-indigo-400 focus:outline-hidden"
                                              rows={2}
                                            />
                                            <button
                                              type="button"
                                              onClick={() =>
                                                document
                                                  .getElementById(
                                                    `po-comment-edit-attachment-${node.id}`,
                                                  )
                                                  ?.click()
                                              }
                                              className="absolute top-2 right-2 text-slate-400 transition hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                                              title="Attach file or image"
                                              disabled={isCompressing}
                                            >
                                              {isCompressing ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                              ) : (
                                                <Paperclip className="h-4 w-4" />
                                              )}
                                            </button>
                                            <input
                                              id={`po-comment-edit-attachment-${node.id}`}
                                              type="file"
                                              className="hidden"
                                              multiple
                                              accept=".jpeg,.jpg,.png,.gif,.webp,.pdf,.doc,.docx,.csv,.xls,.xlsx"
                                              onChange={(e) => {
                                                if (!e.target.files?.length)
                                                  return;
                                                const processedFiles: File[] =
                                                  [];

                                                for (const file of Array.from(
                                                  e.target.files,
                                                )) {
                                                  if (
                                                    !file.name.match(
                                                      /\.(jpeg|jpg|png|gif|webp|pdf|doc|docx|csv|xls|xlsx)$/i,
                                                    )
                                                  ) {
                                                    toast.error(
                                                      `Invalid file type for ${file.name}. Only Images, PDFs, Word, Excel, and CSVs are allowed.`,
                                                    );
                                                    continue;
                                                  }
                                                  if (
                                                    file.size >
                                                    5 * 1024 * 1024
                                                  ) {
                                                    toast.error(
                                                      `File ${file.name} exceeds the 5MB limit. Please upload a smaller file.`,
                                                    );
                                                    continue;
                                                  }
                                                  processedFiles.push(file);
                                                }

                                                setEditingCommentFiles(
                                                  (files) => [
                                                    ...files,
                                                    ...processedFiles,
                                                  ],
                                                );
                                                setIsCompressing(false);
                                                e.target.value = '';
                                              }}
                                            />
                                          </div>
                                          <div className="flex justify-end gap-2">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditingCommentId(null);
                                                setEditingCommentText('');
                                                setEditingCommentFiles([]);
                                              }}
                                              className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-700"
                                            >
                                              Cancel
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleUpdateSubmit(node.id)
                                              }
                                              disabled={isPostingComment}
                                              className="bg-mc-black rounded px-3 py-1 text-[11px] font-semibold text-white hover:bg-black disabled:opacity-50"
                                            >
                                              {isPostingComment && uploadStatus
                                                ? uploadStatus
                                                : 'Save'}
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-[13px] leading-relaxed break-words whitespace-pre-wrap text-slate-600">
                                          {node.message
                                            .split(/(@[\w.-]+)/g)
                                            .map((part: string, i: number) =>
                                              part.startsWith('@') ? (
                                                <span
                                                  key={i}
                                                  className="text-mc-black font-bold"
                                                >
                                                  {part}
                                                </span>
                                              ) : (
                                                part
                                              ),
                                            )}
                                        </p>
                                      )}

                                      {/* WhatsApp Style Attachment Render */}
                                      {(() => {
                                        const filesToRender =
                                          node.files && node.files.length > 0
                                            ? node.files
                                            : node.fileUrl
                                              ? [
                                                  {
                                                    fileUrl: node.fileUrl,
                                                    fileName: node.fileName,
                                                    fileType: node.fileType,
                                                  },
                                                ]
                                              : [];

                                        if (filesToRender.length === 0)
                                          return null;

                                        const isOptimistic = String(
                                          node.id,
                                        ).includes('OPT-');

                                        return (
                                          <div className="mt-2.5 flex flex-wrap gap-2">
                                            {filesToRender.map(
                                              (fileObj: any, idx: number) => {
                                                const isImage =
                                                  fileObj.fileType?.startsWith(
                                                    'image/',
                                                  ) ||
                                                  fileObj.fileUrl?.match(
                                                    /\.(jpeg|jpg|gif|png|webp|bmp)(\?.*)?$/i,
                                                  ) ||
                                                  fileObj.fileUrl?.startsWith(
                                                    'blob:',
                                                  );

                                                if (isImage) {
                                                  return (
                                                    <div
                                                      key={idx}
                                                      className="group/att relative"
                                                    >
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          !isOptimistic &&
                                                          setPreviewImage(
                                                            fileObj.fileUrl,
                                                          )
                                                        }
                                                        className={`relative focus:outline-hidden ${isOptimistic ? 'cursor-not-allowed' : ''}`}
                                                      >
                                                        <img
                                                          src={fileObj.fileUrl}
                                                          alt="Attachment"
                                                          className="h-32 w-48 rounded-xl object-cover drop-shadow-sm transition-transform hover:scale-[1.02]"
                                                          onLoad={() => {
                                                            if (
                                                              idx ===
                                                              filesToRender.length -
                                                                1
                                                            ) {
                                                              messagesEndRef.current?.scrollIntoView(
                                                                {
                                                                  behavior:
                                                                    'smooth',
                                                                },
                                                              );
                                                            }
                                                          }}
                                                        />
                                                        {isOptimistic && (
                                                          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-900/40 backdrop-blur-[2px]">
                                                            <div className="flex flex-col items-center gap-2">
                                                              <Loader2 className="h-4 w-4 animate-spin text-white" />
                                                            </div>
                                                          </div>
                                                        )}
                                                      </button>
                                                      {isMe &&
                                                        !isOptimistic &&
                                                        fileObj.id && (
                                                          <button
                                                            type="button"
                                                            onClick={() =>
                                                              handleDeleteCommentAttachment(
                                                                node.id,
                                                                fileObj.id,
                                                              )
                                                            }
                                                            className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-red-500"
                                                            title="Delete attachment"
                                                          >
                                                            <Trash className="h-3 w-3" />
                                                          </button>
                                                        )}
                                                    </div>
                                                  );
                                                }

                                                return (
                                                  <div
                                                    key={idx}
                                                    className="group/att relative w-max"
                                                  >
                                                    <a
                                                      href={
                                                        isOptimistic
                                                          ? undefined
                                                          : fileObj.fileUrl
                                                      }
                                                      download={
                                                        fileObj.fileName ||
                                                        'Document'
                                                      }
                                                      target={
                                                        isOptimistic
                                                          ? undefined
                                                          : '_blank'
                                                      }
                                                      rel="noreferrer"
                                                      className={`flex w-max items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600 transition-colors ${isOptimistic ? 'pointer-events-none opacity-70' : 'hover:bg-slate-100'}`}
                                                    >
                                                      <div className="rounded-full bg-slate-200 p-1.5 text-slate-500">
                                                        <Paperclip className="h-4 w-4" />
                                                      </div>
                                                      <div className="flex min-w-0 flex-col">
                                                        <span className="text-[11px] font-bold">
                                                          Attachment
                                                        </span>
                                                        <span className="max-w-[12rem] truncate text-[10px] text-slate-400">
                                                          {fileObj.fileName ||
                                                            'Document'}
                                                        </span>
                                                      </div>
                                                      {!isOptimistic && (
                                                        <div className="ml-2 flex rounded-full bg-slate-200 p-1.5 text-slate-500 transition-colors hover:bg-slate-300 hover:text-slate-700">
                                                          <Download className="h-3 w-3" />
                                                        </div>
                                                      )}
                                                    </a>
                                                    {isOptimistic && (
                                                      <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-slate-800/40 backdrop-blur-[1px]">
                                                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                                                      </div>
                                                    )}
                                                    {isMe &&
                                                      !isOptimistic &&
                                                      fileObj.id && (
                                                        <button
                                                          type="button"
                                                          onClick={() =>
                                                            handleDeleteCommentAttachment(
                                                              node.id,
                                                              fileObj.id,
                                                            )
                                                          }
                                                          className="absolute -top-2 -right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                                                          title="Delete attachment"
                                                        >
                                                          <Trash className="h-2.5 w-2.5" />
                                                        </button>
                                                      )}
                                                  </div>
                                                );
                                              },
                                            )}
                                          </div>
                                        );
                                      })()}

                                      {/* Action Bar */}
                                      <div className="mt-2 flex items-center gap-4">
                                        {node.fileUrl &&
                                          !(
                                            node.fileType?.startsWith(
                                              'image/',
                                            ) ||
                                            node.fileUrl.match(
                                              /\.(jpeg|jpg|gif|png|webp|bmp)(\?.*)?$/i,
                                            ) ||
                                            node.fileUrl.startsWith('blob:')
                                          ) && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                forceDownload(
                                                  node.fileUrl,
                                                  node.fileName || 'Attachment',
                                                );
                                              }}
                                              className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 opacity-100 transition hover:text-indigo-600"
                                            >
                                              <Download className="h-3 w-3" />{' '}
                                              Download
                                            </button>
                                          )}
                                        {isMe &&
                                          editingCommentId !== node.id && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditingCommentId(node.id);
                                                setEditingCommentText(
                                                  node.message,
                                                );
                                                setEditingCommentFiles([]);
                                              }}
                                              className="hover:text-mc-black flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 opacity-100 transition"
                                            >
                                              <Pencil className="h-3 w-3" />{' '}
                                              Edit
                                            </button>
                                          )}
                                        {isMe &&
                                          editingCommentId !== node.id && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleDeleteComment(node.id)
                                              }
                                              className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 opacity-100 transition hover:text-red-500"
                                            >
                                              <Trash className="h-3 w-3" />{' '}
                                              Delete
                                            </button>
                                          )}

                                        <>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setReplyToCommentId(node.id);
                                              setReplyToUser(node.user);
                                              setReplyToText(node.message);
                                            }}
                                            className="hover:text-mc-black flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 opacity-100 transition"
                                          >
                                            <Reply className="h-3 w-3" /> Reply
                                          </button>
                                        </>
                                        {node.children.length > 0 && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setCollapsedComments((prev) => ({
                                                ...prev,
                                                [node.id]: !prev[node.id],
                                              }))
                                            }
                                            className="hover:text-mc-black flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 transition"
                                          >
                                            {isCollapsed ? (
                                              <>
                                                <MessageSquare className="h-3 w-3" />{' '}
                                                Expand {node.children.length}{' '}
                                                replies
                                              </>
                                            ) : (
                                              <>
                                                <ChevronUp className="h-3 w-3" />{' '}
                                                Collapse
                                              </>
                                            )}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Nested Children */}
                                  {!isCollapsed && node.children.length > 0 && (
                                    <div className="relative mt-3 ml-4 flex flex-col border-l-[1.5px] border-slate-200/80 pl-4 sm:ml-6 sm:pl-6">
                                      {sortNodes(node.children).map(
                                        (child: any) =>
                                          renderCommentTree(child, depth + 1),
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            };

                            return (
                              <div className="flex flex-col">
                                {sortNodes(rootNodes).map((root) =>
                                  renderCommentTree(root, 0),
                                )}
                              </div>
                            );
                          })()}
                          {(commentScope === 'po'
                            ? selectedPOComments
                            : fetchedSkuComments
                          ).length === 0 && (
                            <div className="flex flex-col items-center justify-center space-y-2 py-8 opacity-70">
                              <MessageSquare className="h-8 w-8 text-slate-400" />
                              <p className="font-mono text-xs font-medium text-slate-500">
                                No comment
                              </p>
                            </div>
                          )}
                        </>
                      )}
                      <div ref={messagesEndRef} className="h-1 shrink-0" />
                    </div>

                    <form
                      onSubmit={handlePostComment}
                      className="relative flex shrink-0 flex-col gap-2 border-t border-slate-100 pt-3"
                    >
                      {replyToUser && (
                        <div className="animate-fadeIn group border-mc-gold relative mb-1 flex items-start gap-2 rounded-lg border-l-4 bg-slate-50 py-2 pr-8 pl-3">
                          <Reply className="text-mc-gold mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="text-mc-black block text-xs font-bold">
                              Replying to {replyToUser}
                            </span>
                            <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500 italic transition-all group-hover:line-clamp-2">
                              {replyToText || 'Attachment'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setReplyToCommentId(null);
                              setReplyToUser(null);
                              setReplyToText(null);
                            }}
                            className="absolute top-1.5 right-1.5 rounded p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                      <div className="flex w-full items-end gap-3">
                        <div className="min-w-0 flex-1 flex-col">
                          {newCommentFiles.length > 0 && (
                            <div className="custom-scrollbar mb-3 flex w-full max-w-full gap-2 overflow-x-auto pb-2">
                              {newCommentFiles.map((file, idx) => (
                                <div
                                  key={idx}
                                  className="bg-mc-black relative flex w-48 shrink-0 flex-col rounded-xl p-2 shadow-md"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newFiles = [...newCommentFiles];
                                      newFiles.splice(idx, 1);
                                      setNewCommentFiles(newFiles);

                                      if (newFiles.length === 0) {
                                        const input = document.getElementById(
                                          'comment-attachment-input',
                                        ) as HTMLInputElement;
                                        if (input) input.value = '';
                                      }
                                    }}
                                    className="absolute -top-2 -right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md transition-colors hover:border-red-200 hover:text-red-500"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                  {file.type.startsWith('image/') ? (
                                    <div className="bg-mc-gray-dark relative flex h-24 w-full items-center justify-center overflow-hidden rounded-lg">
                                      <img
                                        src={URL.createObjectURL(file)}
                                        alt="Preview"
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="bg-mc-gray-dark flex h-24 w-full flex-col items-center justify-center rounded-lg">
                                      <Paperclip className="text-mc-gray-soft mb-1 h-6 w-6" />
                                      <span className="bg-mc-gray-soft text-mc-white rounded px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase shadow-xs">
                                        {file.name.split('.').pop()}
                                      </span>
                                    </div>
                                  )}
                                  <div className="bg-mc-gray-dark text-mc-white mt-2 w-full truncate rounded-md px-2 py-1 text-center text-[10px] font-semibold">
                                    {file.name}{' '}
                                    <span className="block text-[9px] font-normal text-white/50">
                                      ({(file.size / 1024).toFixed(1)} KB)
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Dropdown anchored to input row only */}
                          <div className="relative w-full">
                            {showMentionDropdown && (
                              <div className="animate-fadeIn absolute bottom-full left-0 z-50 mb-1 flex w-64 flex-col rounded-xl border border-slate-200 bg-white shadow-xl">
                                <div className="max-h-48 overflow-y-auto py-1">
                                  {(() => {
                                    const filtered = getFilteredMentions();

                                    if (filtered.length === 0) {
                                      return (
                                        <div className="px-3 py-2 text-xs text-slate-400">
                                          No users found
                                        </div>
                                      );
                                    }

                                    return filtered.map(
                                      (userObj: any, idx: number) => {
                                        const name =
                                          typeof userObj === 'string'
                                            ? userObj
                                            : userObj.name || '';
                                        const initial = (
                                          name[0] || 'U'
                                        ).toUpperCase();
                                        const isHighlighted =
                                          idx === mentionHighlightIndex;
                                        return (
                                          <button
                                            key={
                                              typeof userObj === 'string'
                                                ? userObj
                                                : userObj.id
                                            }
                                            type="button"
                                            onClick={() =>
                                              handleSelectMention(userObj)
                                            }
                                            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition ${isHighlighted ? 'bg-mc-gold/10 border-mc-gold border-l-2' : 'hover:bg-slate-50'}`}
                                          >
                                            <div
                                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-bold ${isHighlighted ? 'bg-mc-gold text-white' : 'text-mc-black bg-slate-200'}`}
                                            >
                                              {initial}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <div className="truncate font-semibold text-slate-700">
                                                {name}
                                              </div>
                                            </div>
                                          </button>
                                        );
                                      },
                                    );
                                  })()}
                                </div>
                              </div>
                            )}

                            <textarea
                              rows={2}
                              placeholder="Type a message... (Use @ to tag)"
                              value={newCommentText}
                              onChange={handleCommentTextChange}
                              onKeyDown={handleCommentKeyDown}
                              className={`focus:border-mc-black w-full resize-none rounded-lg border ${commentError ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} px-3 py-2 pr-10 text-[13px] transition focus:bg-white focus:outline-hidden`}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                document
                                  .getElementById('comment-attachment-input')
                                  ?.click()
                              }
                              className="absolute top-[5px] right-2 p-1 font-bold text-slate-400 transition hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Attach file or image"
                              disabled={isCompressing}
                            >
                              {isCompressing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Paperclip className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          {commentError && (
                            <p className="animate-fadeIn mt-1 text-[11px] font-bold text-rose-500">
                              {commentError}
                            </p>
                          )}
                          <input
                            type="file"
                            id="comment-attachment-input"
                            className="hidden"
                            multiple
                            accept=".jpeg,.jpg,.png,.gif,.webp,.pdf,.doc,.docx,.csv,.xls,.xlsx"
                            onChange={async (e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                const selectedFiles = Array.from(
                                  e.target.files,
                                );
                                const processedFiles: File[] = [];

                                setIsCompressing(true);

                                for (const file of selectedFiles) {
                                  const isAllowedExt = file.name.match(
                                    /\.(jpeg|jpg|png|gif|webp|pdf|doc|docx|csv|xls|xlsx)$/i,
                                  );

                                  if (!isAllowedExt) {
                                    toast.error(
                                      `Invalid file type for ${file.name}. Only Images, PDFs, Word, Excel, and CSVs are allowed.`,
                                    );
                                    continue;
                                  }

                                  const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
                                  if (file.size > maxSizeInBytes) {
                                    toast.error(
                                      `File ${file.name} exceeds the 5MB limits. Please upload a smaller file.`,
                                    );
                                    continue;
                                  }

                                  processedFiles.push(file);
                                }

                                if (processedFiles.length > 0) {
                                  setNewCommentFiles((prev) => [
                                    ...prev,
                                    ...processedFiles,
                                  ]);
                                }

                                setIsCompressing(false);
                                e.target.value = '';
                              }
                            }}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={
                            isPostingComment ||
                            (!newCommentText.trim() &&
                              newCommentFiles.length === 0)
                          }
                          className="bg-mc-black flex h-[42px] shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-2 text-[13px] font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isPostingComment ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>
                                {uploadStatus
                                  ? uploadStatus.replace('...', '')
                                  : 'Posting'}
                              </span>
                            </>
                          ) : (
                            <>
                              <Send className="h-3.5 w-3.5" />
                              <span>
                                {newCommentFiles.length > 0
                                  ? 'Upload'
                                  : 'Comment'}
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* TAB: EMAIL HISTORY & AI GENERATOR */}
                {activeDrawerSection === 'emails' && (
                  <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-700">
                          Connected Vendor Email Engagement Logs
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          Track delivered outreach, opens, and replies directly
                          inside PO context.
                        </p>
                      </div>

                      <button
                        onClick={generateAIFollowUp}
                        className="text-mc-black flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold transition hover:bg-slate-200"
                        disabled={isGeneratingEmail}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>
                          {isGeneratingEmail
                            ? 'Writing...'
                            : 'Generate AI Follow-up'}
                        </span>
                      </button>
                    </div>

                    {/* AI Email draft output preview */}
                    {aiEmailGenerated && (
                      <div className="animate-fadeIn space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-xs font-bold text-indigo-950">
                            <Sparkles className="text-mc-black h-3.5 w-3.5" />
                            <span>Prepared AI Sourcing Template</span>
                          </span>
                          <button
                            onClick={() => setAiEmailGenerated(null)}
                            className="rounded-md p-1 text-slate-400 hover:bg-slate-200"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <textarea
                          value={aiEmailGenerated}
                          onChange={(e) => setAiEmailGenerated(e.target.value)}
                          rows={8}
                          className="w-full rounded-lg border border-slate-200 bg-white p-3 font-mono text-xs leading-relaxed focus:outline-hidden"
                        />

                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setAiEmailGenerated(null)}
                            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600"
                          >
                            Discard Draft
                          </button>
                          <button
                            onClick={handleSendAIEmail}
                            className="bg-mc-black flex items-center gap-1 rounded-md px-4 py-1.5 text-xs font-bold text-white hover:bg-black"
                          >
                            <Send className="h-3 w-3" />
                            <span>Send to {selectedPO.vendorName}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Local PO outreach table */}
                    <div className="space-y-3">
                      {selectedPOEmails.map((email) => (
                        <div
                          key={email.id}
                          className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs"
                        >
                          <div className="space-y-1">
                            <h5 className="font-semibold text-slate-800">
                              {email.subject}
                            </h5>
                            <p className="font-mono text-[10px] text-slate-400">
                              Sent: {email.sentAt} • Status:{' '}
                              <strong className="text-mc-black">
                                {email.status}
                              </strong>
                            </p>
                          </div>

                          <div className="space-y-1 text-right">
                            <span className="rounded-sm bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600">
                              Opens: {email.openCount}
                            </span>
                            {email.repliedAt && (
                              <p className="font-mono text-[9px] font-semibold text-emerald-600">
                                Replied: {email.repliedAt.split(' ')[1]}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      {selectedPOEmails.length === 0 && (
                        <p className="py-4 text-center text-xs text-slate-400 italic">
                          No emails have been logged for this Purchase Order.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}

      {showCreateModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs"
            onClick={() => setShowCreateModal(false)}
          >
            <div
              className="animate-scaleUp w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="font-display text-base font-bold text-slate-900">
                  Generate New Purchase Order
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePO} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Target Manufacturing Vendor
                  </label>
                  <VendorInfiniteDropdown
                    value={newPO.vendorId}
                    onChange={(val) =>
                      setNewPO((prev) => ({ ...prev, vendorId: val }))
                    }
                    placeholder="-- Choose Vendor --"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm text-slate-800 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Ordered Quantity (Units)
                    </label>
                    <input
                      type="number"
                      value={newPO.orderedQty}
                      onChange={(e) =>
                        setNewPO((prev) => ({
                          ...prev,
                          orderedQty: Number(e.target.value),
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm focus:outline-hidden"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Estimated Arrival ETA
                    </label>
                    <input
                      type="date"
                      value={newPO.eta}
                      onChange={(e) =>
                        setNewPO((prev) => ({ ...prev, eta: e.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-sm focus:outline-hidden"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      SKU Number
                    </label>
                    <input
                      type="text"
                      value={newPO.sku}
                      onChange={(e) =>
                        setNewPO((prev) => ({ ...prev, sku: e.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-sm focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Fulfillment Container ID (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., CNT-095"
                      value={newPO.container}
                      onChange={(e) =>
                        setNewPO((prev) => ({
                          ...prev,
                          container: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-sm focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Component Description
                    </label>
                    <input
                      type="text"
                      value={newPO.itemName}
                      onChange={(e) =>
                        setNewPO((prev) => ({
                          ...prev,
                          itemName: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-mc-black rounded-lg px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-black"
                  >
                    Generate Sourcing PO
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {showImportModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs"
            onClick={() => setShowImportModal(false)}
          >
            <div
              className="animate-scaleUp w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="font-display text-base font-bold text-slate-900">
                  Bulk Sourcing PO CSV Importer
                </h3>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleImportCSV} className="space-y-4">
                <p className="text-xs leading-relaxed text-slate-500">
                  Paste your spreadsheet rows below to import Purchase Orders in
                  bulk. Follow the expected format carefully.
                </p>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-[10px] leading-tight text-slate-600">
                  <strong>Expected Fields:</strong> vendor_id, status, quantity,
                  eta_yyyy_mm_dd, sku
                  <br />
                  <strong>Example Row:</strong> VEND-001, Production, 750,
                  2026-08-30, SKU-5501
                </div>

                <div>
                  <textarea
                    placeholder="VEND-001,Production,750,2026-08-30,SKU-5501&#10;VEND-004,In Transit,1200,2026-07-28,SKU-2041"
                    value={importCsvText}
                    onChange={(e) => setImportCsvText(e.target.value)}
                    rows={6}
                    className="focus:border-mc-black w-full rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs transition focus:bg-white focus:outline-hidden"
                  />
                </div>

                {importFeedback && (
                  <div
                    className={`rounded-lg border p-2.5 text-center text-xs font-semibold ${
                      importFeedback.includes('Successfully')
                        ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                        : 'border-rose-100 bg-rose-50 text-rose-700'
                    }`}
                  >
                    {importFeedback}
                  </div>
                )}

                <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-mc-black rounded-lg px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-black"
                  >
                    Parse & Synchronize Rows
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* MODAL: EXPORT CSV FORM */}
      {showExportModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs"
            onClick={() => setShowExportModal(false)}
          >
            <div
              className="animate-scaleUp flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border border-slate-100 bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-5">
                <h3 className="font-display text-base font-bold text-slate-900">
                  Export File
                </h3>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
                {/* Filter Status */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Filter Data
                  </label>
                  <InfiniteScrollDropdown
                    value={exportFilterStatus}
                    onChange={(val) => setExportFilterStatus(val)}
                    items={[
                      { value: 'all', label: 'No Filter (All Data)' },
                      {
                        value: 'invoice_delayed',
                        label: 'Invoice Delayed (Missing > 10 days)',
                      },
                      {
                        value: 'delivery_delayed',
                        label: 'Delivery Delayed (ETA Passed)',
                      },
                      {
                        value: 'lefts_items',
                        label: 'Incomplete Receiving (Lefts Items)',
                      },
                    ]}
                    hasMore={false}
                    isLoading={false}
                    onSearch={() => {}}
                    onLoadMore={() => {}}
                    placeholder="Select Filter"
                    searchPlaceholder="Search filters..."
                  />
                </div>

                {/* Columns Selection */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Select Columns
                  </label>
                  <p className="mb-4 text-xs text-slate-500">
                    Choose the fields to include in your CSV export. Including
                    Item-Level columns will output one row per item.
                  </p>

                  <div className="space-y-5">
                    <div>
                      <h4 className="border-mc-beige-dark text-mc-black mb-2.5 border-b pb-1 text-xs font-bold tracking-wide uppercase">
                        PO-Level Columns
                      </h4>
                      <div className="grid grid-cols-2 gap-2.5">
                        {PO_LEVEL_COLUMNS.map((col) => (
                          <label
                            key={col}
                            className="hover:bg-mc-beige-light text-mc-black flex cursor-pointer items-center gap-2 rounded p-1 text-xs transition select-none"
                          >
                            <input
                              type="checkbox"
                              checked={exportColumns.includes(col)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setExportColumns((C) => {
                                    const next = [...C, col];
                                    if (col === 'Comments') {
                                      if (!next.includes('PO ID'))
                                        next.push('PO ID');
                                      if (!next.includes('PO Title'))
                                        next.push('PO Title');
                                    }
                                    return next;
                                  });
                                } else {
                                  setExportColumns((C) =>
                                    C.filter((c) => c !== col),
                                  );
                                }
                              }}
                              className="border-mc-beige-dark focus:ring-mc-gold text-mc-black rounded accent-black"
                            />
                            {col}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="border-mc-beige-dark text-mc-black mb-2.5 border-b pb-1 text-xs font-bold tracking-wide uppercase">
                        Item-Level Columns
                      </h4>
                      <div className="grid grid-cols-2 gap-2.5">
                        {ITEM_LEVEL_COLUMNS.map((col) => (
                          <label
                            key={col}
                            className="hover:bg-mc-beige-light text-mc-black flex cursor-pointer items-center gap-2 rounded p-1 text-xs transition select-none"
                          >
                            <input
                              type="checkbox"
                              checked={exportColumns.includes(col)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setExportColumns((C) => {
                                    const next = [...C, col];
                                    if (!next.includes('PO ID'))
                                      next.push('PO ID');
                                    if (!next.includes('PO Title'))
                                      next.push('PO Title');
                                    return next;
                                  });
                                } else {
                                  setExportColumns((C) =>
                                    C.filter((c) => c !== col),
                                  );
                                }
                              }}
                              className="border-mc-beige-dark focus:ring-mc-gold text-mc-black rounded accent-black"
                            />
                            {col}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="border-mc-beige-dark text-mc-black mb-2.5 border-b pb-1 text-xs font-bold tracking-wide uppercase">
                        Container-Level Columns
                      </h4>
                      <div className="grid grid-cols-2 gap-2.5">
                        {CONTAINER_LEVEL_COLUMNS.map((col) => (
                          <label
                            key={col}
                            className="hover:bg-mc-beige-light text-mc-black flex cursor-pointer items-center gap-2 rounded p-1 text-xs transition select-none"
                          >
                            <input
                              type="checkbox"
                              checked={exportColumns.includes(col)}
                              onChange={(e) => {
                                if (e.target.checked)
                                  setExportColumns((C) => [...C, col]);
                                else
                                  setExportColumns((C) =>
                                    C.filter((c) => c !== col),
                                  );
                              }}
                              className="border-mc-beige-dark focus:ring-mc-gold text-mc-black rounded accent-black"
                            />
                            {col}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-mc-beige-dark bg-mc-white flex shrink-0 justify-end gap-2 rounded-b-2xl border-t p-5">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="border-mc-beige-dark bg-mc-white text-mc-black hover:bg-mc-beige-light rounded-lg border px-4 py-2 text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={executeExportCSV}
                  className="bg-mc-black flex items-center gap-2 rounded-lg px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-black"
                >
                  <Upload className="h-4 w-4" />
                  Generate CSV
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
      {/* FullPageLoader removed in favor of localized TableLoaders for syncing */}

      {/* Modal Tooltips wrapper to prevent Flexbox flow interference */}
      <div className="absolute top-0 left-0 z-[9999] h-0 w-0 overflow-visible">
        <Tooltip
          id="po-metrics-tooltip"
          positionStrategy="fixed"
          place="top"
          className="z-[100] max-w-xs text-center text-xs leading-relaxed font-semibold tracking-wide shadow-xl"
          style={{
            backgroundColor: '#F4EFE8',
            color: '#151717',
            borderRadius: '8px',
            padding: '8px 12px',
          }}
        />
      </div>

      <ItemCommentModal
        isOpen={!!selectedItemForComments}
        onClose={() => setSelectedItemForComments(null)}
        targetItem={selectedItemForComments}
        selectedPO={selectedPO}
        onAddActivity={onAddActivity}
        highlightedCommentId={highlightedCommentId}
      />

      <ConfirmDeleteModal
        isOpen={!!deleteCommentTarget}
        isDeleting={isDeletingComment}
        title={
          deleteCommentTarget?.type === 'attachment'
            ? 'Delete Attachment'
            : 'Delete Comment'
        }
        message={
          deleteCommentTarget?.type === 'attachment'
            ? "This can't be undone. Are you sure you want to delete this attachment?"
            : "This can't be undone. Are you sure you want to delete this comment?"
        }
        onCancel={() => !isDeletingComment && setDeleteCommentTarget(null)}
        onConfirm={handleConfirmDeleteComment}
      />

      <ContainerDetailsModal
        container={viewingContainerDetails}
        isLoading={isContainerModalLoading}
        onClose={() => setViewingContainerDetails(null)}
        onRefresh={() => {
          if (viewingContainerDetails?.id) {
            handleOpenContainerDetails(
              viewingContainerDetails.id,
              viewingContainerDetails.container_name ||
                viewingContainerDetails.name,
            );
          }
        }}
      />

      {/* Image Preview Popup */}
      {previewImage &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999]"
            onClick={() => {
              setPreviewImage(null);
              setPreviewAnchor(null);
            }}
          >
            <div
              className="absolute rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl"
              style={{
                top: previewAnchor?.top ?? '50%',
                left: previewAnchor
                  ? Math.min(
                      Math.max(previewAnchor.left, 8),
                      window.innerWidth - 280,
                    )
                  : '50%',
                transform: previewAnchor ? undefined : 'translate(-50%, -50%)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setPreviewImage(null);
                  setPreviewAnchor(null);
                }}
                className="absolute -top-2.5 -right-2.5 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow transition hover:bg-white hover:text-rose-500"
              >
                <X className="h-4 w-4" />
              </button>
              <img
                src={previewImage}
                alt="Preview"
                className="max-h-[260px] max-w-[260px] rounded-xl object-contain"
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
