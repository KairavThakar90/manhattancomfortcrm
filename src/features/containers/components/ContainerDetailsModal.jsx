import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Eye,
  X,
  Calendar,
  Package,
  CheckCircle2,
  ExternalLink,
  Copy,
  Truck,
  Edit2,
  Save,
  Loader2,
  FileUp,
  FileText,
  Download,
  Clock,
  Info,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  updateContainer,
  getContainerActivities,
  deleteContainerAttachment,
  syncSingleContainer,
} from '../services/container.service';
import { compressImageIfNeeded } from '../../../utils/imageCompression';
import { Tooltip } from 'react-tooltip';
import DataTable from '../../../components/common/DataTable';
import Pagination from '../../../components/common/Pagination';
import DateFilterInput from '../../../components/common/DateFilterInput';
import Select from 'react-select';
import countryList from 'react-select-country-list';
import ImagePreviewModal from '../../../components/common/ImagePreviewModal';
import ItemImageThumbnail from '../../../components/common/ItemImageThumbnail';
import { getTagUsers } from '../../users/services/user.service';
import { getTrackerLogistics } from '../../trackerLogistics/services/trackerLogistics.service';
import ContainerCommentSection from './ContainerCommentSection';

// Mirrors the textarea's text box in a hidden div so we can measure where a
// given character index actually renders (textareas have no native API for
// this). Returns { top, left, height } relative to the textarea's own
// content box (i.e. before adding its on-screen position / scroll offset).
function getCaretCoordinates(textarea, position) {
  const div = document.createElement('div');
  const style = div.style;
  const computed = window.getComputedStyle(textarea);

  style.position = 'absolute';
  style.visibility = 'hidden';
  style.whiteSpace = 'pre-wrap';
  style.overflowWrap = 'break-word';
  style.top = '0';
  style.left = '-9999px';

  [
    'boxSizing',
    'width',
    'fontFamily',
    'fontSize',
    'fontWeight',
    'fontStyle',
    'letterSpacing',
    'lineHeight',
    'textTransform',
    'textIndent',
    'textAlign',
    'padding',
    'border',
  ].forEach((prop) => {
    style[prop] = computed[prop];
  });

  div.textContent = textarea.value.substring(0, position);
  const span = document.createElement('span');
  span.textContent = textarea.value.substring(position) || '.';
  div.appendChild(span);
  document.body.appendChild(div);

  const coords = {
    top: span.offsetTop,
    left: span.offsetLeft,
    height: span.offsetHeight || parseInt(computed.lineHeight, 10) || 16,
  };
  document.body.removeChild(div);
  return coords;
}

/**
 * Textarea with lightweight "@name" tagging. Typing "@" opens a dropdown —
 * the option list is only fetched the first time "@" is triggered (via
 * `loadOptions`, e.g. calling the tag-users API with a role filter), not
 * eagerly on mount. Selecting an option inserts "@Name " at the cursor.
 * Purely a text-insertion helper — tagged names are not persisted as
 * structured references, matching how this field is stored (plain text).
 */
function MentionTextarea({
  value,
  onChange,
  loadOptions,
  placeholder,
  rows = 3,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [atIndex, setAtIndex] = useState(-1);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [coords, setCoords] = useState({
    top: 0,
    bottom: 'auto',
    left: 0,
    width: 240,
  });
  const [options, setOptions] = useState([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const hasFetchedRef = useRef(false);
  const textareaRef = useRef(null);
  const wrapperRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Remembers the caret's actual screen position so the post-render
  // overflow check below can flip to "above" without re-measuring the
  // caret (which would be needed again anyway, but keeps the two steps
  // clearly separate: anchor first, correct for overflow second).
  const anchorRef = useRef({ top: 0, bottom: 0 });

  const filteredOptions = useMemo(() => {
    const f = filter.toLowerCase();
    const list = Array.isArray(options) ? options : [];
    if (!f) return list.slice(0, 8);
    return list
      .filter((o) => (o.name || '').toLowerCase().includes(f))
      .slice(0, 8);
  }, [filter, options]);

  // Anchors the dropdown to the "@" itself (where the mention started)
  // rather than the whole textarea, so it opens right at the typed
  // position — like the reference chat-style @mention UI. Always anchors
  // below the caret first; the layout-effect below flips it above only if
  // it actually turns out to overflow the viewport once rendered.
  const computeCoords = (caretPos = atIndex) => {
    const textarea = textareaRef.current;
    if (!textarea) return null;
    const rect = textarea.getBoundingClientRect();
    const width = Math.min(280, Math.max(rect.width * 0.6, 220));

    let caretTop = 0;
    let caretLeft = 0;
    let caretHeight = 18;
    if (caretPos >= 0) {
      const caret = getCaretCoordinates(textarea, caretPos);
      caretTop = caret.top - textarea.scrollTop;
      caretLeft = caret.left - textarea.scrollLeft;
      caretHeight = caret.height;
    }

    const anchorTop = rect.top + caretTop;
    const anchorBottom = anchorTop + caretHeight;
    let left = rect.left + caretLeft;
    left = Math.min(left, window.innerWidth - width - 16);
    left = Math.max(left, 8);

    anchorRef.current = { top: anchorTop, bottom: anchorBottom };
    return { top: anchorBottom + 4, bottom: 'auto', left, width };
  };

  useEffect(() => {
    // Keep the dropdown anchored to the caret whenever any ancestor
    // scrolls or the window resizes — the modal body is scrollable and
    // `scroll` doesn't bubble, so this must be a capturing listener.
    if (!isOpen) return;
    const reposition = () => {
      const next = computeCoords();
      if (next) setCoords(next);
    };
    document.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      document.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [isOpen, atIndex]);

  useEffect(() => {
    // After the dropdown actually renders, check whether it overflows the
    // bottom of the viewport and only then flip it to open upward —
    // avoids guessing a fixed height and flipping when it would have fit.
    if (!isOpen || !dropdownRef.current) return;
    const rect = dropdownRef.current.getBoundingClientRect();
    const overflowsBottom = rect.bottom > window.innerHeight - 8;
    const isCurrentlyAbove = coords.top === 'auto';
    if (overflowsBottom && !isCurrentlyAbove) {
      const { top: anchorTop } = anchorRef.current;
      if (anchorTop > rect.height) {
        setCoords((prev) => ({
          ...prev,
          top: 'auto',
          bottom: window.innerHeight - anchorTop + 4,
        }));
      }
    } else if (!overflowsBottom && isCurrentlyAbove) {
      const { bottom: anchorBottom } = anchorRef.current;
      setCoords((prev) => ({ ...prev, top: anchorBottom + 4, bottom: 'auto' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, filteredOptions.length, isLoadingOptions]);

  const handleChange = (e) => {
    const text = e.target.value;
    const cursor = e.target.selectionStart;
    onChange(text);

    const textBeforeCursor = text.slice(0, cursor);
    const lastAt = textBeforeCursor.lastIndexOf('@');
    if (
      lastAt !== -1 &&
      (lastAt === 0 || /\s/.test(textBeforeCursor[lastAt - 1]))
    ) {
      const query = textBeforeCursor.slice(lastAt + 1);
      if (!/\s/.test(query)) {
        setAtIndex(lastAt);
        setFilter(query);
        setHighlightIndex(0);
        const next = computeCoords(lastAt);
        if (next) setCoords(next);
        setIsOpen(true);

        // Only hit the API the first time "@" is triggered on this field.
        if (!hasFetchedRef.current && !isLoadingOptions && loadOptions) {
          hasFetchedRef.current = true;
          setIsLoadingOptions(true);
          loadOptions()
            .then((list) => setOptions(Array.isArray(list) ? list : []))
            .catch((err) => {
              console.error('Failed to load @mention options', err);
              hasFetchedRef.current = false; // allow retry on next "@"
            })
            .finally(() => setIsLoadingOptions(false));
        }
        return;
      }
    }
    setIsOpen(false);
  };

  const insertMention = (option) => {
    const cursor = textareaRef.current?.selectionStart ?? value.length;
    const before = value.slice(0, atIndex);
    const after = value.slice(cursor);
    const tag = `@${(option.name || '').trim().replace(/\s+/g, '_')} `;
    const nextValue = `${before}${tag}${after}`;
    onChange(nextValue);
    setIsOpen(false);
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const pos = before.length + tag.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      }
    });
  };

  const handleKeyDown = (e) => {
    if (!isOpen || filteredOptions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertMention(filteredOptions[highlightIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <textarea
        ref={textareaRef}
        rows={rows}
        className={className}
        value={value}
        placeholder={placeholder}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      {isOpen &&
        (filteredOptions.length > 0 || isLoadingOptions) &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: coords.top,
              bottom: coords.bottom,
              left: coords.left,
              width: coords.width,
            }}
            className="border-mc-beige-dark bg-mc-white animate-fadeIn z-[9999] max-h-60 overflow-y-auto rounded-lg border shadow-lg"
          >
            {isLoadingOptions && filteredOptions.length === 0 ? (
              <div className="text-mc-gray-soft flex items-center gap-2 px-3 py-2.5 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading...
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const initial = (opt.name?.[0] || 'U').toUpperCase();
                const isHighlighted = idx === highlightIndex;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertMention(opt);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition ${
                      isHighlighted
                        ? 'bg-mc-gold/10 border-mc-gold border-l-2'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-bold ${
                        isHighlighted
                          ? 'bg-mc-gold text-white'
                          : 'text-mc-black bg-slate-200'
                      }`}
                    >
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-slate-700">
                        {opt.name}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

export default function ContainerDetailsModal({
  container,
  isLoading = false,
  onClose,
  onRefresh,
  initialTab = 'details',
}) {
  const [itemsPage, setItemsPage] = useState(1);
  const [itemsPageSize, setItemsPageSize] = useState(10);
  const [activeTab, setActiveTab] = useState(initialTab);

  // Keep the active tab in sync when the modal is reopened (e.g. re-opened
  // via the table's Comments icon) with a different initialTab.
  useEffect(() => {
    if (container) {
      setActiveTab(initialTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container?.id, initialTab]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingSingle, setIsSyncingSingle] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [trackingData, setTrackingData] = useState({});
  const [prevContainer, setPrevContainer] = useState(null);
  const [attachmentToDelete, setAttachmentToDelete] = useState(null);
  const [isDeletingAttachment, setIsDeletingAttachment] = useState(false);
  const [activities, setActivities] = useState([]);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [activitiesPageSize, setActivitiesPageSize] = useState(10);
  const [activitiesTotal, setActivitiesTotal] = useState(0);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewAnchor, setPreviewAnchor] = useState(null);
  const countryOptions = useMemo(() => countryList().getData(), []);

  // @mention sources: both fields pull from the single tag-users API
  // (/auth/users/tag), but only when "@" is actually typed in that field —
  // not eagerly on mount. Vendor Credit Needed scopes the call to
  // role=vendor; Receiving Closure Notes leaves it unscoped.
  const loadVendorMentionOptions = async () => {
    // TEMP: role=vendor filter disabled for testing — remove the comment
    // to re-enable scoping this list to vendor-role users only.
    const users = await getTagUsers(/* { role: 'vendor' } */);
    // Trust the API's role=vendor filtering as-is — no client-side re-filter.
    return Array.isArray(users) ? users : [];
  };

  const loadTeamMentionOptions = async () => {
    const users = await getTagUsers();
    return Array.isArray(users) ? users : [];
  };

  // Trucker Email dropdown: sourced from /logistics, showing each entry's
  // name — and the selected option's value stored in trucker_email is
  // also that name (not the underlying email address).
  const [logisticsOptions, setLogisticsOptions] = useState([]);
  const [isLoadingLogistics, setIsLoadingLogistics] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoadingLogistics(true);
    getTrackerLogistics()
      .then((list) => {
        if (!active) return;
        setLogisticsOptions(
          (Array.isArray(list) ? list : [])
            .filter((l) => l && l.name)
            .map((l) => ({
              value: l.name,
              label: l.name,
              id: l.id,
            })),
        );
      })
      .catch((err) => {
        console.error('Failed to load tracker logistics list', err);
      })
      .finally(() => {
        if (active) setIsLoadingLogistics(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const reactSelectStyles = {
    control: (base, state) => ({
      ...base,
      backgroundColor: '#f8fafc',
      borderColor: state.isFocused ? '#151717' : '#e2e8f0',
      borderRadius: '0.5rem',
      padding: '0',
      minHeight: '38px',
      fontSize: '0.875rem',
      boxShadow: state.isFocused ? '0 0 0 1px #151717' : 'none',
      '&:hover': {
        borderColor: state.isFocused ? '#151717' : '#cbd5e1',
      },
    }),
    valueContainer: (base) => ({
      ...base,
      padding: '2px 12px',
    }),
    input: (base) => ({
      ...base,
      margin: '0',
      padding: '0',
      fontSize: '0.875rem',
    }),
    placeholder: (base) => ({
      ...base,
      color: '#94a3b8',
      fontSize: '0.875rem',
    }),
    singleValue: (base) => ({
      ...base,
      color: '#1e293b',
      fontSize: '0.875rem',
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? '#F4EFE8'
        : state.isFocused
          ? '#f8fafc'
          : 'white',
      color: state.isSelected ? '#151717' : '#334155',
      cursor: 'pointer',
      fontSize: '0.875rem',
      padding: '8px 12px',
      '&:active': {
        backgroundColor: '#F4EFE8',
      },
    }),
    menu: (base) => ({
      ...base,
      borderRadius: '0.5rem',
      marginTop: '4px',
      boxShadow:
        '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      border: '1px solid #e2e8f0',
      zIndex: 9999,
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  };

  if (container !== prevContainer) {
    setPrevContainer(container);
    if (container) {
      let cName =
        container.container_name ||
        container.name ||
        container.container_number ||
        '';
      if (cName === 'undefined') cName = '';

      const atts = (
        Array.isArray(container.attachments)
          ? container.attachments
          : Array.isArray(container.files)
            ? container.files
            : container.attachments
              ? [container.attachments]
              : container.files
                ? [container.files]
                : container.attachment
                  ? Array.isArray(container.attachment)
                    ? container.attachment
                    : [container.attachment]
                  : []
      ).filter((a) => a && a.id);

      setTrackingData({
        container_name: cName,
        door: container.door || '',
        date_dropped_off: container.date_dropped_off
          ? container.date_dropped_off.split('T')[0]
          : '',
        date_emptied: container.date_emptied
          ? container.date_emptied.split('T')[0]
          : '',
        unloaded_by: container.unloaded_by || '',
        country_of_origin: container.country_of_origin || '',
        unload_cost: container.unload_cost || '',
        container_shipping_cost: container.container_shipping_cost || '',
        drayage_cost: container.drayage_cost || '',
        customs_duty_misc: container.customs_duty_misc || '',
        per_diem: container.per_diem || '',
        factory_credit_needed:
          container.factory_credit_needed ||
          container.vendor_credit_needed ||
          '',
        receiving_closure_notes:
          container.receiving_closure_notes ||
          container.closure_notes ||
          '',
        trucker_email: container.trucker_email || '',
        logistics_company_id: container.logistics_company_id || null,
        attachmentsToUpload: [],
        existingAttachments: atts,
      });
    }
  }

  useEffect(() => {
    let active = true;

    const fetchActivities = async () => {
      setIsLoadingActivities(true);
      try {
        const data = await getContainerActivities(container.id, {
          page: activitiesPage,
          page_size: activitiesPageSize,
        });
        if (!active) return;

        if (Array.isArray(data)) {
          setActivities(data);
          setActivitiesTotal(data.length);
        } else if (data?.results) {
          setActivities(data.results);
          setActivitiesTotal(
            data.total || data.meta?.total || data.results.length,
          );
        } else if (data?.data) {
          setActivities(data.data);
          setActivitiesTotal(data.total || data.data.length);
        } else {
          setActivities([]);
          setActivitiesTotal(0);
        }
      } catch (err) {
        if (!active) return;
        console.error('Failed to fetch activities', err);
        toast.error('Failed to load container activities');
      } finally {
        if (active) setIsLoadingActivities(false);
      }
    };

    if (activeTab === 'activities' && container?.id) {
      fetchActivities();
    }

    return () => {
      active = false;
    };
  }, [activeTab, container?.id, activitiesPage, activitiesPageSize]);

  const handleSaveTracking = async () => {
    setEmailError('');
    const currentUserRole = String(
      localStorage.getItem('userRole'),
    ).toLowerCase();

    try {
      setIsSaving(true);

      // Compress any image attachments before upload (skip files already
      // compressed on a prior failed save attempt).
      const compressedAttachments = [];
      for (const raw of trackingData.attachmentsToUpload || []) {
        if (raw.isCompressed) {
          compressedAttachments.push(raw);
        } else {
          const c = await compressImageIfNeeded(raw);
          c.isCompressed = true;
          compressedAttachments.push(c);
        }
      }
      handleTrackingChange('attachmentsToUpload', compressedAttachments);

      const payload = {
        ...trackingData,
        attachmentsToUpload: compressedAttachments,
      };
      let pName =
        trackingData.container_name ||
        container.name ||
        container.container_number ||
        '';
      if (pName === 'undefined') pName = '';
      payload.name = pName;
      [
        'unload_cost',
        'container_shipping_cost',
        'drayage_cost',
        'customs_duty_misc',
        'per_diem',
      ].forEach((k) => {
        if (payload[k]) {
          payload[k] = parseFloat(payload[k]);
        } else {
          payload[k] = 0;
        }
      });
      ['date_dropped_off', 'date_emptied'].forEach((k) => {
        if (!payload[k]) payload[k] = null;
      });

      const finalPayload = new FormData();
      const {
        attachmentsToUpload,
        attachment,
        existingAttachments,
        ...restPayload
      } = payload;

      // Send references for standard DRF many-to-many list expectations
      restPayload.attachments = existingAttachments
        ? existingAttachments.map((a) => a.id)
        : [];

      // The API expects the JSON data as a stringified object under 'container_data'
      finalPayload.append('container_data', JSON.stringify(restPayload));

      // Re-add root level property appends for standard DRF MultiPartParsers
      Object.keys(restPayload).forEach((key) => {
        if (restPayload[key] !== null && restPayload[key] !== undefined) {
          finalPayload.append(key, restPayload[key]);
        }
      });

      // The API expects the files under the 'files' key if available
      if (attachmentsToUpload && attachmentsToUpload.length > 0) {
        attachmentsToUpload.forEach((file) => {
          const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
          const safeFile = new File([file], sanitizedFilename, {
            type: file.type,
          });
          finalPayload.append('files', safeFile);
        });
      }

      const options = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };

      await updateContainer(container.id, finalPayload, options);
      toast.success('Container details updated successfully');
      if (onRefresh) onRefresh();
    } catch (e) {
      toast.error('Failed to update Container details');
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDeleteAttachment = async () => {
    if (!attachmentToDelete) return;
    setIsDeletingAttachment(true);
    try {
      await deleteContainerAttachment(attachmentToDelete.id);

      // Update local state to immediately remove the file
      const newExisting = trackingData.existingAttachments.filter(
        (a) => a.id !== attachmentToDelete.id,
      );
      handleTrackingChange('existingAttachments', newExisting);

      toast.success('Attachment deleted successfully');
      setAttachmentToDelete(null);
    } catch (e) {
      toast.error('Failed to delete attachment');
    } finally {
      setIsDeletingAttachment(false);
    }
  };

  const handleTrackingChange = (field, value) => {
    if (field === 'trucker_email' && emailError) {
      setEmailError('');
    }
    setTrackingData((prev) => ({ ...prev, [field]: value }));
  };

  if (!container) return null;

  const allItems = container.details || [];
  const totalItems = allItems.length;
  const paginatedItems = allItems.slice(
    (itemsPage - 1) * itemsPageSize,
    itemsPage * itemsPageSize,
  );

  // Status flow: Picked Up → Unloaded/Emptied → Partially Received → Fully
  // Received. Received progress is derived from the sum of each item's
  // assigned vs received quantity; drop-off/empty progress comes from the
  // container's own tracking dates.
  const totalQtyAssigned = allItems.reduce(
    (sum, item) => sum + (item.qty_in_container || item.qty || 0),
    0,
  );
  const totalQtyReceived = allItems.reduce(
    (sum, item) => sum + (item.qty_received_container ?? 0),
    0,
  );

  const getContainerStage = () => {
    if (totalQtyAssigned > 0 && totalQtyReceived >= totalQtyAssigned) {
      return {
        label: 'Fully Received',
        badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        cardClass: 'border border-emerald-200 bg-emerald-100 text-emerald-700',
      };
    }
    if (totalQtyReceived > 0) {
      return {
        label: 'Partially Received',
        badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
        cardClass: 'border border-amber-200 bg-amber-100 text-amber-700',
      };
    }
    if (container.date_emptied) {
      return {
        label: 'Unloaded/Emptied',
        badgeClass: 'border-purple-200 bg-purple-50 text-purple-700',
        cardClass: 'border border-purple-200 bg-purple-100 text-purple-700',
      };
    }
    if (container.date_dropped_off) {
      return {
        label: 'Picked Up',
        badgeClass: 'border-blue-200 bg-blue-50 text-blue-700',
        cardClass: 'border border-blue-200 bg-blue-100 text-blue-700',
      };
    }
    return {
      label: 'In Transit',
      badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
      cardClass: 'border border-amber-200 bg-amber-100 text-amber-700',
    };
  };

  const containerStage = getContainerStage();

  const handleSyncSingleContainer = async () => {
    if (!container?.id || isSyncingSingle) return;
    setIsSyncingSingle(true);
    try {
      await syncSingleContainer(container.id);
      toast.success('Container synced successfully.');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to sync container:', err);
      const errorMsg =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to sync container.';
      toast.error(errorMsg);
    } finally {
      setIsSyncingSingle(false);
    }
  };

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="animate-in fade-in zoom-in-95 flex h-[900px] max-h-[95vh] w-[1400px] max-w-[95vw] flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-2xl duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-2.5">
            <div className="flex items-center gap-3">
              <div className="bg-mc-beige-light text-mc-black flex h-8 w-8 items-center justify-center rounded-lg">
                <Eye className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm leading-tight font-bold text-slate-800">
                  Container Details
                </h3>
                <div className="mt-1 flex items-center gap-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-500">
                    <span>
                      {container.sellercloud_container_id || 'Unnamed'}
                      {(container.name ||
                        container.container_name ||
                        container.container_number) &&
                      (container.name ||
                        container.container_name ||
                        container.container_number) !== container.id &&
                      (container.name ||
                        container.container_name ||
                        container.container_number) !== 'undefined'
                        ? ` (${container.name || container.container_name || container.container_number})`
                        : ''}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span
                      className={`rounded-sm border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${containerStage.badgeClass}`}
                    >
                      {containerStage.label}
                    </span>
                    {container.date_dropped_off && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span
                          className="flex items-center gap-1 text-xs"
                          title="Dropped Off"
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {String(container.date_dropped_off).split('T')[0]}
                          </span>
                        </span>
                      </>
                    )}
                    {container.date_emptied && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span
                          className="flex items-center gap-1 text-xs"
                          title="Emptied"
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {String(container.date_emptied).split('T')[0]}
                          </span>
                        </span>
                      </>
                    )}
                    {container.is_received &&
                      container.received_date &&
                      container.received_date !== 'N/A' && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1 text-xs">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>
                              {String(container.received_date).split('T')[0]}
                            </span>
                          </span>
                        </>
                      )}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {localStorage.getItem('userRole') !== 'Vendor' && (
                <button
                  onClick={handleSyncSingleContainer}
                  disabled={isSyncingSingle}
                  className="text-mc-black mr-2 flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Sync this container"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isSyncingSingle ? 'text-mc-gold animate-spin' : ''}`}
                  />
                  {isSyncingSingle ? 'Syncing...' : 'Sync Container'}
                </button>
              )}
              {container.sellercloud_link &&
                localStorage.getItem('userRole') !== 'Vendor' && (
                  <button
                    onClick={() =>
                      window.open(container.sellercloud_link, '_blank')
                    }
                    className="text-mc-black mr-2 flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold shadow-sm transition hover:bg-slate-200"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open in Sellercloud
                  </button>
                )}
              <button
                onClick={onClose}
                className="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex shrink-0 border-b border-slate-100 bg-slate-50/50">
            <button
              className={`flex-1 border-b-2 py-3 text-center text-xs font-bold transition ${activeTab === 'details' ? 'border-mc-gold text-mc-black bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              onClick={() => setActiveTab('details')}
            >
              Details
            </button>
            {String(localStorage.getItem('userRole')).toLowerCase() !==
              'vendor' && (
              <button
                className={`flex-1 border-b-2 py-3 text-center text-xs font-bold transition ${activeTab === 'comments' ? 'border-mc-gold text-mc-black bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                onClick={() => setActiveTab('comments')}
              >
                {String(localStorage.getItem('userRole')).toLowerCase() ===
                'warehouse'
                  ? 'Container Tracking Information'
                  : 'Container Tracking & Financial Information'}
              </button>
            )}
            {['administrator', 'office'].includes(
              String(localStorage.getItem('userRole')).toLowerCase(),
            ) && (
              <button
                className={`flex-1 border-b-2 py-3 text-center text-xs font-bold transition ${activeTab === 'activities' ? 'border-mc-gold text-mc-black bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                onClick={() => setActiveTab('activities')}
              >
                Activities
              </button>
            )}
          </div>

          {/* Modal Body */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-6">
            {activeTab === 'details' && (
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                <div className="mb-4 grid shrink-0 grid-cols-2 gap-4 md:grid-cols-6">
                  <div className="border-mc-beige-dark bg-mc-white rounded-xl border p-3 shadow-xs md:col-span-2">
                    <span className="block text-[10px] font-medium text-slate-400">
                      Arrival Date
                    </span>
                    <strong className="mt-1 block font-mono text-sm font-bold text-slate-800">
                      {container.arrivalDate || 'Pending'}
                    </strong>
                  </div>

                  <div className="border-mc-beige-dark bg-mc-white rounded-xl border p-3 shadow-xs md:col-span-2">
                    <span className="block text-[10px] font-medium text-slate-400">
                      Total Item
                    </span>
                    <strong className="mt-1 flex items-baseline gap-1.5 font-mono text-sm font-bold text-slate-800">
                      {totalItems}{' '}
                      <span className="font-medium text-slate-500">units</span>
                    </strong>
                  </div>

                  <div className="border-mc-beige-dark bg-mc-white flex flex-col justify-center rounded-xl border p-3 shadow-xs md:col-span-2">
                    <span className="mb-1 block text-[10px] font-medium text-slate-400">
                      Status
                    </span>
                    <div className="inline-flex">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${containerStage.cardClass}`}
                      >
                        {containerStage.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-mc-beige-dark bg-mc-white mt-3 flex min-h-0 flex-1 flex-col rounded-xl border p-4 shadow-sm">
                  <h5 className="text-mc-black mb-3 shrink-0 text-xs font-extrabold tracking-wider uppercase">
                    Allocated Items
                  </h5>

                  {allItems.length > 0 || isLoading ? (
                    <>
                      <DataTable
                        isLoading={isLoading}
                        columns={[
                          {
                            header: 'VENDOR NAME',
                            accessor: 'vendor_name',
                            headerClassName: 'px-3 py-2 w-1/3 bg-transparent',
                            className: 'px-3 py-2 max-w-[120px]',
                            render: (item) => (
                              <span className="block truncate font-mono font-bold text-slate-500">
                                {item.vendor_name || 'N/A'}
                              </span>
                            ),
                          },
                          {
                            header: 'SKU',
                            accessor: 'sku',
                            headerClassName: 'px-3 py-2 bg-transparent w-32',
                            className:
                              'px-3 py-2 min-w-[140px] whitespace-nowrap',
                            render: (item) => (
                              <div
                                className="group flex cursor-pointer items-center gap-1.5"
                                onClick={() => {
                                  if (item.sku) {
                                    navigator.clipboard.writeText(item.sku);
                                    toast.success('SKU copied to clipboard!');
                                  }
                                }}
                              >
                                <span
                                  className="text-mc-black group-hover:text-mc-gold font-bold whitespace-nowrap transition-colors"
                                  data-tooltip-id="sku-tooltip"
                                  data-tooltip-content={item.sku || 'N/A'}
                                >
                                  {item.sku || '-'}
                                </span>
                                {item.sku && (
                                  <Copy className="group-hover:text-mc-gold h-3.5 w-3.5 text-slate-400 transition-colors" />
                                )}
                              </div>
                            ),
                          },
                          {
                            header: 'IMAGE',
                            accessor: 'image',
                            headerClassName:
                              'px-3 py-2 bg-transparent w-16 text-center pr-6',
                            className: 'px-3 py-2 w-16 text-center pr-6',
                            render: (item) => {
                              const imageSrc =
                                item.image_url ||
                                item.imageUrl ||
                                item.image ||
                                item.imageSource ||
                                item.product_image ||
                                null;

                              return (
                                <ItemImageThumbnail
                                  src={imageSrc}
                                  alt={item.sku || 'Product Image'}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect =
                                      e.currentTarget.getBoundingClientRect();
                                    setPreviewAnchor({
                                      top: rect.bottom + 6,
                                      left: rect.left,
                                    });
                                    setPreviewImage(imageSrc);
                                  }}
                                />
                              );
                            },
                          },
                          {
                            header: 'PRODUCT NAME',
                            accessor: 'product_name',
                            headerClassName: 'px-3 py-2 bg-transparent pl-6',
                            className: 'px-3 py-2 max-w-[150px] pl-6',
                            render: (item) => {
                              const name =
                                item.product_name || item.name || '-';
                              const displayName =
                                name.length > 25
                                  ? name.substring(0, 25) + '...'
                                  : name;

                              return (
                                <div className="flex items-center gap-3">
                                  <span
                                    className="font-medium text-slate-800"
                                    data-tooltip-id="sku-tooltip"
                                    data-tooltip-content={name}
                                  >
                                    {displayName}
                                  </span>
                                </div>
                              );
                            },
                          },
                          {
                            header: 'QTY ASSIGNED',
                            accessor: 'qty',
                            headerClassName:
                              'px-3 py-2 text-right w-32 bg-transparent',
                            className:
                              'px-3 py-2 text-right font-mono font-medium',
                            render: (item) =>
                              item.qty_in_container || item.qty || 0,
                          },
                          {
                            header: 'QTY RECEIVED',
                            accessor: 'qty_received',
                            headerClassName:
                              'px-3 py-2 text-right w-32 bg-transparent',
                            className:
                              'px-3 py-2 text-right font-mono font-medium',
                            render: (item) => {
                              const qtyReceived =
                                item.qty_received_container ?? 0;
                              const qtyAssigned =
                                item.qty_in_container || item.qty || 0;
                              const isUnderReceived =
                                qtyReceived > 0 && qtyReceived < qtyAssigned;
                              return (
                                <span
                                  className={
                                    isUnderReceived
                                      ? 'font-bold text-rose-600'
                                      : ''
                                  }
                                >
                                  {qtyReceived}
                                </span>
                              );
                            },
                          },
                        ]}
                        data={paginatedItems}
                        keyField="product_name"
                        defaultThClassName="px-6 py-3 bg-transparent"
                        theadClassName="bg-mc-beige-light border-b border-mc-beige-dark text-mc-black uppercase tracking-widest font-extrabold text-[10px] sticky top-0 z-10"
                        tableClassName="w-full min-w-max whitespace-nowrap text-left text-xs border-collapse"
                        tbodyClassName="divide-y divide-mc-beige-dark/40 text-mc-black"
                        trClassName={() =>
                          'transition bg-mc-white hover:bg-mc-beige-light/30'
                        }
                        containerClassName="flex-1 flex flex-col min-h-0 rounded-xl border border-mc-beige-dark bg-mc-white w-full overflow-hidden"
                        tableWrapperClassName="overflow-auto flex-1 custom-scrollbar scroll-smooth"
                        hidePagination={true}
                      />
                      {totalItems > 5 && (
                        <div className="border-mc-beige-dark bg-mc-white mt-3 rounded-xl border p-1 shadow-sm">
                          <Pagination
                            currentPage={itemsPage}
                            totalCount={totalItems}
                            pageSize={itemsPageSize}
                            onPageChange={(pg) => setItemsPage(pg)}
                            onPageSizeChange={(size) => {
                              setItemsPageSize(size);
                              setItemsPage(1);
                            }}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
                        <Package className="h-8 w-8 text-slate-300" />
                      </div>
                      <p className="mb-1 font-medium text-slate-500">
                        No items allocated
                      </p>
                      <p className="max-w-sm text-sm text-slate-400">
                        This container currently does not have any purchase
                        order items assigned to it.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'comments' &&
              String(localStorage.getItem('userRole')).toLowerCase() !==
                'vendor' && (
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                  <div className="mt-8 mb-4 px-2">
                    <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                          Container Name
                        </label>
                        <input
                          type="text"
                          disabled
                          className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500 opacity-60 transition-colors focus:outline-none"
                          value={trackingData.container_name || ''}
                          placeholder="e.g. CAAU1234567"
                          onChange={(e) =>
                            handleTrackingChange(
                              'container_name',
                              e.target.value,
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                          Door
                        </label>
                        <Select
                          isDisabled={
                            String(
                              localStorage.getItem('userRole'),
                            ).toLowerCase() !== 'warehouse' &&
                            String(
                              localStorage.getItem('userRole'),
                            ).toLowerCase() !== 'administrator'
                          }
                          value={(() => {
                            const doorVal = trackingData.door;
                            if (!doorVal) return null;
                            return { label: doorVal, value: doorVal };
                          })()}
                          onChange={(option) =>
                            handleTrackingChange(
                              'door',
                              option ? option.value : '',
                            )
                          }
                          options={(() => {
                            let rawWName = String(
                              container?.warehouse_name ||
                                container?.warehouse?.name ||
                                container?.warehouse ||
                                '',
                            )
                              .trim()
                              .toLowerCase();

                            if (
                              [
                                'undefined',
                                'null',
                                'none',
                                'n/a',
                                '-',
                              ].includes(rawWName)
                            ) {
                              rawWName = '';
                            }

                            const opts = [];
                            let hasCurrentDoor = false;

                            if (rawWName) {
                              let numDoors = 14;
                              if (rawWName.includes('california')) {
                                numDoors = 10;
                              } else if (
                                rawWName.includes('south brunswick') ||
                                rawWName.includes('brunswick')
                              ) {
                                numDoors = 17;
                              }

                              for (let i = 1; i <= numDoors; i++) {
                                const val = String(i);
                                if (val === String(trackingData.door))
                                  hasCurrentDoor = true;
                                opts.push({ label: val, value: val });
                              }
                            }

                            if (trackingData.door && !hasCurrentDoor) {
                              opts.unshift({
                                label: trackingData.door,
                                value: trackingData.door,
                              });
                            }
                            return opts;
                          })()}
                          styles={reactSelectStyles}
                          placeholder={(() => {
                            let rawWName = String(
                              container?.warehouse_name ||
                                container?.warehouse?.name ||
                                container?.warehouse ||
                                '',
                            )
                              .trim()
                              .toLowerCase();

                            if (
                              [
                                'undefined',
                                'null',
                                'none',
                                'n/a',
                                '-',
                              ].includes(rawWName)
                            ) {
                              rawWName = '';
                            }
                            return rawWName
                              ? 'Select door'
                              : 'No warehouse currently assigned';
                          })()}
                          noOptionsMessage={() =>
                            'No warehouse currently assigned'
                          }
                          isClearable
                          isSearchable={false}
                          menuPortalTarget={document.body}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                          Date Dropped Off
                        </label>
                        <DateFilterInput
                          value={trackingData.date_dropped_off || ''}
                          onChange={(val) =>
                            handleTrackingChange('date_dropped_off', val)
                          }
                          title="Date Dropped Off"
                          disabled={
                            String(
                              localStorage.getItem('userRole'),
                            ).toLowerCase() !== 'warehouse' &&
                            String(
                              localStorage.getItem('userRole'),
                            ).toLowerCase() !== 'administrator'
                          }
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                          Date Emptied
                        </label>
                        <DateFilterInput
                          value={trackingData.date_emptied || ''}
                          onChange={(val) =>
                            handleTrackingChange('date_emptied', val)
                          }
                          title="Date Emptied"
                          disabled={
                            String(
                              localStorage.getItem('userRole'),
                            ).toLowerCase() !== 'warehouse' &&
                            String(
                              localStorage.getItem('userRole'),
                            ).toLowerCase() !== 'administrator'
                          }
                          className="w-full"
                        />
                      </div>
                      {(String(
                        localStorage.getItem('userRole'),
                      ).toLowerCase() === 'warehouse' ||
                        String(
                          localStorage.getItem('userRole'),
                        ).toLowerCase() === 'administrator') &&
                        trackingData.date_emptied && (
                          <div className="mt-2 grid grid-cols-1 gap-6 border-t border-slate-100 pt-4 sm:col-span-2">
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-slate-700">
                                Trucker Email
                              </label>
                              <div className="flex flex-wrap items-center gap-2">
                                <Select
                                  value={
                                    logisticsOptions.find(
                                      (o) =>
                                        o.id ===
                                          trackingData.logistics_company_id ||
                                        o.value === trackingData.trucker_email,
                                    ) || null
                                  }
                                  onChange={(option) => {
                                    handleTrackingChange(
                                      'trucker_email',
                                      option ? option.value : '',
                                    );
                                    handleTrackingChange(
                                      'logistics_company_id',
                                      option ? option.id : null,
                                    );
                                  }}
                                  options={logisticsOptions}
                                  styles={reactSelectStyles}
                                  placeholder="Select tracker..."
                                  isLoading={isLoadingLogistics}
                                  isSearchable
                                  isClearable
                                  menuPortalTarget={document.body}
                                  className="w-full"
                                />
                              </div>
                              {emailError && (
                                <p className="mt-1.5 text-[10px] font-bold text-rose-500">
                                  {emailError}
                                </p>
                              )}
                            </div>
                            {/* Temporarily commented out Primary Mail & CC Mail
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-slate-700">
                                Primary Email
                              </label>
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  type="email"
                                  value={trackingData.primary_email || ''}
                                  onChange={(e) =>
                                    handleTrackingChange(
                                      'primary_email',
                                      e.target.value,
                                    )
                                  }
                                  placeholder="e.g. primary@manhattancomfort.com"
                                  className={`focus:ring-mc-black focus:border-mc-black w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition-colors focus:ring-1 focus:outline-none`}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-slate-700">
                                CC
                              </label>
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  type="email"
                                  value={trackingData.trucker_cc_email || ''}
                                  onChange={(e) =>
                                    handleTrackingChange(
                                      'trucker_cc_email',
                                      e.target.value,
                                    )
                                  }
                                  placeholder="e.g. cc@manhattancomfort.com"
                                  className={`focus:ring-mc-black focus:border-mc-black w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition-colors focus:ring-1 focus:outline-none`}
                                />
                              </div>
                            </div>
                            */}
                          </div>
                        )}
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                          Unloaded By
                        </label>
                        <input
                          type="text"
                          className="focus:border-mc-black focus:ring-mc-black w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition-colors focus:ring-1 focus:outline-none"
                          value={trackingData.unloaded_by || ''}
                          placeholder="e.g. John Doe"
                          onChange={(e) =>
                            handleTrackingChange('unloaded_by', e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                          Country Of Origin
                        </label>
                        <Select
                          value={
                            countryOptions.find(
                              (c) =>
                                c.label?.toLowerCase() ===
                                  (
                                    trackingData.country_of_origin || ''
                                  ).toLowerCase() ||
                                c.value?.toLowerCase() ===
                                  (
                                    trackingData.country_of_origin || ''
                                  ).toLowerCase(),
                            ) || null
                          }
                          onChange={(option) =>
                            handleTrackingChange(
                              'country_of_origin',
                              option ? option.label : '',
                            )
                          }
                          options={countryOptions}
                          styles={reactSelectStyles}
                          placeholder="Select country"
                          isSearchable
                          isClearable
                          menuPortalTarget={document.body}
                        />
                      </div>
                      {String(
                        localStorage.getItem('userRole'),
                      ).toLowerCase() !== 'warehouse' && (
                        <>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                              Unload Cost
                            </label>
                            <div className="relative">
                              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                                $
                              </span>
                              <input
                                type="number"
                                className="focus:border-mc-black focus:ring-mc-black w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-7 text-sm transition-colors focus:ring-1 focus:outline-none"
                                value={trackingData.unload_cost || ''}
                                placeholder="0.00"
                                onChange={(e) =>
                                  handleTrackingChange(
                                    'unload_cost',
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                              Container Shipping Costs
                            </label>
                            <div className="relative">
                              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                                $
                              </span>
                              <input
                                type="number"
                                className="focus:border-mc-black focus:ring-mc-black w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-7 text-sm transition-colors focus:ring-1 focus:outline-none"
                                value={
                                  trackingData.container_shipping_cost || ''
                                }
                                placeholder="0.00"
                                onChange={(e) =>
                                  handleTrackingChange(
                                    'container_shipping_cost',
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                              Drayage
                            </label>
                            <div className="relative">
                              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                                $
                              </span>
                              <input
                                type="number"
                                className="focus:border-mc-black focus:ring-mc-black w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-7 text-sm transition-colors focus:ring-1 focus:outline-none"
                                value={trackingData.drayage_cost || ''}
                                placeholder="0.00"
                                onChange={(e) =>
                                  handleTrackingChange(
                                    'drayage_cost',
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                              Customs Duty Misc
                            </label>
                            <div className="relative">
                              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                                $
                              </span>
                              <input
                                type="number"
                                className="focus:border-mc-black focus:ring-mc-black w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-7 text-sm transition-colors focus:ring-1 focus:outline-none"
                                value={trackingData.customs_duty_misc || ''}
                                placeholder="0.00"
                                onChange={(e) =>
                                  handleTrackingChange(
                                    'customs_duty_misc',
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                              Per Diem
                            </label>
                            <div className="relative">
                              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                                $
                              </span>
                              <input
                                type="number"
                                className="focus:border-mc-black focus:ring-mc-black w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-7 text-sm transition-colors focus:ring-1 focus:outline-none"
                                value={trackingData.per_diem || ''}
                                placeholder="0.00"
                                onChange={(e) =>
                                  handleTrackingChange(
                                    'per_diem',
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                          </div>
                        </>
                      )}
                      {/* 1. Attachment Section (First) */}
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                          Attachment
                        </label>
                        <div className="flex flex-col gap-3">
                          <label className="hover:border-mc-gold hover:bg-mc-beige-light flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm font-medium text-slate-600 transition-colors">
                            <FileUp className="h-5 w-5 text-slate-400" />
                            <span className="flex flex-col items-center">
                              <span>Click to upload attachment(s)</span>
                              <span className="mt-1 text-[10px] text-slate-400">
                                .jpeg, .jpg, .png, .gif, .webp, .pdf, .doc,
                                .docx, .csv, .xls, .xlsx (Max 5MB each)
                              </span>
                            </span>
                            <input
                              type="file"
                              multiple
                              className="hidden"
                              accept=".jpeg,.jpg,.png,.gif,.webp,.pdf,.doc,.docx,.csv,.xls,.xlsx"
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                if (files.length > 0) {
                                  const validFiles = files.filter((f) => {
                                    if (f.size > 5 * 1024 * 1024) {
                                      toast.error(
                                        `File ${f.name} exceeds 5MB limit`,
                                      );
                                      return false;
                                    }
                                    return true;
                                  });
                                  handleTrackingChange('attachmentsToUpload', [
                                    ...(trackingData.attachmentsToUpload || []),
                                    ...validFiles,
                                  ]);
                                }
                                e.target.value = '';
                              }}
                            />
                          </label>

                          {(() => {
                            const hasUploads =
                              trackingData.attachmentsToUpload &&
                              trackingData.attachmentsToUpload.length > 0;

                            const atts = trackingData.existingAttachments || [];
                            const hasExisting = atts.length > 0;

                            if (!hasUploads && !hasExisting) return null;

                            return (
                              <div className="mt-4 flex flex-wrap gap-4">
                                {hasUploads &&
                                  trackingData.attachmentsToUpload.map(
                                    (file, idx) => (
                                      <div
                                        key={idx}
                                        className="group relative flex h-20 w-20 flex-col items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300"
                                        title={`${file.name} (${(
                                          file.size /
                                          (1024 * 1024)
                                        ).toFixed(2)} MB)`}
                                      >
                                        {file.type.startsWith('image/') ? (
                                          <div className="relative h-full w-full overflow-hidden rounded-lg">
                                            <img
                                              src={URL.createObjectURL(file)}
                                              alt="Preview"
                                              className="h-full w-full object-cover"
                                            />
                                          </div>
                                        ) : (
                                          <div className="flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-lg bg-slate-50 text-slate-400">
                                            <FileText className="text-mc-gold/70 h-6 w-6" />
                                            <span className="mt-1 w-16 truncate px-1 text-center text-[9px] font-medium text-slate-500">
                                              {file.name}
                                            </span>
                                          </div>
                                        )}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const newFiles = [
                                              ...trackingData.attachmentsToUpload,
                                            ];
                                            newFiles.splice(idx, 1);
                                            handleTrackingChange(
                                              'attachmentsToUpload',
                                              newFiles,
                                            );
                                          }}
                                          className="absolute -top-1.5 -right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition-all group-hover:opacity-100 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500"
                                        >
                                          <X
                                            className="h-3 w-3"
                                            strokeWidth={3}
                                          />
                                        </button>
                                      </div>
                                    ),
                                  )}

                                {/* Existing attachments from backend */}
                                {hasExisting &&
                                  atts.map((att, idx) => {
                                    const isImage =
                                      att.content_type?.startsWith('image/') ||
                                      att.file_name?.match(
                                        /\.(jpeg|jpg|gif|png|webp)$/i,
                                      );

                                    return (
                                      <div
                                        key={att.id}
                                        className="group relative flex h-20 w-20 flex-col items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300"
                                        title={`${att.file_name} ${att.size ? `(${(att.size / (1024 * 1024)).toFixed(2)} MB)` : ''}`}
                                      >
                                        {isImage ? (
                                          <div className="relative h-full w-full overflow-hidden rounded-lg">
                                            <img
                                              src={att.file_url}
                                              alt="Preview"
                                              className="h-full w-full cursor-pointer object-cover"
                                              onClick={() =>
                                                window.open(
                                                  att.file_url,
                                                  '_blank',
                                                )
                                              }
                                            />
                                          </div>
                                        ) : (
                                          <div
                                            className="flex h-full w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg bg-slate-50 text-slate-400"
                                            onClick={() =>
                                              window.open(
                                                att.file_url,
                                                '_blank',
                                              )
                                            }
                                          >
                                            <FileText className="text-mc-gold/70 h-6 w-6" />
                                            <span className="mt-1 w-16 truncate px-1 text-center text-[9px] font-medium text-slate-500">
                                              {att.file_name}
                                            </span>
                                          </div>
                                        )}
                                        <a
                                          href={att.file_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-mc-gold hover:border-mc-gold/40 hover:bg-mc-beige-light absolute -right-1.5 -bottom-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition-all"
                                        >
                                          {isImage ? (
                                            <Eye
                                              className="h-3 w-3"
                                              strokeWidth={2.5}
                                            />
                                          ) : (
                                            <Download
                                              className="h-3 w-3"
                                              strokeWidth={2.5}
                                            />
                                          )}
                                        </a>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            setAttachmentToDelete(att);
                                          }}
                                          className="absolute -top-1.5 -right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500"
                                        >
                                          <X
                                            className="h-3 w-3"
                                            strokeWidth={3}
                                          />
                                        </button>
                                      </div>
                                    );
                                  })}
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* 2. Old / Legacy User Notes (Disabled - Only shown if historical notes exist) */}
                      {(() => {
                        const vCreditOld = String(
                          trackingData.factory_credit_needed || '',
                        ).trim();
                        const rClosureOld = String(
                          trackingData.receiving_closure_notes || '',
                        ).trim();

                        const hasVendorCredit =
                          vCreditOld !== '' &&
                          vCreditOld !== 'null' &&
                          vCreditOld !== 'undefined';
                        const hasReceivingClosure =
                          rClosureOld !== '' &&
                          rClosureOld !== 'null' &&
                          rClosureOld !== 'undefined';

                        if (!hasVendorCredit && !hasReceivingClosure) {
                          return null;
                        }

                        return (
                          <div className="grid grid-cols-1 gap-6 sm:col-span-2 sm:grid-cols-2">
                            {hasVendorCredit && (
                              <div className="relative">
                                <div className="mb-1 flex items-center justify-between">
                                  <label className="block text-xs font-semibold text-slate-700">
                                    Vendor Credit Needed (Archived Notes)
                                  </label>
                                  <span className="rounded bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-500 uppercase">
                                    Read Only
                                  </span>
                                </div>
                                <div className="relative">
                                  <textarea
                                    rows={3}
                                    disabled
                                    className="w-full resize-y rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600 opacity-90 cursor-not-allowed focus:outline-none"
                                    value={vCreditOld}
                                    readOnly
                                  />
                                </div>
                                <p className="mt-1 text-[11px] text-slate-400">
                                  Historical view only. Use the comment box below for new updates.
                                </p>
                              </div>
                            )}
                            {hasReceivingClosure && (
                              <div className="relative">
                                <div className="mb-1 flex items-center justify-between">
                                  <label className="block text-xs font-semibold text-slate-700">
                                    Receiving Closure Notes (Archived Notes)
                                  </label>
                                  <span className="rounded bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-500 uppercase">
                                    Read Only
                                  </span>
                                </div>
                                <div className="relative">
                                  <textarea
                                    rows={3}
                                    disabled
                                    className="w-full resize-y rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600 opacity-90 cursor-not-allowed focus:outline-none"
                                    value={rClosureOld}
                                    readOnly
                                  />
                                </div>
                                <p className="mt-1 text-[11px] text-slate-400">
                                  Historical view only. Use the comment box below for new updates.
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* 3. New Vendor Credit Needed & Receiving Closure Notes (New Comments) */}
                      <div className="grid grid-cols-1 gap-6 sm:col-span-2 sm:grid-cols-2">
                        <ContainerCommentSection
                          containerId={container?.id}
                          category="vendor_credit"
                          title="Vendor Credit Needed"
                          placeholder="Type a message... (Use @ to tag)"
                          loadMentionOptions={loadVendorMentionOptions}
                        />
                        <ContainerCommentSection
                          containerId={container?.id}
                          category="receiving_closure"
                          title="Receiving Closure Notes"
                          placeholder="Type a message... (Use @ to tag)"
                          loadMentionOptions={loadTeamMentionOptions}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

            {activeTab === 'activities' &&
              ['administrator', 'office'].includes(
                String(localStorage.getItem('userRole')).toLowerCase(),
              ) && (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div className="border-mc-beige-dark bg-mc-white mt-1 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border shadow-sm">
                    <div className="flex shrink-0 items-center justify-between px-5 pt-5 pb-4">
                      <h4 className="text-mc-black shrink-0 text-xs font-extrabold tracking-wider uppercase">
                        Container Activities
                      </h4>
                    </div>
                    {(activities && activities.length > 0) ||
                    isLoadingActivities ? (
                      <>
                        <DataTable
                          columns={[
                            {
                              header: 'Date & Time',
                              accessor: 'timestamp',
                              headerClassName: 'px-6 py-4 bg-transparent w-48',
                              className:
                                'px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-500',
                              render: (item) => {
                                const date = new Date(
                                  item.created_at || item.timestamp,
                                );
                                return date.toLocaleString();
                              },
                            },
                            {
                              header: 'User',
                              accessor: 'user',
                              headerClassName: 'px-6 py-4 bg-transparent w-48',
                              className:
                                'px-6 py-4 font-bold text-slate-800 uppercase text-[10px]',
                              render: (item) =>
                                item.user_name || item.user || 'SYSTEM',
                            },
                            {
                              header: 'Details',
                              accessor: 'action',
                              headerClassName: 'px-6 py-4 bg-transparent',
                              className: 'px-6 py-4 text-slate-700',
                              render: (item) => (
                                <div className="max-w-lg text-[12px] font-medium text-slate-700">
                                  {item.human_readable_message || '-'}
                                </div>
                              ),
                            },
                          ]}
                          data={
                            activitiesTotal === activities.length
                              ? activities.slice(
                                  (activitiesPage - 1) * activitiesPageSize,
                                  activitiesPage * activitiesPageSize,
                                )
                              : activities
                          }
                          keyField={(item, idx) => item.id || idx}
                          defaultThClassName="px-4 py-3 bg-transparent"
                          theadClassName="bg-mc-beige-light border-b border-mc-beige-dark text-mc-black uppercase tracking-widest font-extrabold text-[10px] sticky top-0 z-10"
                          tableClassName="w-full text-left text-xs border-collapse"
                          tbodyClassName="divide-y divide-mc-beige-dark/40 text-mc-black"
                          trClassName="hover:bg-mc-beige-light/30 bg-mc-white transition-colors"
                          containerClassName="overflow-x-auto overflow-y-auto flex-1 min-h-0 rounded-lg"
                          isLoading={isLoadingActivities}
                        />
                        {activitiesTotal > 0 && (
                          <div className="border-mc-beige-dark bg-mc-white mt-3 rounded-xl border p-1 shadow-sm">
                            <Pagination
                              currentPage={activitiesPage}
                              totalCount={activitiesTotal}
                              pageSize={activitiesPageSize}
                              onPageChange={(pg) => setActivitiesPage(pg)}
                              onPageSizeChange={(size) => {
                                setActivitiesPageSize(size);
                                setActivitiesPage(1);
                              }}
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
                        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
                          <Clock className="h-8 w-8 text-slate-300" />
                        </div>
                        <p className="mb-1 font-medium text-slate-500">
                          No activities found
                        </p>
                        <p className="max-w-sm text-sm text-slate-400">
                          There are no recorded activities for this container.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
          </div>

          {/* Modal Footer (Only for Tracking Details) */}
          {activeTab === 'comments' && (
            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                onClick={onClose}
                className="cursor-pointer rounded-lg border border-slate-200 bg-white px-5 py-2 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTracking}
                className="bg-mc-gold text-mc-black hover:bg-mc-gold/80 flex cursor-pointer items-center justify-center rounded-lg px-6 py-2 text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {container.door ||
                container.date_dropped_off ||
                container.date_emptied ||
                container.unloaded_by ||
                container.country_of_origin ||
                container.unload_cost ||
                container.container_shipping_cost ||
                container.drayage_cost ||
                container.customs_duty_misc ||
                container.per_diem ||
                container.factory_credit_needed ||
                container.receiving_closure_notes ||
                trackingData.attachment
                  ? 'Update Container'
                  : 'Save Container'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Popup */}
      {attachmentToDelete && (
        <div className="bg-mc-black/60 fixed inset-0 z-[10000] flex items-center justify-center p-4 font-sans backdrop-blur-[2px] transition-all">
          <div className="border-mc-beige-dark bg-mc-white w-full max-w-sm rounded-xl border p-6 shadow-2xl">
            <h3 className="text-mc-black mb-2 text-lg font-extrabold tracking-tight">
              Delete Attachment
            </h3>
            <p className="mb-6 text-sm leading-relaxed font-medium text-slate-500">
              Are you sure you want to permanently delete this attachment? This
              action cannot be undone and will delete it immediately from the
              server.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                disabled={isDeletingAttachment}
                onClick={() => setAttachmentToDelete(null)}
                className="bg-mc-beige-light text-mc-black hover:bg-mc-beige-dark rounded-lg px-5 py-2.5 text-xs font-bold tracking-wider uppercase transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={isDeletingAttachment}
                onClick={handleConfirmDeleteAttachment}
                className="bg-mc-black text-mc-white hover:bg-mc-gray-dark flex items-center justify-center rounded-lg px-5 py-2.5 text-xs font-bold tracking-wider shadow-sm transition-colors hover:text-rose-400 disabled:opacity-50"
              >
                {isDeletingAttachment ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <Tooltip
        id="sku-tooltip"
        positionStrategy="fixed"
        place="top"
        className="z-[100] max-w-xs text-center text-xs leading-relaxed font-semibold tracking-wide shadow-xl"
        style={{
          backgroundColor: '#F4EFE8',
          color: '#151717',
          borderRadius: '8px',
          padding: '8px 12px',
        }}
      />
      {previewImage &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999]"
            onClick={() => {
              setPreviewImage(null);
              setPreviewAnchor(null);
            }}
          >
            <div
              className="absolute rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl"
              style={{
                top: previewAnchor?.top ?? '50%',
                left: previewAnchor
                  ? Math.min(
                      Math.max(previewAnchor.left, 8),
                      window.innerWidth - 280,
                    )
                  : '50%',
                transform: previewAnchor ? undefined : 'translate(-50%, -50%)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setPreviewImage(null);
                  setPreviewAnchor(null);
                }}
                className="absolute -top-2.5 -right-2.5 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow transition hover:bg-white hover:text-rose-500"
              >
                <X className="h-4 w-4" />
              </button>
              <img
                src={previewImage}
                alt="Preview"
                className="max-h-[260px] max-w-[260px] rounded-xl object-contain"
              />
            </div>
          </div>,
          document.body,
        )}
    </>,
    document.body,
  );
}
