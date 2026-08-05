import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Loader2 } from 'lucide-react';
import { getWarehouses } from '../../../services/warehouse.service';

interface WarehouseInfiniteDropdownProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  showAllOption?: boolean;
  className?: string;
}

export default function WarehouseInfiniteDropdown({
  value,
  onChange,
  placeholder = 'Select Warehouse',
  showAllOption = false,
  className = '',
}: WarehouseInfiniteDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && warehouses.length === 0) {
      fetchWarehouses();
    }
  }, [isOpen]);

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
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const handleSelect = (vendorId: string) => {
    onChange(vendorId);
    setIsOpen(false);
  };

  const filteredWarehouses = warehouses;

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
    displayLabel = value; // Fallback
  }

  return (
    <div className="relative inline-block w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`${className} flex items-center justify-between text-left`}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-2 animate-scaleUp">
          <div className="overflow-y-auto max-h-48 space-y-0.5 scroll-smooth custom-scrollbar">
            {showAllOption && (
              <button
                type="button"
                onClick={() => handleSelect('all')}
                className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition flex items-center justify-between ${
                  value === 'all'
                    ? 'bg-indigo-50 text-indigo-700 font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
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
                  className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex flex-col truncate">
                    <span className="truncate font-medium">
                      {wh.name || wh.warehouse_name || wh.id}
                    </span>
                    {wh.warehouse_name && wh.name && (
                      <span className="text-[10px] text-slate-400 truncate">
                        {wh.name}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  )}
                </button>
              );
            })}

            {loading && (
              <div className="flex items-center justify-center py-4 text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}

            {!loading && filteredWarehouses.length === 0 && (
              <div className="text-center py-4 text-xs text-slate-400 italic">
                No warehouses found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
