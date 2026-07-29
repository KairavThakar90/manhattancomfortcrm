import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useId,
} from 'react';
import { Search, ChevronDown, Check, Loader2 } from 'lucide-react';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';

export default function InfiniteScrollDropdown({
  value,
  onChange,
  onSearch,
  onLoadMore,
  hasMore,
  isLoading,
  items, // array of { label, value, ...rest }
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search...',
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const observerRef = useRef(null);
  const internalId = useId();
  const tooltipId = 'dropdown-tooltip-' + internalId.replace(/:/g, '');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  const isLoadingRef = useRef(isLoading);
  const hasMoreRef = useRef(hasMore);
  const onLoadMoreRef = useRef(onLoadMore);

  useEffect(() => {
    isLoadingRef.current = isLoading;
    hasMoreRef.current = hasMore;
    onLoadMoreRef.current = onLoadMore;
  }, [isLoading, hasMore, onLoadMore]);

  const lastItemRef = useCallback((node) => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      if (
        entries[0].isIntersecting &&
        hasMoreRef.current &&
        !isLoadingRef.current &&
        onLoadMoreRef.current
      ) {
        onLoadMoreRef.current();
      }
    });

    if (node) observerRef.current.observe(node);
  }, []);

  const selectedItem = items.find((item) => item.value === value);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between border text-sm px-3 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${disabled ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-slate-50 border-slate-200 text-slate-800 font-bold hover:bg-slate-100'}`}
      >
        <span
          className={`truncate ${!selectedItem && !value ? 'text-slate-400 font-normal' : ''}`}
        >
          {selectedItem ? selectedItem.label : value || placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden flex flex-col">
          <div className="p-2 border-b border-slate-100 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              autoFocus
            />
          </div>

          <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
            {items.length === 0 && !isLoading && (
              <div className="p-3 text-center text-sm text-slate-500">
                No items found.
              </div>
            )}

            {items.map((item, index) => {
              const isSelected = item.value === value;
              const isLast = index === items.length - 1;
              return (
                <button
                  key={item.value}
                  ref={isLast ? lastItemRef : null}
                  type="button"
                  data-tooltip-id={tooltipId}
                  data-tooltip-content={item.label}
                  onClick={() => {
                    onChange(item.value, item);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50 font-medium'}`}
                >
                  <span className="truncate text-left">{item.label}</span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-indigo-600 flex-shrink-0 ml-2" />
                  )}
                </button>
              );
            })}

            {isLoading && (
              <div className="p-3 flex justify-center">
                <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
              </div>
            )}
          </div>
        </div>
      )}
      {isOpen && (
        <Tooltip
          id={tooltipId}
          place="right"
          delayShow={400}
          style={{
            zIndex: 100,
            maxWidth: '300px',
            fontSize: '13px',
            backgroundColor: '#4f46e5',
            color: '#ffffff',
          }}
        />
      )}
    </div>
  );
}
