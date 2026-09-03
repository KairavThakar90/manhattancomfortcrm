import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, Loader2 } from 'lucide-react';

interface ProductItem {
  id: string;
  sku: string;
  name?: string;
  [key: string]: unknown;
}

interface ProductDropdownProps {
  value: string;
  onChange: (val: string) => void;
  products: ProductItem[];
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  emptyLabel?: string;
  className?: string;
}

export default function ProductDropdown({
  value,
  onChange,
  products,
  loading = false,
  disabled = false,
  placeholder = 'Select product',
  emptyLabel = 'No products found',
  className = '',
}: ProductDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleSelect = (productId: string) => {
    onChange(productId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const selectedProduct = products.find((p) => String(p.id) === value);
  const selectedLabel = selectedProduct
    ? `${selectedProduct.sku}${selectedProduct.name ? ` - ${selectedProduct.name}` : ''}`
    : placeholder;

  const filteredProducts = !searchTerm
    ? products
    : products.filter((p) =>
        `${p.sku} ${p.name || ''}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
      );

  return (
    <div className="relative inline-block w-full" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`${className} flex items-center justify-between text-left disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span className={`truncate ${!selectedProduct ? 'text-slate-400' : ''}`}>
          {selectedLabel}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {isOpen && !disabled && (
        <div className="bg-mc-white border-mc-beige-dark animate-scaleUp absolute top-full left-0 z-50 mt-1 flex max-h-80 w-full min-w-[280px] flex-col rounded-xl border p-2 shadow-lg">
          <div className="border-mc-beige-dark mb-1 border-b px-1 pt-1 pb-2">
            <div className="relative">
              <Search className="absolute top-2 left-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="focus:border-mc-black focus:ring-mc-black w-full rounded-md border border-slate-200 py-1.5 pr-2 pl-8 text-xs outline-hidden transition focus:ring-1"
              />
            </div>
          </div>

          <div className="max-h-48 flex-1 space-y-0.5 overflow-y-auto scroll-smooth">
            {filteredProducts.map((product) => {
              const isSelected = value === String(product.id);
              return (
                <button
                  type="button"
                  key={product.id}
                  onClick={() => handleSelect(String(product.id))}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-xs transition ${
                    isSelected
                      ? 'bg-mc-beige-light text-mc-black font-bold'
                      : 'text-mc-black hover:bg-mc-beige-light/50'
                  }`}
                >
                  <span className="flex-1 truncate pr-2 font-mono">
                    {product.sku}
                    {product.name ? ` - ${product.name}` : ''}
                  </span>
                  {isSelected && (
                    <Check className="text-mc-gold h-3.5 w-3.5 shrink-0" />
                  )}
                </button>
              );
            })}

            {!loading && filteredProducts.length === 0 && (
              <div className="py-4 text-center text-xs text-slate-400 italic">
                {emptyLabel}
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
