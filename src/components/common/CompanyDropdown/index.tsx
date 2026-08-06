import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Loader2 } from 'lucide-react';
import { getCompanies, Company } from '../../../services/company.service';

interface CompanyDropdownProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  showAllOption?: boolean;
  className?: string;
}

export default function CompanyDropdown({
  value,
  onChange,
  placeholder = 'All Companies',
  showAllOption = true,
  className = '',
}: CompanyDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch once on first open or if we have a specific value we need to resolve
  useEffect(() => {
    const needsFetch = isOpen || (value && value !== 'all');
    if (!needsFetch || companies.length > 0) return;

    setLoading(true);
    getCompanies()
      .then((list) => setCompanies(list))
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false));
  }, [isOpen, value, companies.length]);

  // Close on outside click
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

  const selectedName =
    value === 'all' || !value
      ? placeholder
      : companies.find(
          (c) => String(c.sellercloud_company_id || c.id) === String(value),
        )?.name || (loading ? 'Loading...' : value);

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
        <div className="absolute right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-2 animate-scaleUp max-h-72 flex flex-col min-w-[200px]">
          <div className="overflow-y-auto flex-1 max-h-56 space-y-0.5 scroll-smooth">
            {showAllOption && (
              <button
                type="button"
                onClick={() => {
                  onChange('all');
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition flex items-center justify-between ${
                  value === 'all' || !value
                    ? 'bg-indigo-50 text-indigo-700 font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>All Companies</span>
                {(value === 'all' || !value) && (
                  <Check className="h-3.5 w-3.5" />
                )}
              </button>
            )}

            {companies.map((company) => {
              const compValue = String(
                company.sellercloud_company_id || company.id,
              );
              return (
                <button
                  type="button"
                  key={company.id}
                  onClick={() => {
                    onChange(compValue);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition flex items-center justify-between ${
                    String(value) === compValue
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">{company.name}</span>
                  {String(value) === compValue && (
                    <Check className="h-3.5 w-3.5" />
                  )}
                </button>
              );
            })}

            {!loading && companies.length === 0 && (
              <div className="text-center py-4 text-xs text-slate-400 italic">
                No companies found
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
