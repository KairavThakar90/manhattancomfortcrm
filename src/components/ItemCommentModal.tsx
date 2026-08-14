import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Send,
  Reply,
  ChevronUp,
  MessageSquare,
  Pencil,
  Loader2,
  Paperclip,
  Download,
  Eye,
} from 'lucide-react';
import { useCRM } from '../hooks/useCRM';
import { User, getTagUsers } from '../features/users/services/user.service';
import { toast } from 'react-toastify';

const formatUtcTimestamp = (ts: any) => {
  if (!ts) return new Date().toISOString().slice(0, 16).replace('T', ' ');
  const d = new Date(ts);
  return isNaN(d.getTime())
    ? ts
    : d.toISOString().slice(0, 16).replace('T', ' ');
};

const parseApiCommentObject = (c: any, defaultTargetId: string) => {
  let fileUrl = null;
  let fileName = '';
  let fileType = '';

  const possibleFiles = c.files || c.attachments || c.documents || [];
  if (possibleFiles && possibleFiles.length > 0) {
    const f = possibleFiles[0];
    fileUrl = f.url || f.file_url || f.file;
    fileName = f.name || f.filename || f.file_name || '';
    fileType = f.content_type || f.type || f.file_type || '';
  }

  return {
    id: String(c.id || `ITEMCOM-${Math.random()}`),
    itemId: defaultTargetId,
    user: c.user_name || c.user || c.author || 'User',
    userId: c.user_id || c.author_id || null,
    role: c.role || 'Administrator',
    message: c.comment || c.message || c.text || '',
    timestamp: formatUtcTimestamp(c.created_at || c.timestamp),
    parentId: c.parent_id ? String(c.parent_id) : null,
    fileUrl,
    fileName,
    fileType,
  };
};

import {
  getItemComments,
  postItemComment,
  updateItemComment,
} from '../features/purchaseOrders/services/purchaseOrder.service';
import { POItem, PurchaseOrder } from '../types';

interface ItemCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetItem: POItem;
  selectedPO: PurchaseOrder;
  onAddActivity: (msg: string, type: string) => void;
  highlightedCommentId?: string | null;
}

export default function ItemCommentModal({
  isOpen,
  onClose,
  targetItem,
  selectedPO,
  onAddActivity,
  highlightedCommentId,
}: ItemCommentModalProps) {
  const { user: currentUser } = useCRM();
  const [tagUsers, setTagUsers] = useState<string[]>([]);

  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [fetchedComments, setFetchedComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentFile, setNewCommentFile] = useState<File | null>(null);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [activeItem, setActiveItem] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveItem(targetItem);
      // Reset tag users so they're re-fetched fresh on each open
      setTagUsers([]);
    }
  }, [isOpen, targetItem]);

  // Mentions
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionHighlightIndex, setMentionHighlightIndex] = useState(0);
  const [taggedUserMap, setTaggedUserMap] = useState<Record<string, string>>(
    {},
  );
  const [isFetchingTagUsers, setIsFetchingTagUsers] = useState(false);

  // Threading / Editing
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
  const [replyToUser, setReplyToUser] = useState<string | null>(null);
  const [replyToText, setReplyToText] = useState<string | null>(null);
  const [collapsedComments, setCollapsedComments] = useState<
    Record<string, boolean>
  >({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState<string>('');

  useEffect(() => {
    if (highlightedCommentId) {
      setTimeout(() => {
        const el = document.getElementById(highlightedCommentId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    } else if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [
    fetchedComments,
    isPostingComment,
    isLoadingComments,
    newCommentFile,
    replyToCommentId,
    highlightedCommentId,
  ]);

  useEffect(() => {
    if (!isOpen || !activeItem?.id) return;

    // Reset typing state when opening or switching items
    setNewCommentText('');
    setNewCommentFile(null);
    setCommentError(null);
    setReplyToCommentId(null);
    setReplyToUser(null);
    setReplyToText(null);
    setEditingCommentId(null);

    setIsLoadingComments(true);
    getItemComments(activeItem.id)
      .then((data) => {
        const rawComments = data?.comments || data || [];
        const mappedComments = rawComments.map((c: any) =>
          parseApiCommentObject(c, activeItem.id),
        );
        setFetchedComments(mappedComments);
      })
      .catch((err) => {
        console.error('Failed to fetch item comments', err);
        setFetchedComments([]);
      })
      .finally(() => setIsLoadingComments(false));
  }, [isOpen, activeItem]);

  const handleCommentTextChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const val = e.target.value;
    setNewCommentText(val);
    setCommentError(null);

    const cursorPosition = e.target.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursorPosition);

    // Find nearest @ that could start a mention (preceded by space or start of string)
    const atPos = textBeforeCursor.lastIndexOf('@');
    if (atPos !== -1) {
      const charBefore = atPos > 0 ? textBeforeCursor[atPos - 1] : ' ';
      if (charBefore === ' ' || charBefore === '\n' || atPos === 0) {
        const mentionTextOrig = textBeforeCursor.slice(atPos + 1);
        const wordsAfterAt = mentionTextOrig.split(/\s+/);

        // Auto-close if following a known tag, or if phrase gets suspiciously long (abandoned)
        const isCompletedTag =
          wordsAfterAt.length > 1 && taggedUserMap[`@${wordsAfterAt[0]}`];
        const isAbandonedSearch = wordsAfterAt.length > 3;

        if (isCompletedTag || isAbandonedSearch) {
          setShowMentionDropdown(false);
          return;
        }

        setShowMentionDropdown(true);
        setMentionFilter(mentionTextOrig.toLowerCase());
        setMentionHighlightIndex(0);
        setMentionIndex(atPos);

        // Lazy-fetch tag users the first time @ is detected
        if (tagUsers.length === 0 && !isFetchingTagUsers) {
          setIsFetchingTagUsers(true);
          getTagUsers()
            .then((users) => setTagUsers(Array.isArray(users) ? users : []))
            .catch((err) => console.error('Failed to fetch tag users', err))
            .finally(() => setIsFetchingTagUsers(false));
        }
        return;
      }
    }
    setShowMentionDropdown(false);
    setMentionHighlightIndex(0);
  };

  const handleSelectMention = (name: string) => {
    // Use name directly as the tag (spaces → underscores for clean tags)
    const tagBase = name.trim().replace(/\s+/g, '_');
    const tag = `@${tagBase}`;

    const textBefore = newCommentText.slice(0, mentionIndex);
    const textAfter = newCommentText.slice(
      mentionIndex + 1 + mentionFilter.length,
    );
    setNewCommentText(`${textBefore}${tag} ${textAfter.trimStart()}`);
    setTaggedUserMap((prev) => ({ ...prev, [tag]: tag }));
    setShowMentionDropdown(false);
    setMentionHighlightIndex(0);
  };

  const getFilteredMentions = (): string[] => {
    const f = mentionFilter.toLowerCase();
    if (!f) return tagUsers;
    return tagUsers.filter(
      (name) =>
        name.toLowerCase().includes(f) ||
        name.toLowerCase().replace(/\s+/g, '_').includes(f),
    );
  };

  const handleCommentKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (!showMentionDropdown) return;
    const filtered = getFilteredMentions();
    if (filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelectMention(filtered[mentionHighlightIndex] ?? filtered[0]);
    } else if (e.key === 'Escape') {
      setShowMentionDropdown(false);
    }
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem?.id) return;
    if (!newCommentText.trim() && !newCommentFile) return;

    let messageText = newCommentText.trim();

    const words = messageText.split(/\s+/);
    const taggedUserIds = words
      .filter((w) => w.startsWith('@'))
      .map((w) => {
        const cleanW = w.replace(/[.,!?;:]+$/, '');
        return taggedUserMap[cleanW];
      })
      .filter(Boolean);

    if (taggedUserIds.length === 0) {
      setCommentError(
        newCommentFile && !newCommentText.trim()
          ? 'Please type a message with an @tag to send this attachment.'
          : 'You must @ tag at least one user to post a comment.',
      );
      return;
    }

    setIsPostingComment(true);

    // Capture reply context before clearing
    const replyId = replyToCommentId;
    setReplyToCommentId(null);
    setReplyToUser(null);
    setReplyToText(null);

    // Build optimistic comment immediately
    const currentUserName = currentUser
      ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() ||
        currentUser.username ||
        currentUser.email
      : 'You';
    const optimisticComment: any = {
      id: `ITEMCOM-OPT-${Date.now()}`,
      itemId: activeItem.id,
      user: currentUserName,
      userId: currentUser?.id,
      message: messageText,
      timestamp: 'Just now',
      parentId: replyId,
      fileUrl: newCommentFile ? URL.createObjectURL(newCommentFile) : null,
      fileName: newCommentFile ? newCommentFile.name : null,
      fileType: newCommentFile ? newCommentFile.type : null,
      children: [],
    };
    setFetchedComments((prev) => [...prev, optimisticComment]);
    setNewCommentText('');
    setNewCommentFile(null);
    setShowMentionDropdown(false);

    const replyIdToSend = replyId;
    postItemComment(
      activeItem.id,
      messageText,
      taggedUserIds,
      replyIdToSend,
      newCommentFile ? [newCommentFile] : undefined,
    )
      .then(() => {
        setNewCommentText('');
        setNewCommentFile(null);
        setShowMentionDropdown(false);
        setReplyToCommentId(null);
        setReplyToUser(null);
        setReplyToText(null);

        toast.success('Comment posted successfully');
        onAddActivity(
          `Added an item comment for ${activeItem.sku}`,
          'Vendor Comment',
        );
        window.dispatchEvent(
          new CustomEvent('item-comment-added', {
            detail: { itemId: activeItem.id },
          }),
        );
        return getItemComments(activeItem.id!);
      })
      .then((data) => {
        const rawComments = data?.comments || data || [];
        const mappedComments = rawComments.map((c: any) =>
          parseApiCommentObject(c, activeItem.id),
        );
        setFetchedComments(mappedComments);
      })
      .catch((err) => {
        console.error(err);
        toast.error('Failed to post comment.');
      })
      .finally(() => setIsPostingComment(false));
  };

  const handleUpdateSubmit = (commentId: string) => {
    if (!editingCommentText.trim() || !activeItem?.id) return;
    const words = editingCommentText.trim().split(/\s+/);
    const taggedUserIds = words
      .filter((w) => w.startsWith('@'))
      .map((w) => {
        const cleanW = w.replace(/[.,!?;:]+$/, '');
        return taggedUserMap[cleanW];
      })
      .filter(Boolean);

    setFetchedComments((prev) =>
      prev.map((c) =>
        c.id === commentId ? { ...c, message: editingCommentText.trim() } : c,
      ),
    );
    setEditingCommentId(null);
    setEditingCommentText('');

    updateItemComment(commentId, editingCommentText.trim(), taggedUserIds)
      .then(() => {
        toast.success('Comment updated successfully');
        onAddActivity(
          `Updated an item comment for ${activeItem.sku}`,
          'Vendor Comment',
        );
        return getItemComments(activeItem.id!);
      })
      .then((data) => {
        const rawComments = data?.comments || data || [];
        const mappedComments = rawComments.map((c: any) =>
          parseApiCommentObject(c, activeItem.id),
        );
        setFetchedComments(mappedComments);
      })
      .catch((err) => {
        console.error(err);
        toast.error('Failed to update comment.');
      });
  };

  const buildTree = (comments: any[]) => {
    const commentMap: Record<string, any> = {};
    const roots: any[] = [];
    comments.forEach((c) => (commentMap[c.id] = { ...c, children: [] }));
    comments.forEach((c) => {
      if (c.parentId && commentMap[c.parentId]) {
        commentMap[c.parentId].children.push(commentMap[c.id]);
      } else {
        roots.push(commentMap[c.id]);
      }
    });
    return roots;
  };

  const sortNodes = (nodes: any[]) => {
    return nodes.sort((a, b) => {
      if (a.timestamp === 'Just now') return 1;
      if (b.timestamp === 'Just now') return -1;
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
  };

  const renderCommentTree = (node: any, depth = 0): React.ReactNode => {
    const isMeStr = (node.user || '').toLowerCase();
    const isMe =
      (currentUser && String(node.userId) === String(currentUser.id)) ||
      (currentUser &&
        isMeStr ===
          `${currentUser.first_name || ''} ${currentUser.last_name || ''}`
            .trim()
            .toLowerCase()) ||
      (currentUser &&
        isMeStr === String(currentUser.username || '').toLowerCase()) ||
      (currentUser &&
        isMeStr === String(currentUser.email || '').toLowerCase()) ||
      isMeStr === 'sourcing lead (you)';
    const isCollapsed = collapsedComments[node.id] || false;

    return (
      <div
        key={node.id}
        id={node.id}
        className={`relative mb-4 flex scroll-mt-20 flex-col ${
          highlightedCommentId === node.id
            ? 'rounded-xl p-1 ring-2 ring-red-500 transition-all duration-1000 ring-inset'
            : ''
        }`}
      >
        <div className="group relative flex items-start gap-3 transition-colors">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-100 text-xs font-bold shadow-sm ${isMe ? 'bg-mc-black text-mc-white' : 'bg-slate-50 text-slate-700'}`}
          >
            {(node.user[0] || 'U').toUpperCase()}
          </div>
          <div
            className={`flex min-w-0 flex-1 flex-col rounded-2xl border p-3 ${isMe ? 'border-mc-beige-dark bg-mc-beige-light/30 shadow-sm' : 'border-slate-100/80 bg-white shadow-xs'}`}
          >
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-bold text-slate-800">
                {node.user}
              </span>
              <span className="text-[10px] font-medium whitespace-nowrap text-slate-400">
                {node.timestamp}
              </span>
              {!isMe && node.role && (
                <span className="rounded-sm border border-slate-100 bg-slate-50 px-1 py-0.5 text-[8px] font-bold text-slate-500 uppercase">
                  {node.role}
                </span>
              )}
            </div>

            {editingCommentId === node.id ? (
              <div className="mt-1 flex w-full flex-col gap-2">
                <textarea
                  value={editingCommentText}
                  onChange={(e) => setEditingCommentText(e.target.value)}
                  className="border-mc-beige-dark focus:border-mc-black focus:ring-mc-black w-full rounded border bg-white p-2 text-[13px] text-slate-800 focus:ring-1 focus:outline-hidden"
                  rows={2}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCommentId(null);
                      setEditingCommentText('');
                    }}
                    className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateSubmit(node.id)}
                    className="bg-mc-black rounded px-3 py-1 text-[11px] font-semibold text-white hover:bg-black"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[13px] leading-relaxed break-words whitespace-pre-wrap text-slate-600">
                {node.message
                  .split(/(@[\w.-]+)/g)
                  .map((part: string, i: number) =>
                    part.startsWith('@') ? (
                      <span key={i} className="text-mc-gold font-bold">
                        {part}
                      </span>
                    ) : (
                      part
                    ),
                  )}
              </p>
            )}

            {node.fileUrl && (
              <div className="mt-2.5">
                {(() => {
                  const isOptimistic = String(node.id).includes('OPT-');
                  const isImage =
                    node.fileType?.startsWith('image/') ||
                    node.fileUrl.match(
                      /\.(jpeg|jpg|gif|png|webp|bmp)(\?.*)?$/i,
                    ) ||
                    node.fileUrl.startsWith('blob:');

                  if (isImage) {
                    return (
                      <button
                        type="button"
                        onClick={() =>
                          !isOptimistic && setPreviewImage(node.fileUrl)
                        }
                        className={`relative focus:outline-hidden ${isOptimistic ? 'cursor-not-allowed' : ''}`}
                      >
                        <img
                          src={node.fileUrl}
                          alt="Attachment"
                          className="h-48 w-64 rounded-xl object-cover drop-shadow-sm transition-transform hover:scale-[1.02]"
                          onLoad={() => {
                            messagesEndRef.current?.scrollIntoView({
                              behavior: 'smooth',
                            });
                          }}
                        />
                        {isOptimistic && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-900/40 backdrop-blur-[2px]">
                            <div className="flex flex-col items-center gap-2">
                              <Loader2 className="h-6 w-6 animate-spin text-white" />
                              <span className="text-[10px] font-bold tracking-wider text-white uppercase shadow-sm">
                                Uploading...
                              </span>
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  } else {
                    return (
                      <div className="relative w-max">
                        <a
                          href={isOptimistic ? '#' : node.fileUrl}
                          target={isOptimistic ? undefined : '_blank'}
                          rel="noreferrer"
                          className={`flex w-max items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600 transition-colors ${isOptimistic ? 'pointer-events-none opacity-70' : 'hover:bg-slate-100'}`}
                        >
                          <div className="rounded-full bg-slate-200 p-1.5 text-slate-500">
                            <Paperclip className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold">
                              Attachment
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {node.fileName || 'Document'}
                            </span>
                          </div>
                        </a>
                        {isOptimistic && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-slate-800/40 backdrop-blur-[1px]">
                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                          </div>
                        )}
                      </div>
                    );
                  }
                })()}
              </div>
            )}

            <div className="mt-2 flex items-center gap-4">
              {node.fileUrl &&
                !(
                  node.fileType?.startsWith('image/') ||
                  node.fileUrl.match(
                    /\.(jpeg|jpg|gif|png|webp|bmp)(\?.*)?$/i,
                  ) ||
                  node.fileUrl.startsWith('blob:')
                ) && (
                  <a
                    href={node.fileUrl}
                    download={node.fileName || 'Attachment'}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-mc-black flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 opacity-100 transition"
                  >
                    <Download className="h-3 w-3" /> Download
                  </a>
                )}
              {isMe && editingCommentId !== node.id && !node.fileUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCommentId(node.id);
                    setEditingCommentText(node.message);
                  }}
                  className="hover:text-mc-black flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 opacity-100 transition"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
              )}
              {!isMe && (
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
              )}
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

        {!isCollapsed && node.children.length > 0 && (
          <div className="relative mt-3 ml-4 flex flex-col border-l-[1.5px] border-slate-200/80 pl-4 sm:ml-6 sm:pl-6">
            {sortNodes(node.children).map((child: any) =>
              renderCommentTree(child, depth + 1),
            )}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;
  const rootNodes = buildTree(fetchedComments);

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 flex justify-center overflow-hidden bg-slate-900/60 p-4 backdrop-blur-xs sm:p-6"
        onClick={onClose}
      >
        <div
          className="animate-fadeInUpBig flex h-full w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex shrink-0 items-start justify-between rounded-t-2xl border-b border-slate-100 bg-slate-50/50 px-6 py-4">
            <div className="relative w-full flex-1">
              <h2 className="mb-2 text-lg font-bold text-slate-800">
                SKU Comments
              </h2>
              <div className="max-w-md truncate text-sm font-medium text-slate-600">
                {activeItem?.sku} -{' '}
                {activeItem?.name || activeItem?.product_name} (Qty:{' '}
                {activeItem?.qty ||
                  activeItem?.orderedQty ||
                  activeItem?.quantity}
                )
              </div>
            </div>
            <button
              onClick={onClose}
              className="ml-4 flex-shrink-0 rounded-full p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="custom-scrollbar flex-1 overflow-y-auto bg-slate-50 p-6">
            <div className="flex flex-col gap-1">
              {isLoadingComments ? (
                <div className="flex items-center justify-center py-10">
                  <span className="text-sm font-medium text-slate-400">
                    Loading comments...
                  </span>
                </div>
              ) : rootNodes.length > 0 ? (
                rootNodes.map((node) => renderCommentTree(node, 0))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <MessageSquare className="mb-2 h-8 w-8 opacity-20" />
                  <p className="text-sm">No comments on this item yet.</p>
                </div>
              )}
              <div ref={messagesEndRef} className="h-1 shrink-0" />
            </div>
          </div>

          {/* Footer Form */}
          <div className="shrink-0 border-t border-slate-200 bg-white p-4">
            <form
              onSubmit={handlePostComment}
              className="relative flex flex-col gap-2"
            >
              {replyToCommentId && (
                <div className="relative mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Reply className="text-mc-black h-3.5 w-3.5" />
                    <span className="text-xs font-semibold text-slate-600">
                      Replying to {replyToUser}:
                    </span>
                    <span className="max-w-[200px] truncate text-xs text-slate-400">
                      "{replyToText}"
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyToCommentId(null);
                      setReplyToUser(null);
                      setReplyToText(null);
                    }}
                    className="p-1 text-slate-400 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <div className="flex w-full items-end gap-3">
                <div className="min-w-0 flex-1 flex-col">
                  {newCommentFile && (
                    <div className="bg-mc-black relative mb-3 flex w-full max-w-sm flex-col rounded-2xl p-3 shadow-lg">
                      <button
                        type="button"
                        onClick={() => setNewCommentFile(null)}
                        className="absolute top-4 right-4 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      {newCommentFile.type.startsWith('image/') ? (
                        <div className="bg-mc-gray-dark relative flex h-48 w-full items-center justify-center overflow-hidden rounded-xl">
                          <img
                            src={URL.createObjectURL(newCommentFile)}
                            alt="Preview"
                            className="h-full w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="bg-mc-gray-dark flex h-48 w-full flex-col items-center justify-center rounded-xl">
                          <Paperclip className="text-mc-gray-soft mb-2 h-10 w-10" />
                          <span className="bg-mc-gray-soft text-mc-white rounded-md px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase shadow-xs">
                            {newCommentFile.name.split('.').pop()}
                          </span>
                        </div>
                      )}
                      <div className="bg-mc-gray-dark text-mc-white mt-3 w-full truncate rounded-lg px-3 py-2 text-center text-[13px] font-semibold">
                        {newCommentFile.name}{' '}
                        <span className="font-normal text-white/50">
                          ({(newCommentFile.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                    </div>
                  )}
                  {/* Dropdown anchored to the input row only */}
                  <div className="relative w-full">
                    {showMentionDropdown && (
                      <div className="absolute bottom-full left-0 z-50 mb-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
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

                            return filtered.map((name: string, idx: number) => {
                              const initial = (name[0] || 'U').toUpperCase();
                              const isHighlighted =
                                idx === mentionHighlightIndex;
                              return (
                                <button
                                  key={name}
                                  type="button"
                                  onClick={() => handleSelectMention(name)}
                                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition ${isHighlighted ? 'bg-mc-gold/10 border-mc-gold border-l-2' : 'hover:bg-slate-50'}`}
                                >
                                  <div
                                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-bold ${isHighlighted ? 'bg-mc-gold text-white' : 'text-mc-black bg-slate-200'}`}
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
                      placeholder="Type a message... (Use @ to tag)"
                      value={newCommentText}
                      onChange={handleCommentTextChange}
                      onKeyDown={handleCommentKeyDown}
                      className={`focus:border-mc-black w-full resize-none rounded-lg border ${commentError ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} px-3 py-2 pr-10 text-[13px] transition focus:bg-white focus:outline-hidden`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        document
                          .getElementById('item-comment-attachment-input')
                          ?.click()
                      }
                      className="absolute top-[5px] right-2 p-1 font-bold text-slate-400 transition hover:text-slate-700"
                      title="Attach file or image"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                  </div>
                  {commentError && (
                    <p className="animate-fadeIn mt-1 text-[11px] font-bold text-rose-500">
                      {commentError}
                    </p>
                  )}
                  <input
                    type="file"
                    id="item-comment-attachment-input"
                    className="hidden"
                    accept=".jpeg,.jpg,.png,.gif,.webp,.pdf,.doc,.docx,.csv,.xls,.xlsx"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const file = e.target.files[0];
                        const isAllowedExt = file.name.match(
                          /\.(jpeg|jpg|png|gif|webp|pdf|doc|docx|csv|xls|xlsx)$/i,
                        );
                        if (!isAllowedExt) {
                          toast.error(
                            'Invalid file type. Only Images, PDFs, Word, Excel, and CSVs are allowed.',
                          );
                          e.target.value = '';
                          return;
                        }
                        const maxSizeInBytes = 5 * 1024 * 1024;
                        if (file.size > maxSizeInBytes) {
                          toast.error(
                            'File exceeds the 5MB limits. Please upload a smaller file.',
                          );
                          e.target.value = '';
                          return;
                        }
                        setNewCommentFile(file);
                      }
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={
                    isPostingComment ||
                    (!newCommentText.trim() && !newCommentFile)
                  }
                  className="bg-mc-black flex h-[42px] shrink-0 items-center gap-2 rounded-xl px-5 py-2 text-[13px] font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isPostingComment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Comment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Full Screen Image Preview Lightbox */}
      {previewImage && (
        <div
          className="animate-fadeIn fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 sm:p-8"
          onClick={() => setPreviewImage(null)}
        >
          <button
            type="button"
            className="fixed top-4 right-4 z-[10000] rounded-full bg-black/50 p-2 text-white/70 backdrop-blur-md transition hover:bg-black/80 hover:text-white md:top-6 md:right-6"
            onClick={() => setPreviewImage(null)}
          >
            <X className="h-6 w-6 md:h-8 md:w-8" />
          </button>
          <div className="relative flex max-h-full max-w-5xl flex-col items-center">
            <img
              src={previewImage}
              alt="Preview"
              className="animate-zoomIn max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="mt-4 flex flex-col items-center gap-2 px-2 text-center">
              <p className="rounded-full bg-black/40 px-3 py-1.5 text-[11px] font-medium text-white/90 drop-shadow-md md:px-4 md:py-2 md:text-sm">
                💡 Right-Click (or long-press) the image and select{' '}
                <strong>"Save Image As..."</strong> to download.
              </p>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
