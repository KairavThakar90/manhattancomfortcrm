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
  disabled = false,
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
    if (disabled) return;
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
          disabled={disabled}
          className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition focus:outline-none ${
            disabled
              ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500 opacity-60'
              : 'border-mc-beige-dark bg-mc-white text-mc-black focus:border-mc-gold focus:ring-mc-gold focus:ring-1'
          }`}
        >
          {selected ? (
            <span className="font-bold">{formatDateOnly(selected)}</span>
          ) : (
            <span className="text-mc-gray-soft font-medium">yyyy-mm-dd</span>
          )}
        </button>
        {selected && !disabled && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
            className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-medium text-rose-500 transition hover:bg-rose-50 hover:text-rose-700"
            title="Clear date filter"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {open && (
        <div className="border-mc-beige-dark bg-mc-white animate-scaleUp absolute top-full right-0 z-50 mt-1 w-64 rounded-xl border p-3 shadow-lg">
          {/* ── Header: arrows + month/year buttons ── */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100"
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
                  'flex items-center gap-0.5 rounded-md px-2 py-1 text-xs font-bold transition',
                  pickerMode === 'month'
                    ? 'bg-mc-beige-light text-mc-black'
                    : 'text-mc-black hover:bg-mc-beige-light/50',
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
                  'flex items-center gap-0.5 rounded-md px-2 py-1 text-xs font-bold transition',
                  pickerMode === 'year'
                    ? 'bg-mc-beige-light text-mc-black'
                    : 'text-mc-black hover:bg-mc-beige-light/50',
                ].join(' ')}
              >
                {currentYear}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </button>
            </div>

            <button
              type="button"
              className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100"
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
            <div className="border-mc-beige-dark bg-mc-beige-light/30 mb-2 grid grid-cols-3 gap-1 rounded-lg border p-1">
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
                      'rounded-md py-1.5 text-xs font-medium transition',
                      isActive
                        ? 'bg-mc-gold text-mc-black font-bold shadow-sm'
                        : 'text-mc-gray-soft hover:bg-mc-white hover:text-mc-black hover:shadow-sm',
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
              className="custom-scrollbar border-mc-beige-dark bg-mc-beige-light/30 mb-2 grid max-h-40 grid-cols-4 gap-1 overflow-y-auto rounded-lg border p-1"
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
                      'rounded-md py-1.5 text-xs font-medium transition',
                      isActive
                        ? 'bg-mc-gold text-mc-black font-bold shadow-sm'
                        : 'text-mc-gray-soft hover:bg-mc-white hover:text-mc-black hover:shadow-sm',
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
              <div className="mb-1 grid grid-cols-7 gap-0.5">
                {WEEKDAYS.map((d) => (
                  <div
                    key={d}
                    className="text-mc-gray-soft py-1 text-center text-[10px] font-bold"
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
                        inMonth ? 'text-mc-black' : 'text-mc-gray-soft/50',
                        isSelected
                          ? 'bg-mc-gold text-mc-black hover:bg-mc-gold/80 font-bold hover:shadow-sm'
                          : 'hover:bg-mc-beige-light',
                        !isSelected && isToday
                          ? 'ring-mc-beige-dark font-bold ring-1 ring-inset'
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
