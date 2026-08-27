import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Send,
  Reply,
  Pencil,
  Trash2,
  Paperclip,
  X,
  Loader2,
  MessageSquare,
  FileText,
  Download,
  Eye,
  RefreshCw,
  ChevronUp,
  Check,
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  getContainerComments,
  postContainerComment,
  updateContainerComment,
  deleteContainerComment,
  deleteContainerCommentAttachment,
} from '../services/container.service';
import { compressImageIfNeeded } from '../../../utils/imageCompression';
import ImagePreviewModal from '../../../components/common/ImagePreviewModal';
import ConfirmDeleteModal from '../../../components/common/ConfirmDeleteModal';

// Helper to format ISO timestamp into readable string
function formatCommentDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 45) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Helper to mirror textarea coordinates for @mention caret positioning
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
    'textTransform',
    'wordSpacing',
    'textIndent',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'lineHeight',
  ].forEach((prop) => {
    style[prop] = computed[prop];
  });

  div.textContent = textarea.value.substring(0, position);
  const span = document.createElement('span');
  span.textContent = textarea.value.substring(position) || '.';
  div.appendChild(span);

  document.body.appendChild(div);
  const coordinates = {
    top: span.offsetTop + parseInt(computed.borderTopWidth || '0', 10),
    left: span.offsetLeft + parseInt(computed.borderLeftWidth || '0', 10),
    height: parseInt(computed.lineHeight || '18', 10),
  };
  document.body.removeChild(div);
  return coordinates;
}

/**
 * Textarea with popup @mention support.
 */
export function CommentMentionTextarea({
  value,
  onChange,
  onMentionSelect,
  onOptionsLoaded,
  loadOptions,
  placeholder,
  rows = 2,
  className = '',
  hasError = false,
  disabled = false,
  onKeyDown,
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

  const anchorRef = useRef({ top: 0, bottom: 0 });

  const filteredOptions = useMemo(() => {
    const f = filter.toLowerCase();
    const list = Array.isArray(options) ? options : [];
    if (!f) return list.slice(0, 8);
    return list
      .filter((o) => (o.name || '').toLowerCase().includes(f))
      .slice(0, 8);
  }, [filter, options]);

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

        if (!hasFetchedRef.current && !isLoadingOptions && loadOptions) {
          hasFetchedRef.current = true;
          setIsLoadingOptions(true);
          loadOptions()
            .then((list) => {
              const safeList = Array.isArray(list) ? list : [];
              setOptions(safeList);
              if (onOptionsLoaded) onOptionsLoaded(safeList);
            })
            .catch((err) => {
              console.error('Failed to load @mention options', err);
              hasFetchedRef.current = false;
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
    if (onMentionSelect) {
      onMentionSelect(option, tag.trim());
    }
    setIsOpen(false);
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const pos = before.length + tag.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      }
    });
  };

  const handleKey = (e) => {
    if (isOpen && filteredOptions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        return;
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredOptions[highlightIndex]);
        return;
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        return;
      }
    }
    if (onKeyDown) onKeyDown(e);
  };

  const finalClassName = hasError
    ? `${className} border-rose-500 bg-rose-50 focus:border-rose-600 focus:ring-rose-500/20`
    : className;

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <textarea
        ref={textareaRef}
        rows={rows}
        disabled={disabled}
        className={finalClassName}
        value={value}
        placeholder={placeholder}
        onChange={handleChange}
        onKeyDown={handleKey}
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
            className="border-mc-beige-dark bg-mc-white animate-fadeIn z-[99999] max-h-60 overflow-y-auto rounded-xl border p-1 shadow-2xl backdrop-blur-md"
          >
            {isLoadingOptions && filteredOptions.length === 0 ? (
              <div className="text-mc-gray-soft flex items-center gap-2 px-3 py-2.5 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading users...
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const initial = (opt.name?.[0] || 'U').toUpperCase();
                const isHighlighted = idx === highlightIndex;
                return (
                  <button
                    key={opt.id || idx}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertMention(opt);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition ${
                      isHighlighted
                        ? 'bg-mc-gold/15 text-mc-black font-bold'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        isHighlighted
                          ? 'bg-mc-gold text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{opt.name}</div>
                      {opt.role && (
                        <div className="text-[10px] text-slate-400 capitalize">
                          {opt.role}
                        </div>
                      )}
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

/**
 * Helper to render message text with highlighted @mentions.
 */
function CommentTextRenderer({ text }) {
  if (!text) return null;

  const parts = text.split(/(@[a-zA-Z0-9_.-]+)/g);

  return (
    <span className="leading-relaxed whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          return (
            <span
              key={i}
              className="bg-mc-gold/15 text-mc-black inline-block rounded-md px-1.5 py-0.5 text-xs font-bold"
            >
              {part}
            </span>
          );
        }
        return part;
      })}
    </span>
  );
}

/**
 * Single Comment Item Component matching PO Details comment card design.
 */
function CommentItem({
  comment,
  currentUserId,
  currentUserRole,
  onReply,
  onEdit,
  onDelete,
  onDeleteAttachment,
  onPreviewImage,
  replies = [],
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.comment || '');
  const [editFiles, setEditFiles] = useState([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isAuthor =
    (currentUserId && comment.user_id === currentUserId) ||
    currentUserRole === 'administrator' ||
    currentUserRole === 'office';

  const authorName = comment.user_name || 'User';
  const initial = (authorName[0] || 'U').toUpperCase();
  const attachments = Array.isArray(comment.attachments)
    ? comment.attachments
    : [];

  const handleSaveEdit = async () => {
    if (!editText.trim() && editFiles.length === 0) {
      toast.error('Comment cannot be empty');
      return;
    }
    setIsSavingEdit(true);
    try {
      await onEdit(comment.id, editText, editFiles);
      setIsEditing(false);
      setEditFiles([]);
    } catch (err) {
      console.error('Failed to update comment', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="group/item relative flex flex-col gap-2 rounded-xl border border-slate-100 bg-white p-3.5 shadow-xs transition-all hover:border-slate-200 hover:shadow-sm">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="bg-mc-gold/20 text-mc-black border-mc-gold/30 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold shadow-xs">
            {initial}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-800">
                {authorName}
              </span>
              {comment.is_edited && (
                <span className="text-[10px] text-slate-400 italic">
                  (edited)
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400">
              {formatCommentDate(comment.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Message Body or Edit Mode */}
      {isEditing ? (
        <div className="mt-1 flex flex-col gap-2">
          <textarea
            rows={2}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="focus:border-mc-black focus:ring-mc-black w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs transition-colors focus:ring-1 focus:outline-none"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSavingEdit}
              onClick={handleSaveEdit}
              className="bg-mc-black text-white flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition hover:bg-black disabled:opacity-50"
            >
              {isSavingEdit ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="text-xs text-slate-700">
          <CommentTextRenderer text={comment.comment} />
        </div>
      )}

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-2 pt-1">
          {attachments.map((att) => {
            const isImg =
              att.content_type?.startsWith('image/') ||
              att.file_url?.match(/\.(jpeg|jpg|png|gif|webp)(\?|$)/i);

            return (
              <div
                key={att.id}
                className="group/att border-mc-beige-dark/60 bg-mc-beige-light/40 relative flex items-center gap-2 overflow-hidden rounded-lg border p-1.5 text-xs shadow-2xs"
              >
                {isImg ? (
                  <button
                    type="button"
                    onClick={() => onPreviewImage(att.file_url)}
                    className="relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md bg-slate-100"
                  >
                    <img
                      src={att.file_url}
                      alt={att.file_name || 'Attachment'}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity hover:opacity-100">
                      <Eye className="h-3.5 w-3.5 text-white" />
                    </div>
                  </button>
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                    <FileText className="h-5 w-5" />
                  </div>
                )}

                <div className="flex max-w-[130px] flex-col">
                  <span
                    className="truncate text-[11px] font-semibold text-slate-700"
                    title={att.file_name}
                  >
                    {att.file_name || 'File'}
                  </span>
                  <a
                    href={att.file_url}
                    target="_blank"
                    rel="noreferrer"
                    download={att.file_name}
                    className="text-mc-gold hover:text-mc-orange flex items-center gap-1 text-[10px] font-bold underline-offset-1 hover:underline"
                  >
                    <Download className="h-2.5 w-2.5" /> Download
                  </a>
                </div>

                {isAuthor && (
                  <button
                    type="button"
                    onClick={() => onDeleteAttachment(att.id)}
                    className="flex h-5 w-5 items-center justify-center rounded text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                    title="Remove attachment"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Action Bar matching PO details comment action bar */}
      {!isEditing && (
        <div className="mt-1 flex items-center gap-4 border-t border-slate-100 pt-2 text-[11px] font-semibold text-slate-500">
          <button
            type="button"
            onClick={() => onReply(comment)}
            className="hover:text-mc-black flex items-center gap-1 transition"
          >
            <Reply className="h-3 w-3" /> Reply
          </button>

          {isAuthor && (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditText(comment.comment || '');
                  setIsEditing(true);
                }}
                className="hover:text-mc-black flex items-center gap-1 transition"
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(comment)}
                className="flex items-center gap-1 transition hover:text-rose-500"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </>
          )}

          {replies.length > 0 && (
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hover:text-mc-black ml-auto flex items-center gap-1 text-slate-400 transition"
            >
              {isCollapsed ? (
                <>
                  <MessageSquare className="h-3 w-3" /> Expand {replies.length}{' '}
                  replies
                </>
              ) : (
                <>
                  <ChevronUp className="h-3 w-3" /> Collapse
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Nested Replies */}
      {!isCollapsed && replies.length > 0 && (
        <div className="mt-2 ml-3 flex flex-col gap-2 border-l-2 border-slate-200/80 pl-3">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onDeleteAttachment={onDeleteAttachment}
              onPreviewImage={onPreviewImage}
              replies={[]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * ContainerCommentSection
 * Matches Purchase Order Details Comment Flow conditions, @tag validation, and rules.
 */
export default function ContainerCommentSection({
  containerId,
  category,
  title,
  placeholder = 'Type a message... (Use @ to tag)',
  loadMentionOptions,
  onActivityAdded,
}) {
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New comment input state
  const [message, setMessage] = useState('');
  const [taggedUserMap, setTaggedUserMap] = useState({});
  const [tagUsers, setTagUsers] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [commentError, setCommentError] = useState('');

  // Modals & previews
  const [previewImage, setPreviewImage] = useState(null);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef(null);
  const commentsEndRef = useRef(null);

  const currentUserId = localStorage.getItem('userId');
  const currentUserRole = String(
    localStorage.getItem('userRole') || '',
  ).toLowerCase();

  // Fetch comments
  const fetchComments = async (silent = false) => {
    if (!containerId) return;
    if (!silent) setIsLoading(true);
    try {
      const data = await getContainerComments(containerId, category);
      setComments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(`Failed to load comments for ${category}:`, err);
      if (!silent) {
        toast.error(`Failed to load ${title} comments`);
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [containerId, category]);

  // Group comments into root comments and their replies
  const { rootComments, replyMap } = useMemo(() => {
    const roots = [];
    const map = {};

    comments.forEach((c) => {
      if (c.parent_id) {
        if (!map[c.parent_id]) map[c.parent_id] = [];
        map[c.parent_id].push(c);
      } else {
        roots.push(c);
      }
    });

    return { rootComments: roots, replyMap: map };
  }, [comments]);

  // Extract @tagged user ids from a message matching PO details tagging engine
  const extractTaggedUserIds = (text) => {
    const words = (text || '').trim().split(/\s+/);
    return words
      .filter((w) => w.startsWith('@'))
      .map((w) => {
        const cleanW = w.replace(/[.,!?;:]+$/, '');
        if (taggedUserMap[cleanW]) return taggedUserMap[cleanW];
        const found = tagUsers.find((u) => {
          const name = typeof u === 'string' ? u : u.name || '';
          const tagBase = name.trim().replace(/\s+/g, '_');
          return `@${tagBase}`.toLowerCase() === cleanW.toLowerCase();
        });
        return found ? (typeof found === 'string' ? found : found.id) : null;
      })
      .filter(Boolean);
  };

  // Handle @mention selection to record tagged user mapping
  const handleMentionSelect = (userOption, tagText) => {
    if (userOption?.id) {
      const cleanTag =
        tagText || `@${(userOption.name || '').trim().replace(/\s+/g, '_')}`;
      setTaggedUserMap((prev) => ({
        ...prev,
        [cleanTag]: userOption.id,
      }));
    }
    setCommentError('');
  };

  // Handle file select with validation (Max 5MB)
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = [];
    files.forEach((f) => {
      const isAllowedExt = f.name.match(
        /\.(jpeg|jpg|png|gif|webp|pdf|doc|docx|csv|xls|xlsx)$/i,
      );
      if (!isAllowedExt) {
        toast.error(
          `Invalid file type for ${f.name}. Only Images, PDFs, Word, Excel, and CSVs are allowed.`,
        );
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`File "${f.name}" exceeds 5MB limit`);
        return;
      }
      validFiles.push(f);
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (commentError) setCommentError('');
  };

  const removeSelectedFile = (idx) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Post Comment with mandatory @tag validation matching PO Details rule
  const handlePostComment = async (e) => {
    if (e) e.preventDefault();
    if (!message.trim() && selectedFiles.length === 0) return;

    // Validate @tag requirement matching PO details
    const taggedUserIds = extractTaggedUserIds(message);
    if (taggedUserIds.length === 0) {
      setCommentError(
        selectedFiles.length > 0 && !message.trim()
          ? 'Please type a message with an @tag to send these attachments.'
          : 'You must @ tag at least one user to post a comment.',
      );
      return;
    }

    setCommentError('');
    setIsSubmitting(true);
    try {
      const compressedFiles = [];
      for (const file of selectedFiles) {
        if (file.type.startsWith('image/')) {
          const comp = await compressImageIfNeeded(file);
          compressedFiles.push(comp);
        } else {
          compressedFiles.push(file);
        }
      }

      await postContainerComment(containerId, {
        comment: message.trim(),
        category,
        parent_id: replyTo?.id || null,
        tagged_user_ids: taggedUserIds,
        files: compressedFiles,
      });

      toast.success('Comment posted successfully');
      setMessage('');
      setSelectedFiles([]);
      setReplyTo(null);
      setCommentError('');

      await fetchComments(true);

      if (onActivityAdded) {
        onActivityAdded(
          `Added comment under ${title}`,
          category === 'vendor_credit' ? 'Vendor Comment' : 'Internal Comment',
        );
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
      toast.error(err?.response?.data?.message || 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Comment
  const handleEditComment = async (commentId, updatedText, newFiles = []) => {
    const compressed = [];
    for (const f of newFiles) {
      if (f.type.startsWith('image/')) {
        const c = await compressImageIfNeeded(f);
        compressed.push(c);
      } else {
        compressed.push(f);
      }
    }

    await updateContainerComment(commentId, {
      comment: updatedText,
      files: compressed,
    });
    toast.success('Comment updated');
    await fetchComments(true);
  };

  // Delete Comment
  const handleConfirmDeleteComment = async () => {
    if (!commentToDelete) return;
    setIsDeleting(true);
    try {
      await deleteContainerComment(commentToDelete.id);
      toast.success('Comment deleted');
      setCommentToDelete(null);
      await fetchComments(true);
    } catch (err) {
      console.error('Failed to delete comment:', err);
      toast.error('Failed to delete comment');
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete Attachment
  const handleDeleteAttachment = async (attachmentId) => {
    try {
      await deleteContainerCommentAttachment(attachmentId);
      toast.success('Attachment removed');
      await fetchComments(true);
    } catch (err) {
      console.error('Failed to delete attachment:', err);
      toast.error('Failed to delete attachment');
    }
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200/80 bg-slate-50/40 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/70 bg-slate-100/70 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-800">{title}</label>
          <span className="bg-mc-gold/20 text-mc-black rounded-full px-2 py-0.5 text-[10px] font-extrabold">
            {comments.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => fetchComments(false)}
          disabled={isLoading}
          className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50"
          title="Refresh comments"
        >
          <RefreshCw
            className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`}
          />
        </button>
      </div>

      {/* Comment Thread Stream */}
      <div className="custom-scrollbar flex min-h-[300px] max-h-[460px] flex-1 flex-col gap-2.5 overflow-y-auto p-3.5">
        {isLoading && comments.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-8 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : rootComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-2 py-8 opacity-70">
            <MessageSquare className="h-8 w-8 text-slate-400" />
            <p className="font-mono text-xs font-medium text-slate-500">
              No comment
            </p>
          </div>
        ) : (
          rootComments.map((root) => (
            <CommentItem
              key={root.id}
              comment={root}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onReply={(c) => setReplyTo(c)}
              onEdit={handleEditComment}
              onDelete={(c) => setCommentToDelete(c)}
              onDeleteAttachment={handleDeleteAttachment}
              onPreviewImage={(url) => setPreviewImage(url)}
              replies={replyMap[root.id] || []}
            />
          ))
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Input Box Footer (Matching PO Details Chat Box) */}
      <div className="border-t border-slate-200/70 bg-white p-3">
        {/* Replying Banner */}
        {replyTo && (
          <div className="animate-fadeIn group border-mc-gold relative mb-2 flex items-start gap-2 rounded-lg border-l-4 bg-slate-50 py-2 pr-8 pl-3">
            <Reply className="text-mc-gold mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-mc-black block text-xs font-bold">
                Replying to {replyTo.user_name || 'User'}
              </span>
              <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500 italic transition-all group-hover:line-clamp-2">
                {replyTo.comment || 'Attachment'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="absolute top-1.5 right-1.5 rounded p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Selected Files Preview (Card Style from PO Details) */}
        {selectedFiles.length > 0 && (
          <div className="custom-scrollbar mb-3 flex w-full max-w-full gap-2 overflow-x-auto pb-2">
            {selectedFiles.map((file, idx) => (
              <div
                key={idx}
                className="bg-mc-black relative flex w-36 shrink-0 flex-col rounded-xl p-2 shadow-md"
              >
                <button
                  type="button"
                  onClick={() => removeSelectedFile(idx)}
                  className="absolute -top-2 -right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md transition-colors hover:border-red-200 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
                {file.type.startsWith('image/') ? (
                  <div className="bg-mc-gray-dark relative flex h-20 w-full items-center justify-center overflow-hidden rounded-lg">
                    <img
                      src={URL.createObjectURL(file)}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="bg-mc-gray-dark flex h-20 w-full flex-col items-center justify-center rounded-lg">
                    <Paperclip className="text-mc-gray-soft mb-1 h-5 w-5 text-slate-300" />
                    <span className="bg-mc-gray-soft rounded px-1.5 py-0.5 text-[8px] font-bold text-white uppercase shadow-xs">
                      {file.name.split('.').pop()}
                    </span>
                  </div>
                )}
                <div className="text-mc-white mt-1.5 w-full truncate rounded-md px-1 text-center text-[10px] font-semibold text-white">
                  {file.name}{' '}
                  <span className="block text-[8px] font-normal text-white/60">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Input Bar with integrated Paperclip inside textarea & Comment button */}
        <div>
          <div className="flex w-full items-end gap-2.5">
            <div className="relative min-w-0 flex-1">
              <CommentMentionTextarea
                rows={2}
                className="focus:border-mc-black w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 pr-10 text-[13px] transition focus:bg-white focus:outline-hidden"
                value={message}
                hasError={Boolean(commentError)}
                placeholder={placeholder}
                loadOptions={loadMentionOptions}
                onOptionsLoaded={(list) => setTagUsers(list)}
                onMentionSelect={handleMentionSelect}
                onChange={(val) => {
                  setMessage(val);
                  if (commentError) setCommentError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handlePostComment();
                  }
                }}
              />
              <input
                type="file"
                multiple
                ref={fileInputRef}
                className="hidden"
                accept=".jpeg,.jpg,.png,.gif,.webp,.pdf,.doc,.docx,.csv,.xls,.xlsx"
                onChange={handleFileSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute top-[8px] right-2.5 p-1 font-bold text-slate-400 transition hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                title="Attach file or image"
              >
                <Paperclip className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              disabled={
                isSubmitting ||
                (!message.trim() && selectedFiles.length === 0)
              }
              onClick={handlePostComment}
              className="bg-mc-black flex h-[42px] shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Posting...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Comment</span>
                </>
              )}
            </button>
          </div>

          {/* Validation Error Message under input */}
          {commentError && (
            <p className="animate-fadeIn mt-1 text-[11px] font-bold text-rose-500">
              {commentError}
            </p>
          )}
        </div>
      </div>

      {/* Lightbox / Image Preview */}
      <ImagePreviewModal
        isOpen={Boolean(previewImage)}
        imageSrc={previewImage}
        onClose={() => setPreviewImage(null)}
      />

      {/* Delete Confirmation Modal */}
      {commentToDelete && (
        <ConfirmDeleteModal
          isOpen={Boolean(commentToDelete)}
          title="Delete Comment"
          message="Are you sure you want to permanently delete this comment and its attachments?"
          confirmText="Delete"
          isDeleting={isDeleting}
          onConfirm={handleConfirmDeleteComment}
          onClose={() => setCommentToDelete(null)}
        />
      )}
    </div>
  );
}
