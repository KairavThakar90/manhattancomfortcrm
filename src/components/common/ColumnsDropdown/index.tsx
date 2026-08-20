import React, { useEffect, useRef, useState } from 'react';
import { Check, Columns3, Loader2 } from 'lucide-react';
import { ColumnDef } from '../../../hooks/useColumnVisibility';

interface ColumnsDropdownProps {
  columns: ColumnDef[];
  isVisible: (key: string) => boolean;
  onToggle: (key: string) => void;
  onSave: () => void | Promise<void>;
  saving?: boolean;
  className?: string;
}

export default function ColumnsDropdown({
  columns,
  isVisible,
  onToggle,
  onSave,
  saving = false,
  className = '',
}: ColumnsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSave = async () => {
    await onSave();
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="border-mc-beige-dark bg-mc-white text-mc-black hover:border-mc-gold flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition"
      >
        <Columns3 className="h-3.5 w-3.5" />
        Columns
      </button>

      {isOpen && (
        <div className="bg-mc-white border-mc-beige-dark animate-scaleUp absolute right-0 z-50 mt-1 flex max-h-96 w-[240px] flex-col rounded-xl border p-2 shadow-lg">
          <div className="max-h-72 flex-1 space-y-0.5 overflow-y-auto scroll-smooth">
            {columns.map((col) => {
              const visible = isVisible(col.key);
              const disabled = !!col.locked;
              return (
                <button
                  type="button"
                  key={col.key}
                  disabled={disabled}
                  onClick={() => !disabled && onToggle(col.key)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-xs transition ${
                    disabled
                      ? 'cursor-not-allowed text-slate-400'
                      : 'text-mc-black hover:bg-mc-beige-light/50'
                  }`}
                >
                  <span className="truncate pr-2">{col.label}</span>
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      visible
                        ? 'bg-mc-gold border-mc-gold'
                        : 'border-mc-beige-dark bg-mc-white'
                    }`}
                  >
                    {visible && <Check className="h-3 w-3 text-white" />}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="border-mc-beige-dark mt-1 border-t pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-mc-gold hover:bg-mc-gold/90 flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-bold text-white transition disabled:opacity-60"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
