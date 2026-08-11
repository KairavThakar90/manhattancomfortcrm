import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Loader2, Search, X } from 'lucide-react';
import api from '../../../services/api';

interface CustomerDropdownProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  showAllOption?: boolean;
  className?: string;
}

export default function CustomerDropdown({
  value,
  onChange,
  placeholder = 'All Customers',
  showAllOption = true,
  className = '',
}: CustomerDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const needsFetch = isOpen || (value && value !== 'all');
    if (!needsFetch || customers.length > 0) return;

    setLoading(true);
    api
      .get('customers')
      .then((res) => {
        const data = res.data;
        if (Array.isArray(data)) {
          setCustomers(data);
        } else if (data && Array.isArray(data.results)) {
          setCustomers(data.results);
        } else {
          setCustomers([]);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch customers:', err);
        setCustomers([]);
      })
      .finally(() => setLoading(false));
  }, [isOpen, value, customers.length]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatName = (item: any) => {
    if (!item) return 'Unnamed';
    const c = item.customer || item;
    if (c.first_name || c.last_name) {
      return `${c.first_name || ''} ${c.last_name || ''}`.trim();
    }
    return c.customer_name || c.name || 'Unnamed';
  };

  const getCustId = (item: any) => {
    if (!item) return null;
    const c = item.customer || item;
    return String(c.sellercloud_customer_id || c.id || item.id);
  };

  const selectedCustomer = customers.find(
    (c) => getCustId(c) === String(value),
  );

  const selectedName =
    value === 'all' || !value
      ? placeholder
      : selectedCustomer
        ? formatName(selectedCustomer)
        : loading
          ? 'Loading...'
          : value;

  const filteredCustomers = customers.filter((c) =>
    formatName(c).toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

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
        <div className="bg-mc-white border-mc-beige-dark animate-scaleUp absolute right-0 z-50 mt-1 flex max-h-72 w-[260px] flex-col rounded-xl border p-2 shadow-lg">
          <div className="border-mc-beige-dark mb-1 border-b px-1 pt-1 pb-2">
            <div className="relative">
              <Search className="absolute top-2 left-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search customers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="focus:border-mc-black focus:ring-mc-black w-full rounded-md border border-slate-200 py-1.5 pr-2 pl-8 text-xs outline-hidden transition focus:ring-1"
              />
            </div>
          </div>
          <div className="max-h-56 flex-1 space-y-0.5 overflow-y-auto scroll-smooth">
            {showAllOption && !search && (
              <button
                type="button"
                onClick={() => {
                  onChange('all');
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-xs transition ${
                  value === 'all' || !value
                    ? 'bg-mc-beige-light text-mc-black font-bold'
                    : 'text-mc-black hover:bg-mc-beige-light/50'
                }`}
              >
                <span>All Customers</span>
                {(value === 'all' || !value) && (
                  <Check className="h-3.5 w-3.5" />
                )}
              </button>
            )}

            {filteredCustomers.map((c) => {
              const compValue = getCustId(c);
              return (
                <button
                  type="button"
                  key={compValue}
                  onClick={() => {
                    onChange(compValue);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-xs transition ${
                    String(value) === compValue
                      ? 'bg-mc-beige-light text-mc-black font-bold'
                      : 'text-mc-black hover:bg-mc-beige-light/50'
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center justify-between pr-2">
                    <span className="truncate pr-2">{formatName(c)}</span>
                    {((c.po_count !== undefined && c.po_count > 0) ||
                      (c.customer?.po_count !== undefined &&
                        c.customer?.po_count > 0)) && (
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium tracking-wide text-slate-500">
                        {c.po_count ?? c.customer?.po_count} POs
                      </span>
                    )}
                  </div>
                  {String(value) === compValue && (
                    <Check className="text-mc-gold ml-1.5 h-3.5 w-3.5 shrink-0" />
                  )}
                </button>
              );
            })}

            {!loading && filteredCustomers.length === 0 && (
              <div className="py-4 text-center text-xs text-slate-400 italic">
                No customers found
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="text-mc-gold h-4 w-4 animate-spin" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
