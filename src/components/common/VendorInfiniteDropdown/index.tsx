import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search, ChevronDown, Check, Loader2, X } from 'lucide-react';
import { fetchVendorsPage, setVendorSearch } from '../../../store/vendorSlice';

interface VendorItem {
  id: string;
  name: string;
  country?: string;
  po_count?: number;
}

interface VendorInfiniteDropdownProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  showAllOption?: boolean;
  className?: string;
}

export default function VendorInfiniteDropdown({
  value,
  onChange,
  placeholder = 'Select Vendor',
  showAllOption = false,
  className = '',
}: VendorInfiniteDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const dispatch = useDispatch<any>();
  const vendors = useSelector((state: any) => state.vendors.list) || [];
  const page = useSelector((state: any) => state.vendors.page) || 1;
  const loading = useSelector((state: any) => state.vendors.loading) || false;
  const hasMore = useSelector((state: any) => state.vendors.hasMore) !== false;

  useEffect(() => {
    if (isOpen) {
      // Only fetch the full list when opened, rely on local filtering for search
      dispatch(
        (fetchVendorsPage as any)({
          search: '',
        }),
      );
    }
  }, [isOpen, dispatch]);

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

  const selectedName =
    value === 'all'
      ? 'All Vendors'
      : vendors.find((v) => v.id === value)?.name || value || placeholder;

  return (
    <div className="relative inline-block w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`${className} flex items-center justify-between text-left`}
      >
        <span className="truncate">{selectedName}</span>
        {value && value !== 'all' ? (
          <X
            className="h-4 w-4 shrink-0 text-slate-400 transition-colors hover:text-red-500"
            onClick={(e) => {
              e.stopPropagation();
              onChange(showAllOption ? 'all' : '');
              setIsOpen(false);
            }}
          />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div className="bg-mc-white border-mc-beige-dark animate-scaleUp absolute right-0 z-50 mt-1 flex max-h-80 w-[260px] flex-col rounded-xl border p-2 shadow-lg">
          <div className="border-mc-beige-dark mb-1 border-b px-1 pt-1 pb-2">
            <div className="relative">
              <Search className="absolute top-2 left-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="focus:border-mc-black focus:ring-mc-black w-full rounded-md border border-slate-200 py-1.5 pr-2 pl-8 text-xs outline-hidden transition focus:ring-1"
              />
            </div>
          </div>

          <div
            ref={listRef}
            className="max-h-48 flex-1 space-y-0.5 overflow-y-auto scroll-smooth"
          >
            {showAllOption && (
              <button
                type="button"
                onClick={() => {
                  onChange('all');
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className={`flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-xs transition ${
                  value === 'all'
                    ? 'bg-mc-beige-light text-mc-black font-bold'
                    : 'text-mc-black hover:bg-mc-beige-light/50'
                }`}
              >
                <span>All Vendors</span>
                {value === 'all' && <Check className="h-3.5 w-3.5" />}
              </button>
            )}

            {(!searchTerm
              ? vendors
              : vendors.filter((v) =>
                  v.name.toLowerCase().includes(searchTerm.toLowerCase()),
                )
            ).map((vendor) => {
              const isSelected = value === vendor.id;
              return (
                <button
                  type="button"
                  key={vendor.id}
                  onClick={() => handleSelect(vendor.id)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-xs transition ${
                    isSelected
                      ? 'bg-mc-beige-light text-mc-black font-bold'
                      : 'text-mc-black hover:bg-mc-beige-light/50'
                  }`}
                >
                  <div className="flex flex-1 items-center justify-between truncate pr-2">
                    <span className="truncate">
                      {vendor.name}{' '}
                      {vendor.country ? `(${vendor.country})` : ''}
                    </span>
                    {vendor.po_count !== undefined && (
                      <span className="ml-2 shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-500">
                        {vendor.po_count} POs
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="text-mc-gold h-3.5 w-3.5 shrink-0" />
                  )}
                </button>
              );
            })}

            {!loading && vendors.length === 0 && (
              <div className="py-4 text-center text-xs text-slate-400 italic">
                No vendors found
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="text-mc-gold h-4 w-4 animate-spin" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
