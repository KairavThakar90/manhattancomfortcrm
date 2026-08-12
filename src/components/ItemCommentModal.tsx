import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from 'react-redux';
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
import { User } from '../features/users/services/user.service';
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
  const reduxUsers = useSelector((state: any) => state.users?.list || []);

  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [fetchedComments, setFetchedComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentFile, setNewCommentFile] = useState<File | null>(null);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [activeItem, setActiveItem] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveItem(targetItem);
    }
  }, [isOpen, targetItem]);

  // Mentions
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [taggedUserMap, setTaggedUserMap] = useState<Record<string, string>>(
    {},
  );

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
    if (!isOpen || !activeItem?.id) return;
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

  const handleCommentTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewCommentText(val);

    const cursorPosition = e.target.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursorPosition);
    const words = textBeforeCursor.split(/\s+/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith('@')) {
      setShowMentionDropdown(true);
      setMentionFilter(lastWord.slice(1).toLowerCase());
      const wordStartIndex = textBeforeCursor.lastIndexOf(lastWord);
      setMentionIndex(wordStartIndex);
    } else {
      setShowMentionDropdown(false);
    }
  };

  const handleSelectMention = (user: User | any) => {
    const username =
      user.full_name ||
      user.username ||
      `${user.first_name || ''}_${user.last_name || ''}`.trim() ||
      user.email;
    const tag = `@${username.replace(/\s+/g, '_')}`;

    const textBefore = newCommentText.slice(0, mentionIndex);
    const textAfter = newCommentText.slice(mentionIndex).replace(/^\S+/, '');

    setNewCommentText(`${textBefore}${tag} ${textAfter}`);
    setTaggedUserMap((prev) => ({ ...prev, [tag]: user.id }));
    setShowMentionDropdown(false);
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem?.id) return;
    if (!newCommentText.trim() && !newCommentFile) return;

    let messageText = newCommentText.trim();
    if (newCommentFile) {
      messageText += messageText
        ? `\n\n(Attached: ${newCommentFile.name})`
        : `(Attached: ${newCommentFile.name})`;
    }

    const words = messageText.split(/\s+/);
    const taggedUserIds = words
      .filter((w) => w.startsWith('@'))
      .map((w) => taggedUserMap[w])
      .filter(Boolean);

    setIsPostingComment(true);

    const replyId = replyToCommentId;
    postItemComment(
      activeItem.id,
      messageText,
      taggedUserIds,
      replyId,
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
      .map((w) => taggedUserMap[w])
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
      isMeStr === 'sourcing lead (you)' ||
      (currentUser &&
        (isMeStr ===
          `${currentUser.first_name || ''} ${currentUser.last_name || ''}`
            .trim()
            .toLowerCase() ||
          isMeStr === String(currentUser.username || '').toLowerCase() ||
          isMeStr === String(currentUser.email || '').toLowerCase() ||
          isMeStr === String(currentUser.first_name || '').toLowerCase() ||
          (currentUser.id && String(node.userId) === String(currentUser.id))));
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
                {node.fileType?.startsWith('image/') ||
                node.fileUrl.match(/\.(jpeg|jpg|gif|png|webp|bmp)(\?.*)?$/i) ||
                node.fileUrl.startsWith('blob:') ? (
                  <button
                    type="button"
                    onClick={() => setPreviewImage(node.fileUrl)}
                    className="focus:outline-hidden"
                  >
                    <img
                      src={node.fileUrl}
                      alt="Attachment"
                      className="max-h-60 max-w-xs rounded-xl object-contain drop-shadow-sm transition-transform hover:scale-[1.02]"
                    />
                  </button>
                ) : (
                  <a
                    href={node.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-max items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600 transition-colors hover:bg-slate-100"
                  >
                    <div className="rounded-full bg-slate-200 p-1.5 text-slate-500">
                      <Paperclip className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold">Attachment</span>
                      <span className="text-[10px] text-slate-400">
                        {node.fileName || 'Document'}
                      </span>
                    </div>
                  </a>
                )}
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
              <div className="flex items-start gap-3">
                <div className="relative w-full flex-1">
                  {showMentionDropdown && (
                    <div className="absolute bottom-full left-0 mb-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                      <div className="max-h-48 overflow-y-auto py-1">
                        {(() => {
                          const filtered = reduxUsers.filter((u: User) => {
                            const searchTargets = [
                              (u.full_name || '').toLowerCase(),
                              (u.username || '').toLowerCase(),
                              (u.first_name || '').toLowerCase(),
                              (u.last_name || '').toLowerCase(),
                              (u.email || '').toLowerCase(),
                            ];
                            return (
                              !mentionFilter ||
                              searchTargets.some((t) =>
                                t.includes(mentionFilter),
                              )
                            );
                          });

                          if (filtered.length === 0) {
                            return (
                              <div className="px-3 py-2 text-xs text-slate-400">
                                No users found
                              </div>
                            );
                          }

                          return filtered.map((u: User) => {
                            const displayName =
                              u.full_name ||
                              u.username ||
                              `${u.first_name || ''} ${u.last_name || ''}`.trim() ||
                              u.email;
                            const initial = (
                              displayName[0] || 'U'
                            ).toUpperCase();
                            return (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => handleSelectMention(u)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-slate-50"
                              >
                                <div className="text-mc-black flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 font-bold">
                                  {initial}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-semibold text-slate-700">
                                    {displayName}
                                  </div>
                                  <div className="truncate text-[10px] text-slate-400">
                                    {u.email}
                                  </div>
                                </div>
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                  {newCommentFile && (
                    <div className="relative mb-3 flex w-full max-w-sm flex-col rounded-2xl bg-[#0f172a] p-3 shadow-lg">
                      <button
                        type="button"
                        onClick={() => setNewCommentFile(null)}
                        className="absolute top-4 right-4 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/40"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      {newCommentFile.type.startsWith('image/') ? (
                        <div className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-xl bg-black/30">
                          <img
                            src={URL.createObjectURL(newCommentFile)}
                            alt="Preview"
                            className="h-full w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="flex h-48 w-full flex-col items-center justify-center rounded-xl bg-black/20">
                          <Paperclip className="mb-2 h-10 w-10 text-white/50" />
                          <span className="rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-bold tracking-wider text-white uppercase">
                            {newCommentFile.name.split('.').pop()}
                          </span>
                        </div>
                      )}
                      <div className="mt-3 w-full truncate rounded-lg bg-white/5 px-3 py-2 text-center text-[13px] font-semibold text-white/90">
                        {newCommentFile.name}{' '}
                        <span className="font-normal text-white/40">
                          ({(newCommentFile.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="relative w-full">
                    <input
                      type="text"
                      placeholder="Type a message... (Use @ to tag)"
                      value={newCommentText}
                      onChange={handleCommentTextChange}
                      className="focus:border-mc-black w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 pr-10 text-[13px] transition focus:bg-white focus:outline-hidden"
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
                  <input
                    type="file"
                    id="item-comment-attachment-input"
                    className="hidden"
                    accept=".jpeg,.jpg,.png,.gif,.webp,.pdf,.doc,.docx,.csv"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const file = e.target.files[0];
                        const isAllowedExt = file.name.match(
                          /\.(jpeg|jpg|png|gif|webp|pdf|doc|docx|csv)$/i,
                        );
                        if (!isAllowedExt) {
                          toast.error(
                            'Invalid file type. Only Images, PDFs, Word Docs, and CSVs are allowed.',
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
                  className="bg-mc-black flex h-[42px] items-center gap-2 self-end rounded-xl px-5 py-2 text-[13px] font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
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
          className="animate-fadeIn fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative flex max-h-full max-w-5xl flex-col items-center">
            <button
              type="button"
              className="absolute -top-12 right-0 p-2 text-white/70 transition hover:text-white"
              onClick={() => setPreviewImage(null)}
            >
              <X className="h-8 w-8" />
            </button>
            <img
              src={previewImage}
              alt="Preview"
              className="animate-zoomIn max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="mt-4 flex flex-col items-center gap-2">
              <p className="rounded-full bg-black/40 px-4 py-2 text-sm font-medium text-white/90 drop-shadow-md">
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
