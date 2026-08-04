import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  X,
  Send,
  Reply,
  ChevronUp,
  MessageSquare,
  Pencil,
  Loader2,
} from 'lucide-react';
import { useCRM } from '../hooks/useCRM';
import { User } from '../services/user.service';
import { toast } from 'react-toastify';

const formatUtcTimestamp = (ts: any) => {
  if (!ts) return new Date().toISOString().slice(0, 16).replace('T', ' ');
  const d = new Date(ts);
  return isNaN(d.getTime())
    ? ts
    : d.toISOString().slice(0, 16).replace('T', ' ');
};
import {
  getItemComments,
  postItemComment,
  updateItemComment,
} from '../services/purchaseOrder.service';
import { POItem, PurchaseOrder } from '../types';

interface ItemCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetItem: POItem;
  selectedPO: PurchaseOrder;
  onAddActivity: (msg: string, type: string) => void;
}

export default function ItemCommentModal({
  isOpen,
  onClose,
  targetItem,
  selectedPO,
  onAddActivity,
}: ItemCommentModalProps) {
  const { user: currentUser } = useCRM();
  const reduxUsers = useSelector((state: any) => state.users?.list || []);

  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [fetchedComments, setFetchedComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState('');

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
        const mappedComments = rawComments.map((c: any) => ({
          id: String(c.id || `ITEMCOM-${Math.random()}`),
          itemId: activeItem.id,
          user: c.user_name || c.user || c.author || 'User',
          userId: c.user_id || c.author_id || null,
          role: c.role || 'Administrator',
          message: c.comment || c.message || c.text || '',
          timestamp: formatUtcTimestamp(c.created_at || c.timestamp),
          parentId: c.parent_id ? String(c.parent_id) : null,
        }));
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
    if (!activeItem?.id || !newCommentText.trim()) return;

    const messageText = newCommentText.trim();
    const words = messageText.split(/\s+/);
    const taggedUserIds = words
      .filter((w) => w.startsWith('@'))
      .map((w) => taggedUserMap[w])
      .filter(Boolean);

    // Removed optimistic update to match exactly the POManagement flow and preserve strict tree integrity
    setNewCommentText('');
    setShowMentionDropdown(false);
    const replyId = replyToCommentId;
    setReplyToCommentId(null);
    setReplyToUser(null);
    setReplyToText(null);

    postItemComment(activeItem.id, messageText, taggedUserIds, replyId)
      .then(() => {
        toast.success('Comment posted successfully');
        onAddActivity(
          `Added an item comment for ${activeItem.sku}`,
          'Vendor Comment',
        );
        // Notify the main PO grid to update its comment count for this item!
        window.dispatchEvent(
          new CustomEvent('item-comment-added', {
            detail: { itemId: activeItem.id },
          }),
        );
        return getItemComments(activeItem.id!);
      })
      .then((data) => {
        const rawComments = data?.comments || data || [];
        const mappedComments = rawComments.map((c: any) => ({
          id: String(c.id || `ITEMCOM-${Math.random()}`),
          itemId: activeItem.id,
          user: c.user_name || c.user || c.author || 'User',
          userId: c.user_id || c.author_id || null,
          role: c.role || 'Administrator',
          message: c.comment || c.message || c.text || '',
          timestamp: formatUtcTimestamp(c.created_at || c.timestamp),
          parentId: c.parent_id ? String(c.parent_id) : null,
        }));
        setFetchedComments(mappedComments);
      })
      .catch((err) => {
        console.error(err);
        toast.error('Failed to post comment.');
      });
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
        const mappedComments = rawComments.map((c: any) => ({
          id: String(c.id || `ITEMCOM-${Math.random()}`),
          itemId: activeItem.id,
          user: c.user_name || c.user || c.author || 'User',
          userId: c.user_id || c.author_id || null,
          role: c.role || 'Administrator',
          message: c.comment || c.message || c.text || '',
          timestamp: formatUtcTimestamp(c.created_at || c.timestamp),
          parentId: c.parent_id ? String(c.parent_id) : null,
        }));
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
      <div key={node.id} className="flex flex-col relative mb-4">
        <div className="flex gap-3 group relative transition-colors items-start">
          <div
            className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-sm border border-slate-100 ${isMe ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-700'}`}
          >
            {(node.user[0] || 'U').toUpperCase()}
          </div>
          <div
            className={`flex-1 min-w-0 flex flex-col p-3 rounded-2xl border ${isMe ? 'bg-indigo-50/30 border-indigo-100 shadow-sm' : 'bg-white border-slate-100/80 shadow-xs'}`}
          >
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-bold text-[13px] text-slate-800">
                {node.user}
              </span>
              <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                {node.timestamp}
              </span>
              {!isMe && node.role && (
                <span className="text-[8px] uppercase font-bold text-slate-500 bg-slate-50 border border-slate-100 px-1 py-0.5 rounded-sm">
                  {node.role}
                </span>
              )}
            </div>

            {editingCommentId === node.id ? (
              <div className="flex flex-col gap-2 w-full mt-1">
                <textarea
                  value={editingCommentText}
                  onChange={(e) => setEditingCommentText(e.target.value)}
                  className="w-full text-[13px] text-slate-800 p-2 rounded border border-indigo-200 bg-white focus:outline-hidden focus:border-indigo-400"
                  rows={2}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCommentId(null);
                      setEditingCommentText('');
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-700 px-2 py-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateSubmit(node.id)}
                    className="text-[11px] bg-indigo-600 text-white font-semibold rounded px-3 py-1 hover:bg-indigo-700"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-slate-600 leading-relaxed break-words whitespace-pre-wrap">
                {node.message
                  .split(/(@[\w.-]+)/g)
                  .map((part: string, i: number) =>
                    part.startsWith('@') ? (
                      <span key={i} className="font-bold text-indigo-600">
                        {part}
                      </span>
                    ) : (
                      part
                    ),
                  )}
              </p>
            )}

            <div className="flex items-center gap-4 mt-2">
              {isMe && editingCommentId !== node.id && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCommentId(node.id);
                    setEditingCommentText(node.message);
                  }}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 transition opacity-100"
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
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 transition opacity-100"
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
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-indigo-600 transition"
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
          <div className="mt-3 ml-4 sm:ml-6 pl-4 sm:pl-6 border-l-[1.5px] border-slate-200/80 flex flex-col relative">
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

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6 overflow-hidden">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col h-full animate-fadeInUpBig">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between shrink-0 bg-slate-50/50 rounded-t-2xl">
          <div className="flex-1 w-full relative">
            <h2 className="text-lg font-bold text-slate-800 mb-2">
              SKU Comments
            </h2>
            <div className="relative max-w-sm">
              <select
                value={activeItem?.id || activeItem?.sku || ''}
                onChange={(e) => {
                  const sel = selectedPO?.items?.find(
                    (i: any) => (i.id || i.sku) === e.target.value,
                  );
                  if (sel) setActiveItem({ ...sel, id: sel.id || sel.sku });
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 font-medium text-slate-700 pointer-events-auto cursor-pointer shadow-xs truncate"
              >
                {selectedPO?.items?.map((item: any) => {
                  const itemId = item.id || item.sku;
                  return (
                    <option key={itemId} value={itemId}>
                      {item.sku} - {item.name || item.product_name} (Qty:{' '}
                      {item.qty || item.orderedQty || item.quantity})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 ml-4 flex-shrink-0 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 pb-2">
          {isLoadingComments ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin mb-4 text-indigo-500" />
              <p className="text-sm">Loading discussion...</p>
            </div>
          ) : rootNodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <MessageSquare className="h-10 w-10 mb-4 opacity-20" />
              <p className="text-sm font-medium">
                No comments available for this SKU.
              </p>
              <p className="text-xs mt-1">
                Be the first to start the discussion for this item.
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {sortNodes(rootNodes).map((root) => renderCommentTree(root, 0))}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
          <form
            onSubmit={handlePostComment}
            className="flex flex-col gap-2 relative"
          >
            {replyToUser && (
              <div className="flex flex-col bg-slate-100 rounded-lg p-2.5 border-l-4 border-l-indigo-500 mb-1 animate-fadeIn relative group overflow-hidden">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-extrabold text-indigo-700">
                    {replyToUser}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyToCommentId(null);
                      setReplyToUser(null);
                      setReplyToText(null);
                    }}
                    className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded p-1 transition"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-1 italic pr-6 group-hover:line-clamp-2 transition-all">
                  {replyToText
                    ?.split(/(@[\w.-]+)/g)
                    .map((part: string, i: number) =>
                      part.startsWith('@') ? (
                        <span
                          key={i}
                          className="font-bold text-indigo-500 not-italic"
                        >
                          {part}
                        </span>
                      ) : (
                        part
                      ),
                    )}
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                {showMentionDropdown && (
                  <div className="absolute bottom-full left-0 mb-1 w-64 bg-white border border-slate-200 shadow-xl rounded-xl z-50 flex flex-col animate-fadeIn">
                    <div className="max-h-48 overflow-y-auto py-1">
                      {(() => {
                        let taggableUsers = [...(reduxUsers || [])];
                        if (selectedPO?.vendorName) {
                          taggableUsers.unshift({
                            id: selectedPO.vendorId || 'vendor',
                            full_name: selectedPO.vendorName,
                            username: selectedPO.vendorName.replace(/\s+/g, ''),
                            email: 'Vendor (Owner)',
                          });
                        }
                        if (currentUser) {
                          taggableUsers = taggableUsers.filter((u) => {
                            if (currentUser.id && u.id === currentUser.id)
                              return false;
                            if (
                              currentUser.email &&
                              u.email === currentUser.email
                            )
                              return false;
                            if (
                              currentUser.username &&
                              u.username === currentUser.username
                            )
                              return false;
                            return true;
                          });
                        }

                        const filtered = taggableUsers.filter((u) => {
                          const searchTargets = [
                            (u.full_name || '').toLowerCase(),
                            (u.username || '').toLowerCase(),
                            (u.first_name || '').toLowerCase(),
                            (u.last_name || '').toLowerCase(),
                            (u.email || '').toLowerCase(),
                          ];
                          return (
                            !mentionFilter ||
                            searchTargets.some((t) => t.includes(mentionFilter))
                          );
                        });

                        if (filtered.length === 0) {
                          return (
                            <div className="px-3 py-2 text-xs text-slate-400">
                              No users found
                            </div>
                          );
                        }

                        return filtered.map((u) => {
                          const displayName =
                            u.full_name ||
                            u.username ||
                            `${u.first_name || ''} ${u.last_name || ''}`.trim() ||
                            u.email;
                          const initial = (displayName[0] || 'U').toUpperCase();
                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => handleSelectMention(u)}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 transition"
                            >
                              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                                {initial}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-slate-700 truncate">
                                  {displayName}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
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
                <input
                  type="text"
                  placeholder="Type a message... (Use @ to tag)"
                  value={newCommentText}
                  onChange={handleCommentTextChange}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white transition"
                />
              </div>
              <button
                type="submit"
                disabled={!newCommentText.trim()}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
