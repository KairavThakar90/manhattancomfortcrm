import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Loader2 } from 'lucide-react';
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
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
        <div className="bg-mc-white border-mc-beige-dark animate-scaleUp absolute right-0 z-50 mt-1 flex max-h-72 min-w-[200px] flex-col rounded-xl border p-2 shadow-lg">
          <div className="max-h-56 flex-1 space-y-0.5 overflow-y-auto scroll-smooth">
            {showAllOption && (
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

            {customers.map((c) => {
              const compValue = getCustId(c);
              return (
                <button
                  type="button"
                  key={compValue}
                  onClick={() => {
                    onChange(compValue);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-xs transition ${
                    String(value) === compValue
                      ? 'bg-mc-beige-light text-mc-black font-bold'
                      : 'text-mc-black hover:bg-mc-beige-light/50'
                  }`}
                >
                  <span className="truncate">{formatName(c)}</span>
                  {String(value) === compValue && (
                    <Check className="text-mc-gold h-3.5 w-3.5 shrink-0" />
                  )}
                </button>
              );
            })}

            {!loading && customers.length === 0 && (
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
