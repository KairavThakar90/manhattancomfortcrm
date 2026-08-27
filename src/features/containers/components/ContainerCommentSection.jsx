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
  CornerDownRight,
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
  loadOptions,
  placeholder,
  rows = 2,
  className = '',
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
            .then((list) => setOptions(Array.isArray(list) ? list : []))
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
      onMentionSelect(option);
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

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <textarea
        ref={textareaRef}
        rows={rows}
        disabled={disabled}
        className={className}
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

  // Split on @mentions: @word_word or @word
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
 * Single Comment Item Component with nested replies, edit, delete, and attachments.
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

        {/* Action icons */}
        {!isEditing && (
          <div className="flex items-center gap-1 opacity-80 transition-opacity group-hover/item:opacity-100">
            <button
              type="button"
              onClick={() => onReply(comment)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              title="Reply"
            >
              <Reply className="h-3.5 w-3.5" />
            </button>
            {isAuthor && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditText(comment.comment || '');
                    setIsEditing(true);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  title="Edit comment"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(comment)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                  title="Delete comment"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        )}
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
              className="bg-mc-gold text-mc-black flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition hover:opacity-90 disabled:opacity-50"
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

      {/* Nested Replies */}
      {replies.length > 0 && (
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
 * Complete, standalone comment box for container categories (e.g. 'vendor_credit' or 'receiving_closure').
 */
export default function ContainerCommentSection({
  containerId,
  category,
  title,
  placeholder,
  loadMentionOptions,
  onActivityAdded,
}) {
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New comment input state
  const [message, setMessage] = useState('');
  const [taggedUserIds, setTaggedUserIds] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [replyTo, setReplyTo] = useState(null);

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

  // Handle @mention selection to record tagged user ID
  const handleMentionSelect = (userOption) => {
    if (userOption?.id && !taggedUserIds.includes(userOption.id)) {
      setTaggedUserIds((prev) => [...prev, userOption.id]);
    }
  };

  // Handle file select with validation (Max 5MB)
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = [];
    files.forEach((f) => {
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`File "${f.name}" exceeds 5MB limit`);
      } else {
        validFiles.push(f);
      }
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeSelectedFile = (idx) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Post Comment
  const handlePostComment = async (e) => {
    if (e) e.preventDefault();
    if (!message.trim() && selectedFiles.length === 0) return;

    setIsSubmitting(true);
    try {
      // Compress any images
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
      setTaggedUserIds([]);
      setReplyTo(null);

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
      <div className="custom-scrollbar flex max-h-[260px] min-h-[140px] flex-1 flex-col gap-2.5 overflow-y-auto p-3">
        {isLoading && comments.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-6 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : rootComments.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-6 text-center text-slate-400">
            <MessageSquare className="mb-1.5 h-6 w-6 opacity-40" />
            <p className="text-xs font-medium">No comments yet</p>
            <p className="text-[11px] opacity-70">
              Type a note below to start the thread
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

      {/* Input Box Footer */}
      <div className="border-t border-slate-200/70 bg-white p-3">
        {/* Replying Banner */}
        {replyTo && (
          <div className="animate-fadeIn border-mc-gold/60 bg-mc-gold/10 mb-2 flex items-center justify-between rounded-lg border-l-3 px-2.5 py-1.5 text-xs">
            <div className="flex items-center gap-1.5 truncate text-slate-700">
              <CornerDownRight className="text-mc-gold h-3.5 w-3.5 shrink-0" />
              <span className="font-semibold">
                Replying to {replyTo.user_name || 'User'}
              </span>
              <span className="max-w-[140px] truncate text-[11px] text-slate-500 italic">
                "{replyTo.comment}"
              </span>
            </div>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="rounded p-0.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Selected Files Preview */}
        {selectedFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {selectedFiles.map((file, idx) => (
              <div
                key={idx}
                className="relative flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
              >
                <Paperclip className="h-3 w-3 text-slate-400" />
                <span className="max-w-[120px] truncate text-[11px] font-medium">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeSelectedFile(idx)}
                  className="ml-1 text-slate-400 transition hover:text-rose-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea + Action buttons */}
        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            <CommentMentionTextarea
              rows={2}
              className="focus:border-mc-black focus:ring-mc-black w-full resize-none rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs transition-colors focus:bg-white focus:ring-1 focus:outline-none"
              value={message}
              placeholder={placeholder}
              loadOptions={loadMentionOptions}
              onMentionSelect={handleMentionSelect}
              onChange={(val) => setMessage(val)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handlePostComment();
                }
              }}
            />
          </div>

          <div className="flex items-center gap-1.5 pb-1">
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
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800"
              title="Attach files (images, pdfs, docs)"
            >
              <Paperclip className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              disabled={
                isSubmitting ||
                (!message.trim() && selectedFiles.length === 0)
              }
              onClick={handlePostComment}
              className="bg-mc-gold text-mc-black hover:bg-mc-gold/90 flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold shadow-xs transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span>Send</span>
            </button>
          </div>
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
