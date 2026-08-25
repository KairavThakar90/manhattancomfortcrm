import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import {
  Truck,
  Search,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  X,
  Mail,
  FileText,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Check,
  Eye,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { createPortal } from 'react-dom';
import {
  getTrackerLogistics,
  createTrackerLogistic,
  updateTrackerLogistic,
  deleteTrackerLogistic,
  getTrackerLogisticById,
} from '../services/trackerLogistics.service';
import { useCRM } from '../../../hooks/useCRM';
import DataTable from '../../../components/common/DataTable';
import Pagination from '../../../components/common/Pagination';
import TableLoader from '../../../components/common/TableLoader';

// ─── primary_email validation ────────────────────────────────────────────────────────
const isValidEmail = (primary_email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(primary_email.trim());

// ─── Status options ───────────────────────────────────────────────────────────
const STATUS_OPTIONS = ['Active', 'Inactive', 'Pending'];

// ─── CC primary_email Tag Input ───────────────────────────────────────────────────────
function CCEmailInput({ value = [], onChange }) {
  const [inputVal, setInputVal] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const addEmail = (raw) => {
    const primary_email = raw.trim().replace(/,+$/, '').trim();
    if (!primary_email) return;
    if (!isValidEmail(primary_email)) {
      setError(`"${primary_email}" is not a valid primary_email address.`);
      return;
    }
    const lower = primary_email.toLowerCase();
    if (value.map((e) => e.toLowerCase()).includes(lower)) {
      setError(`"${primary_email}" is already added.`);
      return;
    }
    onChange([...value, primary_email]);
    setInputVal('');
    setError('');
  };

  const handleKeyDown = (e) => {
    if (['Enter', ',', ' ', 'Tab'].includes(e.key)) {
      e.preventDefault();
      addEmail(inputVal);
    }
    if (e.key === 'Backspace' && !inputVal && value.length > 0) {
      onChange(value.slice(0, -1));
      setError('');
    }
  };

  const removeEmail = (idx) => {
    onChange(value.filter((_, i) => i !== idx));
    setError('');
  };

  return (
    <div>
      <div
        onClick={() => inputRef.current?.focus()}
        className="border-mc-beige-dark bg-mc-white focus-within:border-mc-black flex min-h-[42px] w-full cursor-text flex-wrap gap-1.5 rounded-lg border p-2 transition"
      >
        {value.map((primary_email, idx) => (
          <span
            key={idx}
            className="bg-mc-beige-light border-mc-beige-dark text-mc-black flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium"
          >
            {primary_email}
            <button
              type="button"
              onClick={() => removeEmail(idx)}
              className="text-mc-gray-soft ml-0.5 rounded transition hover:text-rose-500"
              tabIndex={-1}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => {
            setInputVal(e.target.value);
            setError('');
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (inputVal.trim()) addEmail(inputVal);
          }}
          placeholder={
            value.length === 0
              ? 'e.g. tracking@company.com... (Press Enter)'
              : ''
          }
          className="min-w-[140px] flex-1 border-none bg-transparent text-xs outline-none"
        />
      </div>
      {error && <p className="mt-1 text-[11px] text-rose-500">{error}</p>}
      <p className="text-mc-gray-soft mt-1 text-[10px]">
        Press{' '}
        <kbd className="rounded border border-slate-200 px-1 py-0.5 font-mono text-[9px]">
          Enter
        </kbd>
        , comma, or Tab to add. Backspace removes last tag.
      </p>
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Inactive: 'bg-rose-50 text-rose-600 border-rose-200',
    Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  const cls = map[status] ?? 'bg-slate-50 text-slate-600 border-slate-200';
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${cls}`}
    >
      {status ?? 'N/A'}
    </span>
  );
}

// ─── Form validation ──────────────────────────────────────────────────────────
function validateForm(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Name is required.';
  if (!form.primary_email.trim()) {
    errors.primary_email = 'primary_email is required.';
  } else if (!isValidEmail(form.primary_email)) {
    errors.primary_email = 'Enter a valid primary_email address.';
  }
  return errors;
}

// ─── Create / Edit Modal ──────────────────────────────────────────────────────
function TrackerLogisticModal({ record, onClose, onSuccess }) {
  const isEdit = Boolean(record);
  const [form, setForm] = useState({
    name: record?.name ?? '',
    primary_email: record?.primary_email ?? '',
    cc_email: Array.isArray(record?.cc_email)
      ? record.cc_email
      : record?.cc_email
        ? String(record.cc_email)
            .split(',')
            .map((e) => e.trim())
            .filter(Boolean)
        : [],
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (field, val) => {
    setForm((f) => ({ ...f, [field]: val }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateForm(form);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        primary_email: form.primary_email.trim(),
        cc_email: form.cc_email.join(', '),
      };
      if (isEdit) {
        await updateTrackerLogistic(record.id, payload);
        toast.success('Record updated successfully');
      } else {
        await createTrackerLogistic(payload);
        toast.success('Record created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        'Failed to save record. Please try again.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="border-mc-beige-dark bg-mc-white animate-scaleUp flex h-auto max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-mc-beige-dark flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-mc-beige-light border-mc-beige-dark flex h-9 w-9 items-center justify-center rounded-xl border">
              <Truck className="text-mc-gold h-4 w-4" />
            </div>
            <div>
              <h3 className="text-mc-black text-sm font-bold">
                {isEdit ? 'Edit Tracker Logistics' : 'Add Tracker Logistics'}
              </h3>
              <p className="text-mc-gray-soft text-[10px]">
                {isEdit
                  ? 'Update the record details below.'
                  : 'Fill in the details to create a new record.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-mc-gray-soft hover:bg-mc-beige-light rounded-lg p-1.5 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          className="custom-scrollbar flex-1 overflow-y-auto"
        >
          <div className="space-y-4 p-5">
            {/* Name */}
            <div>
              <label className="text-mc-black mb-1.5 block text-sm font-bold">
                Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Global Freight Services"
                className={`border-mc-beige-dark bg-mc-white focus:border-mc-black w-full rounded-lg border px-3 py-2 text-sm transition focus:outline-none ${errors.name ? 'border-rose-400' : ''}`}
              />
              {errors.name && (
                <p className="mt-1 text-[11px] text-rose-500">{errors.name}</p>
              )}
            </div>

            {/* primary_email */}
            <div>
              <label className="text-mc-black mb-1.5 block text-sm font-bold">
                Primary Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="text-mc-gray-soft absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <input
                  type="email"
                  value={form.primary_email}
                  onChange={(e) => set('primary_email', e.target.value)}
                  placeholder="e.g. dispatch@company.com"
                  className={`border-mc-beige-dark bg-mc-white focus:border-mc-black w-full rounded-lg border py-2 pr-3 pl-9 text-sm transition focus:outline-none ${errors.primary_email ? 'border-rose-400' : ''}`}
                />
              </div>
              {errors.primary_email && (
                <p className="mt-1 text-[11px] text-rose-500">
                  {errors.primary_email}
                </p>
              )}
            </div>

            {/* CC Emails */}
            <div>
              <label className="text-mc-black mb-1.5 block text-sm font-bold">
                CC Emails
                <span className="text-mc-gray-soft ml-2 text-xs font-normal">
                  (optional, multiple)
                </span>
              </label>
              <CCEmailInput
                value={form.cc_email}
                onChange={(v) => set('cc_email', v)}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="border-mc-beige-dark flex items-center justify-end gap-3 border-t px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="border-mc-beige-dark bg-mc-white text-mc-black hover:bg-mc-beige-light rounded-lg border px-4 py-2 text-xs font-bold transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-mc-gold text-mc-black flex items-center gap-2 rounded-lg px-5 py-2 text-xs font-bold transition hover:opacity-80 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : isEdit ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Save Changes
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Create Record
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

// ─── View Modal ───────────────────────────────────────────────────────────────
function ViewModal({ record, onClose, onEdit }) {
  const formatDate = (d) => {
    if (!d) return 'N/A';
    try {
      return new Date(d).toLocaleString();
    } catch {
      return d;
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="border-mc-beige-dark bg-mc-white animate-scaleUp w-full max-w-2xl overflow-hidden rounded-2xl border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-mc-beige-dark flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-mc-beige-light border-mc-beige-dark flex h-9 w-9 items-center justify-center rounded-xl border">
              <Truck className="text-mc-gold h-4 w-4" />
            </div>
            <div>
              <h3 className="text-mc-black text-sm font-bold">{record.name}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-mc-gray-soft hover:bg-mc-beige-light rounded-lg p-1.5 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="border-mc-beige-dark bg-mc-beige-light/30 rounded-lg border p-3">
              <p className="text-mc-gray-soft mb-1 text-[10px] font-medium tracking-wider uppercase">
                primary_email
              </p>
              <p className="text-mc-black text-xs font-semibold break-all">
                {record.primary_email || 'N/A'}
              </p>
            </div>
            <div className="border-mc-beige-dark bg-mc-beige-light/30 rounded-lg border p-3">
              <p className="text-mc-gray-soft mb-1 text-[10px] font-medium tracking-wider uppercase">
                Status
              </p>
            </div>
          </div>

          <div className="border-mc-beige-dark bg-mc-beige-light/30 rounded-lg border p-3">
            <p className="text-mc-gray-soft mb-2 text-[10px] font-medium tracking-wider uppercase">
              CC Emails (
              {
                (Array.isArray(record.cc_email)
                  ? record.cc_email
                  : record.cc_email
                    ? String(record.cc_email)
                        .split(',')
                        .map((e) => e.trim())
                        .filter(Boolean)
                    : []
                ).length
              }
              )
            </p>
            {(Array.isArray(record.cc_email)
              ? record.cc_email
              : record.cc_email
                ? String(record.cc_email)
                    .split(',')
                    .map((e) => e.trim())
                    .filter(Boolean)
                : []
            ).length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {(Array.isArray(record.cc_email)
                  ? record.cc_email
                  : record.cc_email
                    ? String(record.cc_email)
                        .split(',')
                        .map((e) => e.trim())
                        .filter(Boolean)
                    : []
                ).map((e, i) => (
                  <span
                    key={i}
                    className="bg-mc-beige-light border-mc-beige-dark text-mc-black inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px]"
                  >
                    {e}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-mc-gray-soft text-xs italic">
                No CC emails added
              </p>
            )}
          </div>

          {record.description && (
            <div className="border-mc-beige-dark bg-mc-beige-light/30 rounded-lg border p-3">
              <p className="text-mc-gray-soft mb-1 text-[10px] font-medium tracking-wider uppercase">
                Description
              </p>
              <p className="text-mc-black text-xs leading-relaxed whitespace-pre-wrap">
                {record.description}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="border-mc-beige-dark bg-mc-beige-light/30 rounded-lg border p-3">
              <p className="text-mc-gray-soft mb-1 text-[10px] font-medium tracking-wider uppercase">
                Created
              </p>
              <p className="text-mc-black text-xs">
                {formatDate(record.created_at)}
              </p>
            </div>
            <div className="border-mc-beige-dark bg-mc-beige-light/30 rounded-lg border p-3">
              <p className="text-mc-gray-soft mb-1 text-[10px] font-medium tracking-wider uppercase">
                Updated
              </p>
              <p className="text-mc-black text-xs">
                {formatDate(record.updated_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-mc-beige-dark flex justify-end gap-2 border-t px-5 py-4">
          <button
            onClick={onClose}
            className="border-mc-beige-dark bg-mc-white text-mc-black hover:bg-mc-beige-light rounded-lg border px-4 py-2 text-xs font-bold transition"
          >
            Close
          </button>
          <button
            onClick={() => {
              onClose();
              onEdit(record);
            }}
            className="bg-mc-gold text-mc-black flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition hover:opacity-80"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TrackerLogisticsPage() {
  const { userRole } = useCRM();

  // Role guard
  const normalizedRole = (userRole || '').toLowerCase();
  const isAllowed = ['administrator', 'office'].includes(normalizedRole);

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const tableRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {};
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTrackerLogistics();
      setRecords(data);
    } catch (err) {
      toast.error('Failed to load tracker logistics records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAllowed) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getTrackerLogistics();
        setRecords(data);
      } catch {
        toast.error('Failed to load tracker logistics records.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAllowed]);

  // Scroll to top on page change
  useEffect(() => {
    if (tableRef.current) tableRef.current.scrollTop = 0;
  }, [page, pageSize]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return records.slice(start, start + pageSize);
  }, [records, page, pageSize]);

  const formatDate = (d) => {
    if (!d) return '—';
    try {
      return new Date(d).toISOString().split('T')[0];
    } catch {
      return d;
    }
  };

  const handleEdit = useCallback((record) => {
    setEditingRecord(record);
    setShowModal(true);
  }, []);

  const handleDelete = useCallback((record) => {
    setDeletingRecord(record);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deletingRecord) return;
    setIsDeleting(true);
    try {
      await deleteTrackerLogistic(deletingRecord.id);
      toast.success(`"${deletingRecord.name}" deleted successfully.`);
      setDeletingRecord(null);
      fetchData();
    } catch {
      toast.error('Failed to delete record. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }, [deletingRecord, fetchData]);

  const columns = useMemo(
    () => [
      {
        header: 'Name',
        accessor: 'name',
        headerClassName: 'px-5 py-3 text-left w-[18%]',
        className: 'px-5 py-3 w-[18%] font-semibold text-mc-black text-sm',
        render: (r) => (
          <div className="group relative w-fit max-w-[180px]">
            <div className="cursor-default truncate font-semibold">
              {r.name || '—'}
            </div>
            {r.name && (
              <div className="border-mc-beige-dark bg-mc-beige-light pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded border px-3 py-1.5 text-xs font-bold whitespace-nowrap text-sky-800 opacity-0 shadow-sm transition-all group-hover:visible group-hover:opacity-100">
                <div className="border-mc-beige-dark bg-mc-beige-light absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-r border-b" />
                {r.name.toUpperCase()}
              </div>
            )}
          </div>
        ),
      },
      {
        header: 'Primary Email',
        accessor: 'primary_email',
        headerClassName: 'px-5 py-3 text-left w-[20%]',
        className: 'px-5 py-3 w-[20%] text-mc-gray-soft text-sm',
        render: (r) => (
          <div className="group relative w-fit max-w-[200px]">
            <div className="cursor-default truncate">
              {r.primary_email || '—'}
            </div>
            {r.primary_email && (
              <div className="border-mc-beige-dark bg-mc-beige-light text-mc-black pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded border px-3 py-1.5 text-xs font-semibold whitespace-nowrap opacity-0 shadow-sm transition-all group-hover:visible group-hover:opacity-100">
                <div className="border-mc-beige-dark bg-mc-beige-light absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-r border-b" />
                {r.primary_email}
              </div>
            )}
          </div>
        ),
      },
      {
        header: 'CC Emails',
        accessor: 'cc_email',
        headerClassName: 'px-5 py-3 text-left w-[25%]',
        className: 'px-5 py-3 w-[25%]',
        render: (r) => {
          const cc = Array.isArray(r.cc_email)
            ? r.cc_email
            : r.cc_email
              ? String(r.cc_email)
                  .split(',')
                  .map((e) => e.trim())
                  .filter(Boolean)
              : [];
          if (!cc.length)
            return (
              <span className="text-mc-gray-soft text-xs italic">None</span>
            );
          const visible = cc.slice(0, 2);
          const rest = cc.length - 2;
          return (
            <div className="flex flex-wrap gap-1">
              {visible.map((e, i) => (
                <span
                  key={i}
                  className="bg-mc-beige-light border-mc-beige-dark text-mc-black inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px]"
                >
                  {e}
                </span>
              ))}
              {rest > 0 && (
                <div className="group relative flex items-center">
                  <span className="text-mc-gray-soft cursor-default text-[10px] italic">
                    +{rest} more
                  </span>
                  <div className="border-mc-beige-dark bg-mc-beige-light pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded border px-3 py-1.5 text-xs font-bold whitespace-nowrap text-sky-800 opacity-0 shadow-sm transition-all group-hover:visible group-hover:opacity-100">
                    <div className="border-mc-beige-dark bg-mc-beige-light absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-r border-b" />
                    {cc.slice(2).join(' / ').toUpperCase()}
                  </div>
                </div>
              )}
            </div>
          );
        },
      },
      {
        header: 'Created',
        accessor: 'created_at',
        headerClassName: 'px-5 py-3 text-left w-[12%]',
        className: 'px-5 py-3 w-[12%] text-mc-gray-soft font-mono text-xs',
        render: (r) => formatDate(r.created_at),
      },
      {
        header: 'Actions',
        accessor: 'actions',
        headerClassName: 'px-5 py-3 text-center w-[15%]',
        className: 'px-5 py-3 w-[15%] text-center',
        render: (r) => (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => handleEdit(r)}
              className="hover:bg-mc-beige-light hover:text-mc-gold rounded-md p-1.5 text-slate-400 transition"
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(r)}
              className="rounded-md p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [handleEdit, handleDelete],
  );

  // Access denied screen
  if (!isAllowed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8">
        <div className="bg-mc-beige-light border-mc-beige-dark flex h-16 w-16 items-center justify-center rounded-2xl border">
          <XCircle className="text-mc-gray-soft h-8 w-8" />
        </div>
        <div className="text-center">
          <h2 className="text-mc-black text-base font-bold">
            Access Restricted
          </h2>
          <p className="text-mc-gray-soft mt-1 text-sm">
            You do not have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in bg-mc-beige-light/30 relative flex h-full w-full flex-col overflow-hidden">
      {/* Page Header */}
      <div className="border-mc-beige-dark bg-mc-white sticky top-0 z-30 flex w-full flex-shrink-0 flex-col items-start justify-between gap-4 border-b px-5 py-3 shadow-none sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="bg-mc-beige-light text-mc-black border-mc-beige-dark flex h-8 w-8 min-w-[2rem] items-center justify-center rounded-lg border">
            <Truck className="h-4 w-4 shrink-0" />
          </div>
          <div>
            <h1 className="font-display text-mc-black text-lg font-bold">
              Tracker Logistics
            </h1>
            <p className="text-mc-gray-soft text-xs font-medium">
              Manage logistics contacts and primary_email configurations
            </p>
          </div>
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <button
            onClick={fetchData}
            disabled={loading}
            className="border-mc-beige-dark text-mc-gray-soft hover:bg-mc-beige-light flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 sm:flex-none"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 shrink-0 ${loading ? 'animate-spin' : ''}`}
            />
            <span className="whitespace-nowrap">
              {loading ? 'Refreshing…' : 'Refresh'}
            </span>
          </button>
          <button
            onClick={() => {
              setEditingRecord(null);
              setShowModal(true);
            }}
            className="bg-mc-gold text-mc-black flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-1.5 text-xs font-bold transition hover:opacity-80 sm:flex-none"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span className="whitespace-nowrap">Add Tracker Logistics</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex min-h-0 w-full flex-1 flex-col gap-4 p-4">
        {/* Table */}
        <div className="border-mc-beige-dark bg-mc-white relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border shadow-none">
          {loading && <TableLoader message="Loading records…" />}
          <DataTable
            columns={columns}
            data={paginated}
            keyField="id"
            containerClassName="flex-1 flex flex-col min-h-0 w-full relative"
            tableWrapperClassName="overflow-auto flex-1 custom-scrollbar scroll-smooth"
            tableWrapperRef={tableRef}
            theadClassName="bg-mc-beige-light border-b border-mc-beige-dark text-mc-black uppercase tracking-widest font-extrabold text-[10px] sticky top-0 z-10"
            tableClassName="w-full min-w-[800px] text-left text-xs border-collapse"
            tbodyClassName="divide-y divide-mc-beige-dark/40 text-mc-black"
            trClassName="hover:bg-mc-beige-light/30 bg-mc-white transition-colors"
            emptyMessage={
              'No Tracker Logistics records yet. Click "Add Tracker Logistics" to create one.'
            }
            pagination={
              records.length > pageSize ? (
                <Pagination
                  currentPage={page}
                  totalCount={records.length}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={(s) => {
                    setPageSize(s);
                    setPage(1);
                  }}
                />
              ) : null
            }
          />
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <TrackerLogisticModal
          record={editingRecord}
          onClose={() => {
            setShowModal(false);
            setEditingRecord(null);
          }}
          onSuccess={fetchData}
        />
      )}

      {/* View Modal */}
      {viewingRecord && (
        <ViewModal
          record={viewingRecord}
          onClose={() => setViewingRecord(null)}
          onEdit={(r) => {
            setViewingRecord(null);
            setEditingRecord(r);
            setShowModal(true);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingRecord &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="animate-in fade-in zoom-in-95 border-mc-beige-dark bg-mc-white relative w-full max-w-sm rounded-2xl border shadow-2xl duration-200">
              {/* Header */}
              <div className="border-mc-beige-dark flex items-center justify-between border-b px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="bg-mc-beige-light border-mc-beige-dark flex h-9 w-9 items-center justify-center rounded-xl border">
                    <AlertTriangle className="text-mc-gold h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-mc-black text-sm font-bold">
                      Delete Record
                    </h3>
                    <p className="text-mc-gray-soft text-[10px]">
                      This cannot be undone
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDeletingRecord(null)}
                  disabled={isDeleting}
                  className="text-mc-gray-soft hover:bg-mc-beige-light rounded-lg p-1.5 transition disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {/* Body */}
              <div className="bg-mc-beige-light/40 px-5 py-5">
                <p className="text-mc-black text-sm leading-relaxed">
                  Are you sure you want to permanently delete{' '}
                  <span className="font-bold">
                    &quot;{deletingRecord.name}&quot;
                  </span>
                  ?
                </p>
                <p className="text-mc-gray-soft mt-2 text-xs leading-relaxed">
                  All data associated with this record will be removed and
                  cannot be recovered.
                </p>
              </div>
              {/* Footer */}
              <div className="border-mc-beige-dark flex items-center justify-end gap-2 border-t px-5 py-4">
                <button
                  onClick={() => setDeletingRecord(null)}
                  disabled={isDeleting}
                  className="border-mc-beige-dark bg-mc-white text-mc-black hover:bg-mc-beige-light rounded-lg border px-4 py-2 text-xs font-bold transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="bg-mc-black text-mc-beige-light hover:bg-mc-black/80 flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition disabled:opacity-60"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Deleting…
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Record
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
