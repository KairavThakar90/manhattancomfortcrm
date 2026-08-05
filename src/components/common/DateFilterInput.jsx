import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const MONTH_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// Year range for the dropdown
const MIN_YEAR = 2015;
const MAX_YEAR = 2050;
const YEARS = Array.from(
  { length: MAX_YEAR - MIN_YEAR + 1 },
  (_, i) => MIN_YEAR + i,
);

function parseDateOnly(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

function formatDateOnly(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function sameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Empty-by-default date filter. Opens a custom calendar with styled
 * month/year selector panels for quick navigation.
 */
export default function DateFilterInput({
  value = '',
  onChange,
  title = 'Date filter',
  className = '',
}) {
  const selected = parseDateOnly(value);
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(selected || new Date()),
  );
  // 'none' | 'month' | 'year'
  const [pickerMode, setPickerMode] = useState('none');
  const rootRef = useRef(null);
  const yearGridRef = useRef(null);

  const handleToggleCalendar = () => {
    if (!open) {
      // Opening: reset view to selected date or today
      const parsed = parseDateOnly(value);
      setViewMonth(startOfMonth(parsed || new Date()));
      setPickerMode('none');
    }
    setOpen((v) => !v);
  };

  // Scroll active year into view when year panel opens
  useEffect(() => {
    if (pickerMode === 'year' && yearGridRef.current) {
      const activeBtn = yearGridRef.current.querySelector(
        '[data-active="true"]',
      );
      if (activeBtn) {
        activeBtn.scrollIntoView({ block: 'center', behavior: 'instant' });
      }
    }
  }, [pickerMode]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const days = useMemo(() => {
    const first = startOfMonth(viewMonth);
    const startOffset = first.getDay();
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - startOffset);

    return Array.from({ length: 42 }, (_, i) => {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + i);
      return day;
    });
  }, [viewMonth]);

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const currentMonth = viewMonth.getMonth();
  const currentYear = viewMonth.getFullYear();

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          title={title}
          onClick={handleToggleCalendar}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500 focus:bg-white text-slate-700 transition min-w-[8.5rem] text-left"
        >
          {selected ? (
            <span className="font-medium">{formatDateOnly(selected)}</span>
          ) : (
            <span className="text-slate-400">yyyy-mm-dd</span>
          )}
        </button>
        {selected && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
            className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 px-1.5 py-1 rounded-lg hover:bg-rose-50 transition font-medium"
            title="Clear date filter"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-64 rounded-xl border border-slate-200 bg-white shadow-lg p-3">
          {/* ── Header: arrows + month/year buttons ── */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              className="p-1 rounded-md hover:bg-slate-100 text-slate-500 transition"
              onClick={() => {
                setPickerMode('none');
                setViewMonth(new Date(currentYear, currentMonth - 1, 1));
              }}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-0.5">
              {/* Month selector button */}
              <button
                type="button"
                onClick={() =>
                  setPickerMode((m) => (m === 'month' ? 'none' : 'month'))
                }
                className={[
                  'flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-md transition',
                  pickerMode === 'month'
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-slate-700 hover:bg-slate-100',
                ].join(' ')}
              >
                {MONTH_FULL[currentMonth]}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </button>

              {/* Year selector button */}
              <button
                type="button"
                onClick={() =>
                  setPickerMode((m) => (m === 'year' ? 'none' : 'year'))
                }
                className={[
                  'flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-md transition',
                  pickerMode === 'year'
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-slate-700 hover:bg-slate-100',
                ].join(' ')}
              >
                {currentYear}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </button>
            </div>

            <button
              type="button"
              className="p-1 rounded-md hover:bg-slate-100 text-slate-500 transition"
              onClick={() => {
                setPickerMode('none');
                setViewMonth(new Date(currentYear, currentMonth + 1, 1));
              }}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* ── Month picker grid (3 × 4) ── */}
          {pickerMode === 'month' && (
            <div className="grid grid-cols-3 gap-1 mb-2 p-1 rounded-lg bg-slate-50 border border-slate-100">
              {MONTH_NAMES.map((name, idx) => {
                const isActive = idx === currentMonth;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setViewMonth(new Date(currentYear, idx, 1));
                      setPickerMode('none');
                    }}
                    className={[
                      'text-xs py-1.5 rounded-md font-medium transition',
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-white hover:shadow-sm hover:text-indigo-600',
                    ].join(' ')}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Year picker grid (4 × 4 scrollable) ── */}
          {pickerMode === 'year' && (
            <div
              ref={yearGridRef}
              className="grid grid-cols-4 gap-1 mb-2 p-1 rounded-lg bg-slate-50 border border-slate-100 max-h-40 overflow-y-auto"
            >
              {YEARS.map((yr) => {
                const isActive = yr === currentYear;
                return (
                  <button
                    key={yr}
                    type="button"
                    data-active={isActive}
                    onClick={() => {
                      setViewMonth(new Date(yr, currentMonth, 1));
                      setPickerMode('none');
                    }}
                    className={[
                      'text-xs py-1.5 rounded-md font-medium transition',
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-white hover:shadow-sm hover:text-indigo-600',
                    ].join(' ')}
                  >
                    {yr}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Weekday headers ── */}
          {pickerMode === 'none' && (
            <>
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {WEEKDAYS.map((d) => (
                  <div
                    key={d}
                    className="text-[10px] font-semibold text-slate-400 text-center py-1"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* ── Day grid ── */}
              <div className="grid grid-cols-7 gap-0.5">
                {days.map((day) => {
                  const inMonth = day.getMonth() === viewMonth.getMonth();
                  const isSelected = sameDay(day, selected);
                  const isToday = sameDay(day, today);

                  return (
                    <button
                      key={formatDateOnly(day)}
                      type="button"
                      onClick={() => {
                        onChange(formatDateOnly(day));
                        setOpen(false);
                      }}
                      className={[
                        'h-8 w-8 rounded-md text-xs transition',
                        inMonth ? 'text-slate-700' : 'text-slate-300',
                        isSelected
                          ? 'bg-indigo-600 text-white font-semibold hover:bg-indigo-700'
                          : 'hover:bg-slate-100',
                        !isSelected && isToday
                          ? 'ring-1 ring-inset ring-slate-300'
                          : '',
                      ].join(' ')}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
