import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useId,
} from 'react';
import { Search, ChevronDown, Check, Loader2, X } from 'lucide-react';
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
  isMulti = false,
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

  // Helper for multi-select
  const displayLabel = () => {
    if (isMulti) {
      if (!Array.isArray(value) || value.length === 0) return placeholder;
      return `${value.length} selected`;
    }
    return selectedItem ? selectedItem.label : value || placeholder;
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between border text-sm px-3 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${disabled ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-slate-50 border-slate-200 text-slate-800 font-bold hover:bg-slate-100'}`}
      >
        <span
          className={`text-left truncate ${(!isMulti && !selectedItem && !value) || (isMulti && (!value || value.length === 0)) ? 'text-slate-400 font-normal' : ''}`}
        >
          {displayLabel()}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Selected Items rendered below the dropdown button for multi-select */}
      {isMulti && Array.isArray(value) && value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {value.map((v) => {
            const matched = items.find((i) => i.value === v);
            const label = matched ? matched.label : v;
            return (
              <span
                key={v}
                className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md text-xs flex items-center gap-1.5 shadow-sm border border-indigo-200"
              >
                <span className="truncate max-w-[200px] font-medium">
                  {label}
                </span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(value.filter((val) => val !== v));
                    }}
                    className="hover:bg-indigo-200 hover:text-indigo-900 text-indigo-500 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}

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
              const isSelected = isMulti
                ? Array.isArray(value) && value.includes(item.value)
                : item.value === value;
              const isLast = index === items.length - 1;
              return (
                <button
                  key={item.value}
                  ref={isLast ? lastItemRef : null}
                  type="button"
                  data-tooltip-id={tooltipId}
                  data-tooltip-content={item.label}
                  onClick={() => {
                    if (isMulti) {
                      const currentVals = Array.isArray(value) ? value : [];
                      if (currentVals.includes(item.value)) {
                        onChange(
                          currentVals.filter((v) => v !== item.value),
                          item,
                        );
                      } else {
                        onChange([...currentVals, item.value], item);
                      }
                      // keep open for multi-select
                    } else {
                      onChange(item.value, item);
                      setIsOpen(false);
                    }
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
