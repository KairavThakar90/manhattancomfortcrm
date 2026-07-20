import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../../../services/api';
import { Search, ChevronDown, Check, Loader2 } from 'lucide-react';

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
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      setVendors([]);
      setHasMore(true);
      fetchData(1, searchTerm);
    }
  }, [isOpen, searchTerm]);

  const fetchData = async (pageNum: number, searchVal: string) => {
    if (loading) return;
    setLoading(true);
    try {
      const { data } = await apiClient.get<any>('/vendors', {
        params: {
          page: pageNum,
          page_size: 15,
          search: searchVal,
        },
      });

      let items: VendorItem[] = [];
      let more = false;

      if (Array.isArray(data)) {
        const filtered = data
          .map((v: any) => ({
            id: v.id,
            name: v.name,
            country: v.country,
          }))
          .filter((v: VendorItem) =>
            v.name?.toLowerCase().includes(searchVal.toLowerCase()),
          );
        const limit = 15;
        const start = (pageNum - 1) * limit;
        const end = start + limit;
        items = filtered.slice(start, end);
        more = end < filtered.length;
      } else if (data && typeof data === 'object') {
        const results = data.results || data.vendors || [];
        items = results.map((v: any) => ({
          id: v.id,
          name: v.name,
          country: v.country,
        }));
        const total = data.total || results.length;
        more = pageNum * 15 < total;
      }

      setVendors((prev) => (pageNum === 1 ? items : [...prev, ...items]));
      setHasMore(more);
    } catch (err) {
      console.error('Error fetching vendors for dropdown:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = () => {
    if (!listRef.current || loading || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    if (scrollHeight - scrollTop <= clientHeight + 30) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchData(nextPage, searchTerm);
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
    const mapped = DB_VENDOR_ID_MAP[vendorId] || vendorId;
    onChange(mapped);
    setIsOpen(false);
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
        <div className="absolute right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-2 animate-scaleUp max-h-80 flex flex-col min-w-[200px]">
          <div className="relative mb-2 shrink-0">
            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden focus:bg-white focus:border-indigo-500 transition text-slate-800"
            />
          </div>

          <div
            ref={listRef}
            onScroll={handleScroll}
            className="overflow-y-auto flex-1 max-h-48 space-y-0.5 scroll-smooth"
          >
            {showAllOption && (
              <button
                type="button"
                onClick={() => {
                  onChange('all');
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition flex items-center justify-between ${
                  value === 'all'
                    ? 'bg-indigo-50 text-indigo-700 font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>All Vendors</span>
                {value === 'all' && <Check className="h-3.5 w-3.5" />}
              </button>
            )}

            {vendors.map((vendor) => {
              const mappedId = DB_VENDOR_ID_MAP[vendor.id] || vendor.id;
              const isSelected = value === mappedId;
              return (
                <button
                  type="button"
                  key={vendor.id}
                  onClick={() => handleSelect(vendor.id)}
                  className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">
                    {vendor.name} {vendor.country ? `(${vendor.country})` : ''}
                  </span>
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                </button>
              );
            })}

            {!loading && vendors.length === 0 && (
              <div className="text-center py-4 text-xs text-slate-400 italic">
                No vendors found
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
