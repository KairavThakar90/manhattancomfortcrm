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
  menuPlacement = 'bottom',
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

  // For single select
  const selectedItem = !isMulti
    ? items.find((item) => item.value === value)
    : null;
  const multiValues = isMulti && Array.isArray(value) ? value : [];
  const selectedMultiItems = isMulti
    ? multiValues.map(
        (v) => items.find((i) => i.value === v) || { label: v, value: v },
      )
    : [];

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`focus:border-mc-gold focus:ring-mc-gold flex min-h-[38px] w-full items-center justify-between rounded-lg border px-3 py-1.5 text-sm transition-colors focus:ring-1 focus:outline-none ${disabled ? 'border-mc-beige-dark bg-mc-beige-light/30 text-mc-gray-soft cursor-not-allowed' : 'border-mc-beige-dark bg-mc-white hover:bg-mc-beige-light font-bold'}`}
      >
        <div className="flex flex-1 flex-wrap items-center gap-1 overflow-hidden pr-2">
          {!isMulti && (
            <span
              className={`truncate ${!selectedItem && !value ? 'text-mc-gray-soft font-normal' : 'text-mc-black'}`}
            >
              {selectedItem ? selectedItem.label : value || placeholder}
            </span>
          )}

          {isMulti && selectedMultiItems.length === 0 && (
            <span className="text-mc-gray-soft truncate font-normal">
              {placeholder}
            </span>
          )}

          {isMulti &&
            selectedMultiItems.map((item) => (
              <span
                key={item.value}
                className="bg-mc-beige-dark/20 text-mc-black border-mc-beige-dark/30 flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-bold"
              >
                {item.chipLabel || item.label}
                <span
                  className="hover:text-mc-red ml-1 flex cursor-pointer items-center justify-center rounded-full p-0.5 text-gray-500 transition-colors hover:bg-rose-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(multiValues.filter((v) => v !== item.value));
                  }}
                >
                  <X className="h-3 w-3 flex-shrink-0" strokeWidth={3} />
                </span>
              </span>
            ))}
        </div>
        <ChevronDown
          className={`text-mc-gray-soft h-4 w-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          className={`border-mc-beige-dark bg-mc-white absolute z-[9999] flex w-full flex-col overflow-hidden rounded-lg border shadow-lg ${
            menuPlacement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          <div className="border-mc-beige-dark text-mc-black relative border-b p-2">
            <Search className="text-mc-gray-soft absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={searchPlaceholder}
              className="focus:ring-mc-gold focus:border-mc-gold border-mc-beige-dark bg-mc-white w-full rounded-md border py-1.5 pr-9 pl-9 text-sm font-medium focus:ring-1 focus:outline-none"
              autoFocus
            />
            {isLoading && (
              <Loader2 className="text-mc-gold absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 animate-spin" />
            )}
          </div>

          <div className="custom-scrollbar max-h-60 overflow-y-auto p-1">
            {items.length === 0 && !isLoading && (
              <div className="text-mc-gray-soft p-3 text-center text-sm">
                No items found.
              </div>
            )}

            {items.map((item, index) => {
              const isSelected = isMulti
                ? multiValues.includes(item.value)
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
                      const newValues = isSelected
                        ? multiValues.filter((v) => v !== item.value)
                        : [...multiValues, item.value];
                      onChange(newValues);

                      if (!isSelected) {
                        setSearchQuery('');
                        if (onSearch) onSearch('');
                      }
                    } else {
                      onChange(item.value, item);
                      setIsOpen(false);
                    }
                  }}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${isSelected ? 'bg-mc-beige-light/70 text-mc-black font-bold' : 'text-mc-black hover:bg-mc-beige-light/50 font-medium'}`}
                >
                  <span className="truncate text-left">{item.label}</span>
                  {isSelected && (
                    <Check className="text-mc-gold ml-2 h-4 w-4 flex-shrink-0" />
                  )}
                </button>
              );
            })}

            {isLoading && (
              <div className="flex justify-center p-3">
                <Loader2 className="text-mc-gold h-5 w-5 animate-spin" />
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
            backgroundColor: 'var(--color-mc-black)',
            color: '#ffffff',
          }}
        />
      )}
    </div>
  );
}
