import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, Loader2, X } from 'lucide-react';
import { getWarehouses } from '../../../services/warehouse.service';

interface WarehouseInfiniteDropdownProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  showAllOption?: boolean;
  className?: string;
  disabled?: boolean;
}

export default function WarehouseInfiniteDropdown({
  value,
  onChange,
  placeholder = 'Select Warehouse',
  showAllOption = false,
  className = '',
  disabled = false,
}: WarehouseInfiniteDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch on first open, or immediately if we already have a value to
  // resolve to a name (e.g. when the field is disabled and never opened).
  useEffect(() => {
    const needsFetch = isOpen || (value && value !== 'all');
    if (needsFetch && warehouses.length === 0) {
      fetchWarehouses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, value]);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const data = await getWarehouses();
      const results = Array.isArray(data)
        ? data
        : data.results || data.data || [];
      if (results) {
        setWarehouses(results);
      }
    } catch (err) {
      console.error('Failed to load warehouses', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (vendorId: string) => {
    onChange(vendorId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const filteredWarehouses = !searchTerm
    ? warehouses
    : warehouses.filter((w) =>
        (w.name || w.warehouse_name || '')
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
      );

  const selectedOption = warehouses.find(
    (w) => String(w.sellercloud_warehouse_id || w.id) === String(value),
  );

  let displayLabel = placeholder;
  if (value === 'all' && showAllOption) {
    displayLabel = 'All Warehouses';
  } else if (selectedOption) {
    displayLabel =
      selectedOption.name || selectedOption.warehouse_name || selectedOption.id;
  } else if (value && value !== 'all') {
    displayLabel = loading ? 'Loading...' : value; // Fallback
  }

  return (
    <div className="relative inline-block w-full" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`${className} flex items-center justify-between text-left ${
          disabled ? 'cursor-not-allowed opacity-60' : ''
        }`}
      >
        <span className="truncate">{displayLabel}</span>
        {!disabled && value && value !== 'all' ? (
          <X
            className="h-4 w-4 shrink-0 text-slate-400 transition-colors hover:text-red-500"
            onClick={(e) => {
              e.stopPropagation();
              handleSelect(showAllOption ? 'all' : '');
            }}
          />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        )}
      </button>

      {isOpen && !disabled && (
        <div className="bg-mc-white border-mc-beige-dark animate-scaleUp absolute top-full left-0 z-50 mt-1 flex max-h-80 w-full flex-col rounded-xl border p-2 shadow-lg">
          <div className="border-mc-beige-dark mb-1 border-b px-1 pt-1 pb-2">
            <div className="relative">
              <Search className="absolute top-2 left-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search warehouses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="focus:border-mc-black focus:ring-mc-black w-full rounded-md border border-slate-200 py-1.5 pr-2 pl-8 text-xs outline-hidden transition focus:ring-1"
              />
            </div>
          </div>
          <div className="custom-scrollbar max-h-56 flex-1 space-y-0.5 overflow-y-auto scroll-smooth">
            {showAllOption && (
              <button
                type="button"
                onClick={() => handleSelect('all')}
                className={`flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-xs transition ${
                  value === 'all'
                    ? 'bg-mc-beige-light text-mc-black font-bold'
                    : 'text-mc-black hover:bg-mc-beige-light/50'
                }`}
              >
                <span>All Warehouses</span>
                {value === 'all' && <Check className="h-3.5 w-3.5" />}
              </button>
            )}

            {filteredWarehouses.map((wh) => {
              const optValue = wh.sellercloud_warehouse_id || wh.id;
              const isSelected = String(value) === String(optValue);

              return (
                <button
                  type="button"
                  key={wh.id}
                  onClick={() => handleSelect(String(optValue))}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-xs transition ${
                    isSelected
                      ? 'bg-mc-beige-light text-mc-black font-bold'
                      : 'text-mc-black hover:bg-mc-beige-light/50'
                  }`}
                >
                  <div className="flex flex-col truncate">
                    <span className="truncate font-medium">
                      {wh.name || wh.warehouse_name || wh.id}
                    </span>
                    {wh.warehouse_name && wh.name && (
                      <span className="truncate text-[10px] text-slate-400">
                        {wh.name}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="text-mc-gold h-3.5 w-3.5 shrink-0" />
                  )}
                </button>
              );
            })}

            {loading && (
              <div className="text-mc-gray-soft flex items-center justify-center py-4">
                <Loader2 className="text-mc-gold h-4 w-4 animate-spin" />
              </div>
            )}

            {!loading && filteredWarehouses.length === 0 && (
              <div className="py-4 text-center text-xs text-slate-400 italic">
                No warehouses found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
