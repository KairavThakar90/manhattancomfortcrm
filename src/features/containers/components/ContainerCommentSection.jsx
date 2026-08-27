import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Send,
  Reply,
  Pencil,
  Trash,
  Paperclip,
  X,
  Loader2,
  MessageSquare,
  Download,
  ChevronUp,
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

/**
 * ContainerCommentSection
 * 1-to-1 exact replica of Purchase Order Details Comment Flow design, layout, uploading flow, and delete confirmation modal.
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
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  // Input states
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentFiles, setNewCommentFiles] = useState([]);
  const [replyToCommentId, setReplyToCommentId] = useState(null);
  const [replyToUser, setReplyToUser] = useState(null);
  const [replyToText, setReplyToText] = useState(null);
  const [commentError, setCommentError] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);

  // Mention system states
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionHighlightIndex, setMentionHighlightIndex] = useState(0);
  const [tagUsers, setTagUsers] = useState([]);
  const [taggedUserMap, setTaggedUserMap] = useState({});
  const [collapsedComments, setCollapsedComments] = useState({});

  // Edit states
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [editingCommentFiles, setEditingCommentFiles] = useState([]);

  // Preview & Delete confirmation target
  const [previewImage, setPreviewImage] = useState(null);
  const [deleteCommentTarget, setDeleteCommentTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const messagesEndRef = useRef(null);
  const currentUserId = localStorage.getItem('userId');
  const currentUserRole = String(
    localStorage.getItem('userRole') || '',
  ).toLowerCase();

  // Load mention candidates on mount
  useEffect(() => {
    if (loadMentionOptions) {
      loadMentionOptions()
        .then((users) => {
          if (Array.isArray(users)) {
            setTagUsers(users);
          }
        })
        .catch((err) => console.error('Failed to load mention candidates:', err));
    }
  }, [loadMentionOptions]);

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

  // Helper to extract tagged user IDs from text
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

  // Filter mention dropdown items
  const getFilteredMentions = () => {
    const q = mentionQuery.toLowerCase();
    return tagUsers.filter((u) => {
      const name = typeof u === 'string' ? u : u.name || '';
      return name.toLowerCase().includes(q);
    });
  };

  const handleSelectMention = (userObj) => {
    const name = typeof userObj === 'string' ? userObj : userObj.name || '';
    const userId = typeof userObj === 'string' ? userObj : userObj.id;
    const tag = `@${name.trim().replace(/\s+/g, '_')}`;

    const text = newCommentText;
    const lastAt = text.lastIndexOf('@');
    const newText = text.substring(0, lastAt) + tag + ' ';

    setNewCommentText(newText);
    setTaggedUserMap((prev) => ({ ...prev, [tag]: userId }));
    setShowMentionDropdown(false);
    setMentionQuery('');
    setCommentError('');
  };

  const handleCommentTextChange = (e) => {
    const val = e.target.value;
    setNewCommentText(val);
    if (commentError) setCommentError('');

    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1) {
      const textAfterAt = val.substring(lastAt + 1);
      if (!textAfterAt.includes(' ')) {
        setShowMentionDropdown(true);
        setMentionQuery(textAfterAt);
        setMentionHighlightIndex(0);
        return;
      }
    }
    setShowMentionDropdown(false);
  };

  const handleCommentKeyDown = (e) => {
    if (showMentionDropdown) {
      const filtered = getFilteredMentions();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionHighlightIndex((prev) =>
          prev < filtered.length - 1 ? prev + 1 : 0,
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionHighlightIndex((prev) =>
          prev > 0 ? prev - 1 : filtered.length - 1,
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filtered[mentionHighlightIndex]) {
          handleSelectMention(filtered[mentionHighlightIndex]);
        }
        return;
      }
      if (e.key === 'Escape') {
        setShowMentionDropdown(false);
        return;
      }
    }

    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handlePostComment(e);
    }
  };

  // Submit comment with status flow: Compressing -> Uploading -> Complete
  const handlePostComment = async (e) => {
    if (e) e.preventDefault();
    if (!newCommentText.trim() && newCommentFiles.length === 0) return;

    const taggedUserIds = extractTaggedUserIds(newCommentText);
    if (taggedUserIds.length === 0) {
      setCommentError(
        newCommentFiles.length > 0 && !newCommentText.trim()
          ? 'Please type a message with an @tag to send these attachments.'
          : 'You must @ tag at least one user to post a comment.',
      );
      return;
    }

    setUploadStatus('Compressing...');
    setIsPostingComment(true);

    try {
      const finalFiles = [];
      for (const raw of newCommentFiles) {
        if (raw.type?.startsWith('image/')) {
          const comp = await compressImageIfNeeded(raw);
          finalFiles.push(comp);
        } else {
          finalFiles.push(raw);
        }
      }

      setUploadStatus('Uploading...');

      await postContainerComment(containerId, {
        comment: newCommentText.trim(),
        category,
        parent_id: replyToCommentId || null,
        tagged_user_ids: taggedUserIds,
        files: finalFiles,
      });

      setUploadStatus('');
      toast.success('Comment posted successfully');
      setNewCommentText('');
      setNewCommentFiles([]);
      setReplyToCommentId(null);
      setReplyToUser(null);
      setReplyToText(null);
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
      setUploadStatus('');
      toast.error(err?.response?.data?.message || 'Failed to post comment');
    } finally {
      setIsPostingComment(false);
      setUploadStatus('');
    }
  };

  // Update Comment
  const handleUpdateSubmit = async (commentId) => {
    if (!editingCommentText.trim() && editingCommentFiles.length === 0) {
      toast.error('Comment cannot be empty');
      return;
    }

    setUploadStatus('Saving...');
    setIsPostingComment(true);
    try {
      const compressed = [];
      for (const f of editingCommentFiles) {
        if (f.type?.startsWith('image/')) {
          const c = await compressImageIfNeeded(f);
          compressed.push(c);
        } else {
          compressed.push(f);
        }
      }

      await updateContainerComment(commentId, {
        comment: editingCommentText,
        files: compressed,
      });
      toast.success('Comment updated successfully');
      setEditingCommentId(null);
      setEditingCommentText('');
      setEditingCommentFiles([]);
      await fetchComments(true);
    } catch (err) {
      console.error('Failed to update comment:', err);
      toast.error('Failed to update comment');
    } finally {
      setIsPostingComment(false);
      setUploadStatus('');
    }
  };

  // Delete Comment / Attachment Handlers
  const handleDeleteComment = (commentId) => {
    setDeleteCommentTarget({ type: 'comment', commentId });
  };

  const handleDeleteCommentAttachment = (commentId, attachmentId) => {
    if (!attachmentId) return;
    setDeleteCommentTarget({ type: 'attachment', commentId, attachmentId });
  };

  const handleConfirmDelete = async () => {
    if (!deleteCommentTarget) return;
    const { type, commentId, attachmentId } = deleteCommentTarget;
    setIsDeleting(true);
    try {
      if (type === 'attachment') {
        await deleteContainerCommentAttachment(attachmentId);
        toast.success('Attachment deleted successfully');
      } else {
        await deleteContainerComment(commentId);
        toast.success('Comment deleted successfully');
      }
      setDeleteCommentTarget(null);
      await fetchComments(true);
    } catch (err) {
      console.error('Failed to delete:', err);
      toast.error(err?.response?.data?.message || 'Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };

  // Build comment tree
  const { rootNodes } = useMemo(() => {
    const map = {};
    const roots = [];

    comments.forEach((c) => {
      map[c.id] = {
        id: c.id,
        user: c.user_name || 'User',
        role: c.user_role || '',
        message: c.comment || '',
        timestamp: formatCommentDate(c.created_at),
        userId: c.user_id,
        parent_id: c.parent_id,
        is_edited: c.is_edited,
        files: (c.attachments || []).map((att) => ({
          id: att.id,
          fileUrl: att.file_url,
          fileName: att.file_name,
          fileType: att.content_type,
        })),
        children: [],
      };
    });

    comments.forEach((c) => {
      if (c.parent_id && map[c.parent_id]) {
        map[c.parent_id].children.push(map[c.id]);
      } else if (!c.parent_id && map[c.id]) {
        roots.push(map[c.id]);
      }
    });

    return { rootNodes: roots };
  }, [comments]);

  // Render recursive comment tree matching PODetailsModal
  const renderCommentTree = (node, depth = 0) => {
    const isMe =
      (currentUserId && node.userId === currentUserId) ||
      currentUserRole === 'administrator' ||
      currentUserRole === 'office';
    const isCollapsed = collapsedComments[node.id];

    return (
      <div key={node.id} id={node.id} className="relative mb-3 flex scroll-mt-20 flex-col">
        <div className="group relative flex items-start gap-3 transition-colors">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-100 text-xs font-bold shadow-sm ${
              isMe ? 'bg-mc-black text-white' : 'bg-slate-50 text-slate-700'
            }`}
          >
            {(node.user[0] || 'U').toUpperCase()}
          </div>
          <div
            className={`flex min-w-0 flex-1 flex-col rounded-2xl border p-3 ${
              isMe
                ? 'border-slate-200 bg-slate-100/30 shadow-sm'
                : 'border-slate-100/80 bg-white shadow-xs'
            }`}
          >
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-bold text-slate-800">
                {node.user}
              </span>
              <span className="text-[10px] font-medium whitespace-nowrap text-slate-400">
                {node.timestamp}
              </span>
              {node.is_edited && (
                <span className="text-[10px] text-slate-400 italic">(edited)</span>
              )}
              {!isMe && node.role && (
                <span className="rounded-sm border border-slate-100 bg-slate-50 px-1 py-0.5 text-[8px] font-bold text-slate-500 uppercase">
                  {node.role}
                </span>
              )}
            </div>

            {editingCommentId === node.id ? (
              <div className="mt-1 flex w-full flex-col gap-2">
                {editingCommentFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {editingCommentFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center gap-2 rounded-lg bg-slate-100 px-2 py-1 text-[11px] text-slate-600"
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        <span className="max-w-40 truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingCommentFiles((files) =>
                              files.filter((_, fileIndex) => fileIndex !== index),
                            )
                          }
                          className="text-slate-400 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <textarea
                    value={editingCommentText}
                    onChange={(e) => setEditingCommentText(e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white p-2 pr-9 text-[13px] text-slate-800 focus:border-indigo-400 focus:outline-hidden"
                    rows={2}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      document
                        .getElementById(`container-comment-edit-attachment-${node.id}`)
                        ?.click()
                    }
                    className="absolute top-2 right-2 text-slate-400 transition hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Attach file or image"
                    disabled={isCompressing}
                  >
                    {isCompressing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                  </button>
                  <input
                    id={`container-comment-edit-attachment-${node.id}`}
                    type="file"
                    className="hidden"
                    multiple
                    accept=".jpeg,.jpg,.png,.gif,.webp,.pdf,.doc,.docx,.csv,.xls,.xlsx"
                    onChange={async (e) => {
                      if (!e.target.files?.length) return;
                      const processedFiles = [];
                      setIsCompressing(true);
                      for (const file of Array.from(e.target.files)) {
                        if (
                          !file.name.match(
                            /\.(jpeg|jpg|png|gif|webp|pdf|doc|docx|csv|xls|xlsx)$/i,
                          )
                        ) {
                          toast.error(`Invalid file type for ${file.name}`);
                          continue;
                        }
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error(`File ${file.name} exceeds 5MB limit`);
                          continue;
                        }
                        processedFiles.push(file);
                      }
                      setEditingCommentFiles((files) => [...files, ...processedFiles]);
                      setIsCompressing(false);
                      e.target.value = '';
                    }}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCommentId(null);
                      setEditingCommentText('');
                      setEditingCommentFiles([]);
                    }}
                    className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateSubmit(node.id)}
                    disabled={isPostingComment}
                    className="bg-mc-black rounded px-3 py-1 text-[11px] font-semibold text-white hover:bg-black disabled:opacity-50"
                  >
                    {isPostingComment && uploadStatus ? uploadStatus : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[13px] leading-relaxed break-words whitespace-pre-wrap text-slate-600">
                {node.message
                  .split(/(@[\w.-]+)/g)
                  .map((part, i) =>
                    part.startsWith('@') ? (
                      <span key={i} className="text-mc-black font-bold">
                        {part}
                      </span>
                    ) : (
                      part
                    ),
                  )}
              </p>
            )}

            {/* Attachments Render matching PO Details */}
            {node.files && node.files.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {node.files.map((fileObj, idx) => {
                  const isImage =
                    fileObj.fileType?.startsWith('image/') ||
                    fileObj.fileUrl?.match(/\.(jpeg|jpg|gif|png|webp|bmp)(\?.*)?$/i) ||
                    fileObj.fileUrl?.startsWith('blob:');

                  if (isImage) {
                    return (
                      <div key={idx} className="group/att relative">
                        <button
                          type="button"
                          onClick={() => setPreviewImage(fileObj.fileUrl)}
                          className="relative focus:outline-hidden"
                        >
                          <img
                            src={fileObj.fileUrl}
                            alt="Attachment"
                            className="h-32 w-48 rounded-xl object-cover drop-shadow-sm transition-transform hover:scale-[1.02]"
                          />
                        </button>
                        {isMe && fileObj.id && (
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteCommentAttachment(node.id, fileObj.id)
                            }
                            className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-red-500"
                            title="Delete attachment"
                          >
                            <Trash className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div key={idx} className="group/att relative w-max">
                      <a
                        href={fileObj.fileUrl}
                        download={fileObj.fileName || 'Document'}
                        target="_blank"
                        rel="noreferrer"
                        className="flex w-max items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600 transition-colors hover:bg-slate-100"
                      >
                        <div className="rounded-full bg-slate-200 p-1.5 text-slate-500">
                          <Paperclip className="h-4 w-4" />
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <span className="text-[11px] font-bold">Attachment</span>
                          <span className="max-w-[12rem] truncate text-[10px] text-slate-400">
                            {fileObj.fileName || 'Document'}
                          </span>
                        </div>
                        <div className="ml-2 flex rounded-full bg-slate-200 p-1.5 text-slate-500 transition-colors hover:bg-slate-300 hover:text-slate-700">
                          <Download className="h-3 w-3" />
                        </div>
                      </a>
                      {isMe && fileObj.id && (
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteCommentAttachment(node.id, fileObj.id)
                          }
                          className="absolute -top-2 -right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                          title="Delete attachment"
                        >
                          <Trash className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Action Bar matching PO Details */}
            <div className="mt-2 flex items-center gap-4">
              {isMe && editingCommentId !== node.id && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCommentId(node.id);
                    setEditingCommentText(node.message);
                    setEditingCommentFiles([]);
                  }}
                  className="hover:text-mc-black flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 opacity-100 transition"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
              )}
              {isMe && editingCommentId !== node.id && (
                <button
                  type="button"
                  onClick={() => handleDeleteComment(node.id)}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 opacity-100 transition hover:text-red-500"
                >
                  <Trash className="h-3 w-3" /> Delete
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setReplyToCommentId(node.id);
                  setReplyToUser(node.user);
                  setReplyToText(node.message);
                }}
                className="hover:text-mc-black flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 opacity-100 transition"
              >
                <Reply className="h-3 w-3" /> Reply
              </button>

              {node.children.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setCollapsedComments((prev) => ({
                      ...prev,
                      [node.id]: !prev[node.id],
                    }))
                  }
                  className="hover:text-mc-black flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 transition"
                >
                  {isCollapsed ? (
                    <>
                      <MessageSquare className="h-3 w-3" /> Expand{' '}
                      {node.children.length} replies
                    </>
                  ) : (
                    <>
                      <ChevronUp className="h-3 w-3" /> Collapse
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Nested Children */}
        {!isCollapsed && node.children.length > 0 && (
          <div className="relative mt-3 ml-4 flex flex-col border-l-[1.5px] border-slate-200/80 pl-4 sm:ml-6 sm:pl-6">
            {node.children.map((child) => renderCommentTree(child, depth + 1))}
          </div>
        )}
      </div>
    );
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
      </div>

      {/* Messages Stream */}
      <div className="custom-scrollbar flex min-h-[300px] max-h-[460px] flex-1 flex-col overflow-y-auto p-4">
        {isLoading && comments.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-8 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {rootNodes.length > 0 ? (
              <div className="flex flex-col">
                {rootNodes.map((root) => renderCommentTree(root, 0))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-2 py-8 opacity-70">
                <MessageSquare className="h-8 w-8 text-slate-400" />
                <p className="font-mono text-xs font-medium text-slate-500">
                  No comment
                </p>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} className="h-1 shrink-0" />
      </div>

      {/* Form Input Area (100% same to same as PODetailsModal) */}
      <form
        onSubmit={handlePostComment}
        className="relative flex shrink-0 flex-col gap-2 border-t border-slate-200/70 bg-white p-3"
      >
        {replyToUser && (
          <div className="animate-fadeIn group border-mc-gold relative mb-1 flex items-start gap-2 rounded-lg border-l-4 bg-slate-50 py-2 pr-8 pl-3">
            <Reply className="text-mc-gold mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-mc-black block text-xs font-bold">
                Replying to {replyToUser}
              </span>
              <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500 italic transition-all group-hover:line-clamp-2">
                {replyToText || 'Attachment'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setReplyToCommentId(null);
                setReplyToUser(null);
                setReplyToText(null);
              }}
              className="absolute top-1.5 right-1.5 rounded p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="flex w-full items-end gap-3">
          <div className="min-w-0 flex-1 flex-col">
            {newCommentFiles.length > 0 && (
              <div className="custom-scrollbar mb-3 flex w-full max-w-full gap-2 overflow-x-auto pb-2">
                {newCommentFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="bg-mc-black relative flex w-48 shrink-0 flex-col rounded-xl p-2 shadow-md"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        const newFiles = [...newCommentFiles];
                        newFiles.splice(idx, 1);
                        setNewCommentFiles(newFiles);
                        if (newFiles.length === 0) {
                          const input = document.getElementById(
                            `comment-attachment-input-${category}`,
                          );
                          if (input) input.value = '';
                        }
                      }}
                      className="absolute -top-2 -right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md transition-colors hover:border-red-200 hover:text-red-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    {file.type?.startsWith('image/') ? (
                      <div className="bg-mc-gray-dark relative flex h-24 w-full items-center justify-center overflow-hidden rounded-lg">
                        <img
                          src={URL.createObjectURL(file)}
                          alt="Preview"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="bg-mc-gray-dark flex h-24 w-full flex-col items-center justify-center rounded-lg">
                        <Paperclip className="text-mc-gray-soft mb-1 h-6 w-6 text-slate-300" />
                        <span className="bg-mc-gray-soft rounded px-2 py-0.5 text-[9px] font-bold tracking-wider text-white uppercase shadow-xs">
                          {file.name.split('.').pop()}
                        </span>
                      </div>
                    )}
                    <div className="bg-mc-gray-dark text-mc-white mt-2 w-full truncate rounded-md px-2 py-1 text-center text-[10px] font-semibold text-white">
                      {file.name}{' '}
                      <span className="block text-[9px] font-normal text-white/50">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Dropdown anchored to input row only */}
            <div className="relative w-full">
              {showMentionDropdown && (
                <div className="animate-fadeIn absolute bottom-full left-0 z-50 mb-1 flex w-64 flex-col rounded-xl border border-slate-200 bg-white shadow-xl">
                  <div className="max-h-48 overflow-y-auto py-1">
                    {(() => {
                      const filtered = getFilteredMentions();
                      if (filtered.length === 0) {
                        return (
                          <div className="px-3 py-2 text-xs text-slate-400">
                            No users found
                          </div>
                        );
                      }
                      return filtered.map((userObj, idx) => {
                        const name =
                          typeof userObj === 'string'
                            ? userObj
                            : userObj.name || '';
                        const initial = (name[0] || 'U').toUpperCase();
                        const isHighlighted = idx === mentionHighlightIndex;
                        return (
                          <button
                            key={
                              typeof userObj === 'string'
                                ? userObj
                                : userObj.id || idx
                            }
                            type="button"
                            onClick={() => handleSelectMention(userObj)}
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
                                {name}
                              </div>
                            </div>
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              <textarea
                rows={2}
                placeholder={placeholder}
                value={newCommentText}
                onChange={handleCommentTextChange}
                onKeyDown={handleCommentKeyDown}
                className={`focus:border-mc-black w-full resize-none rounded-lg border ${
                  commentError
                    ? 'border-rose-500 bg-rose-50'
                    : 'border-slate-200 bg-slate-50'
                } px-3 py-2 pr-10 text-[13px] transition focus:bg-white focus:outline-hidden`}
              />

              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById(`comment-attachment-input-${category}`)
                    ?.click()
                }
                className="absolute top-[5px] right-2 p-1 font-bold text-slate-400 transition hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                title="Attach file or image"
                disabled={isCompressing || isPostingComment}
              >
                {isCompressing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </button>
            </div>

            {commentError && (
              <p className="animate-fadeIn mt-1 text-[11px] font-bold text-rose-500">
                {commentError}
              </p>
            )}

            <input
              type="file"
              id={`comment-attachment-input-${category}`}
              className="hidden"
              multiple
              accept=".jpeg,.jpg,.png,.gif,.webp,.pdf,.doc,.docx,.csv,.xls,.xlsx"
              onChange={async (e) => {
                if (e.target.files && e.target.files.length > 0) {
                  const selectedFiles = Array.from(e.target.files);
                  const processedFiles = [];
                  setIsCompressing(true);

                  for (const file of selectedFiles) {
                    const isAllowedExt = file.name.match(
                      /\.(jpeg|jpg|png|gif|webp|pdf|doc|docx|csv|xls|xlsx)$/i,
                    );
                    if (!isAllowedExt) {
                      toast.error(
                        `Invalid file type for ${file.name}. Only Images, PDFs, Word, Excel, and CSVs are allowed.`,
                      );
                      continue;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error(
                        `File ${file.name} exceeds the 5MB limits. Please upload a smaller file.`,
                      );
                      continue;
                    }
                    processedFiles.push(file);
                  }

                  if (processedFiles.length > 0) {
                    setNewCommentFiles((prev) => [...prev, ...processedFiles]);
                  }
                  setIsCompressing(false);
                  e.target.value = '';
                }
              }}
            />
          </div>

          <button
            type="submit"
            disabled={
              isPostingComment ||
              (!newCommentText.trim() && newCommentFiles.length === 0)
            }
            className="bg-mc-black flex h-[42px] shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-2 text-[13px] font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPostingComment ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {uploadStatus ? uploadStatus.replace('...', '') : 'Posting'}
                </span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Comment</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Lightbox / Image Preview Modal */}
      <ImagePreviewModal
        isOpen={Boolean(previewImage)}
        imageSrc={previewImage}
        onClose={() => setPreviewImage(null)}
      />

      {/* Delete Confirmation Modal (matching PODetailsModal & ItemCommentModal) */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteCommentTarget)}
        title={
          deleteCommentTarget?.type === 'attachment'
            ? 'Delete Attachment'
            : 'Delete Comment'
        }
        message={
          deleteCommentTarget?.type === 'attachment'
            ? "This can't be undone. Are you sure you want to delete this attachment?"
            : "This can't be undone. Are you sure you want to delete this comment?"
        }
        confirmLabel="Delete"
        isDeleting={isDeleting}
        onCancel={() => !isDeleting && setDeleteCommentTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
