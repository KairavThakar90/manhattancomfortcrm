import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search, ChevronDown, Check, Loader2 } from 'lucide-react';
import { fetchVendorsPage, setVendorSearch } from '../../../store/vendorSlice';

const DB_VENDOR_ID_MAP: Record<string, string> = {
  '3f5551f4-186e-467d-9340-5b74d8e7b766': 'VEND-001',
  '4ce542cd-5b23-4653-a884-53391edd9f0f': 'VEND-002',
  'e38f467c-f483-46a4-8172-bce5bb862247': 'VEND-003',
  'c17e8a34-eaf3-4a0b-89ac-7b4e640b61e3': 'VEND-004',
};

const STATIC_VENDOR_MAP: Record<string, string> = {
  all: 'All Vendors',
  'VEND-001': 'ABC Manufacturing',
  'VEND-002': 'XYZ Logistics & Textiles',
  'VEND-003': 'Global Tech Sourcing',
  'VEND-004': 'Shenzhen Electronics Corp',
  '3f5551f4-186e-467d-9340-5b74d8e7b766': 'ABC Manufacturing',
  '4ce542cd-5b23-4653-a884-53391edd9f0f': 'XYZ Logistics & Textiles',
  'e38f467c-f483-46a4-8172-bce5bb862247': 'Global Tech Sourcing',
  'c17e8a34-eaf3-4a0b-89ac-7b4e640b61e3': 'Shenzhen Electronics Corp',
};

interface VendorItem {
  id: string;
  name: string;
  country?: string;
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
      dispatch(setVendorSearch(searchTerm));
      dispatch(
        (fetchVendorsPage as any)({
          page: 1,
          pageSize: 15,
          search: searchTerm,
        }),
      );
    }
  }, [isOpen, searchTerm, dispatch]);

  const handleScroll = () => {
    if (!listRef.current || loading || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    if (scrollHeight - scrollTop <= clientHeight + 30) {
      const nextPage = page + 1;
      dispatch(
        (fetchVendorsPage as any)({
          page: nextPage,
          pageSize: 15,
          search: searchTerm,
        }),
      );
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
    const mapped = DB_VENDOR_ID_MAP[vendorId] || vendorId;
    onChange(mapped);
    setIsOpen(false);
    setSearchTerm('');
  };

  const selectedName =
    STATIC_VENDOR_MAP[value] ||
    vendors.find((v) => (DB_VENDOR_ID_MAP[v.id] || v.id) === value)?.name ||
    value ||
    placeholder;

  return (
    <div className="relative inline-block w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`${className} flex items-center justify-between text-left`}
      >
        <span className="truncate">{selectedName}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
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
            onScroll={handleScroll}
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
              const mappedId = DB_VENDOR_ID_MAP[vendor.id] || vendor.id;
              const isSelected = value === mappedId;
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
                  <span className="truncate">
                    {vendor.name} {vendor.country ? `(${vendor.country})` : ''}
                  </span>
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
