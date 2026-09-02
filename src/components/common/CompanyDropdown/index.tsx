import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, Loader2 } from 'lucide-react';
import { getCompanies, Company } from '../../../services/company.service';

interface CompanyDropdownProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  showAllOption?: boolean;
  className?: string;
  disabled?: boolean;
}

export default function CompanyDropdown({
  value,
  onChange,
  placeholder = 'All Companies',
  showAllOption = true,
  className = '',
  disabled = false,
}: CompanyDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const selectedName =
    value === 'all' || !value
      ? placeholder
      : companies.find(
          (c) => String(c.sellercloud_company_id || c.id) === String(value),
        )?.name || (loading ? 'Loading...' : value);

  const filteredCompanies = !searchTerm
    ? companies
    : companies.filter((c) =>
        (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()),
      );

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
        <span className="truncate">{selectedName}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {isOpen && !disabled && (
        <div className="bg-mc-white border-mc-beige-dark animate-scaleUp absolute top-full left-0 z-50 mt-1 flex max-h-80 w-full flex-col rounded-xl border p-2 shadow-lg">
          <div className="border-mc-beige-dark mb-1 border-b px-1 pt-1 pb-2">
            <div className="relative">
              <Search className="absolute top-2 left-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="focus:border-mc-black focus:ring-mc-black w-full rounded-md border border-slate-200 py-1.5 pr-2 pl-8 text-xs outline-hidden transition focus:ring-1"
              />
            </div>
          </div>

          <div className="max-h-56 flex-1 space-y-0.5 overflow-y-auto scroll-smooth">
            {showAllOption && (
              <button
                type="button"
                onClick={() => {
                  onChange('all');
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className={`flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-xs transition ${
                  value === 'all' || !value
                    ? 'bg-mc-beige-light text-mc-black font-bold'
                    : 'text-mc-black hover:bg-mc-beige-light/50'
                }`}
              >
                <span>All Companies</span>
                {(value === 'all' || !value) && (
                  <Check className="h-3.5 w-3.5" />
                )}
              </button>
            )}

            {filteredCompanies.map((company) => {
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
                    setSearchTerm('');
                  }}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-xs transition ${
                    String(value) === compValue
                      ? 'bg-mc-beige-light text-mc-black font-bold'
                      : 'text-mc-black hover:bg-mc-beige-light/50'
                  }`}
                >
                  <span className="truncate">{company.name}</span>
                  {String(value) === compValue && (
                    <Check className="text-mc-gold h-3.5 w-3.5 shrink-0" />
                  )}
                </button>
              );
            })}

            {!loading && filteredCompanies.length === 0 && (
              <div className="py-4 text-center text-xs text-slate-400 italic">
                No companies found
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
