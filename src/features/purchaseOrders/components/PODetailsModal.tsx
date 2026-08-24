// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ChevronDown,
  Loader2,
  X,
  Plus,
  Image,
  Paperclip,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Mail,
  FileText,
  Download,
  CheckCircle2,
  MessageSquare,
  Tag,
  LayoutDashboard,
  Truck,
  Settings,
  Phone,
  ExternalLink,
  Send,
  Reply,
  ChevronUp,
  Pencil,
  Trash,
  Copy,
} from 'lucide-react';
import ItemCommentModal from '../../../components/ItemCommentModal';
import { getTagUsers } from '../../users/services/user.service';
import { Tooltip } from 'react-tooltip';
import DataTable from '../../../components/common/DataTable';
import Pagination from '../../../components/common/Pagination';
import { compressImageIfNeeded } from '../../../utils/imageCompression';
import { setPurchaseOrdersList } from '../store/purchaseOrderSlice';
import { exportPurchaseOrderCSV } from '../services/purchaseOrder.service';
import { toast } from 'react-toastify';

// Local copy of the inline qty editor used inside POManagement's item table so this
// modal does not depend on a non-existent shared ./InlineQtyEditor module.
const InlineQtyEditor = ({ item, initialQty, poId, onSave, userRole }: any) => {
  const [val, setVal] = useState(initialQty);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setVal(initialQty);
  }, [initialQty]);

  const handleSave = async (e: any) => {
    e.stopPropagation();
    if (Number(val) === Number(initialQty) || val === '') {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    const resolvedId =
      item.item_id ||
      item.uuid ||
      item.id ||
      item.po_item_id ||
      item.poItemId ||
      item.sku;
    try {
      await onSave(resolvedId, Number(val));
      setIsEditing(false);
    } catch {
      setVal(initialQty);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = (e: any) => {
    e.stopPropagation();
    setVal(initialQty);
    setIsEditing(false);
  };

  const canEdit =
    String(userRole).toLowerCase() === 'administrator' ||
    String(userRole).toLowerCase() === 'office';

  if (!isEditing || !canEdit) {
    return (
      <div
        className="group flex items-center justify-end gap-2"
        onClick={(e) => (canEdit ? e.stopPropagation() : undefined)}
      >
        <span className="font-mono font-medium">
          {Number(initialQty).toLocaleString()}
        </span>
        {canEdit && (
          <button
            title="Edit Ordered Quantity"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="hover:text-mc-black text-slate-300 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-end gap-1.5"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="number"
        value={val}
        autoFocus
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave(e);
          if (e.key === 'Escape') handleCancel(e);
        }}
        className="focus:border-mc-black focus:ring-mc-black w-[60px] rounded border border-slate-200 bg-white px-1.5 py-1 text-right font-mono text-[11px] font-bold text-slate-800 transition focus:ring-1 focus:outline-none"
        min="0"
      />
      <div className="flex gap-1">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-mc-gold rounded px-2 py-1 text-[10px] font-bold text-white shadow-sm transition hover:bg-yellow-600 disabled:opacity-50"
        >
          {isSaving ? '...' : 'Save'}
        </button>
        <button
          onClick={handleCancel}
          disabled={isSaving}
          className="rounded bg-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 shadow-sm transition hover:bg-slate-300 disabled:opacity-50"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};

export function PODetailsModal(props) {
  const {
    selectedPO,
    onSelectPO,
    isCommentOnlyView,
    setIsCommentOnlyView,
    activeDrawerSection,
    setActiveDrawerSection,
    currentUser,
    isVendor,
    allItemsForPO,
    totalItemsCount,
    handleUpdateItemQty,
    tableStyles,
    parseApiCommentObject,
    postPOComment,
    postItemComment,
    isLoadingComments,
    fetchedComments,
    isLoadingSkuComments,
    fetchedSkuComments,
    commentScope,
    setCommentScope,
    selectedSkuId,
    setSelectedSkuId,
    isScopeDropdownOpen,
    setIsScopeDropdownOpen,
    replyingToCommentId,
    setReplyingToCommentId,
    commentText,
    setCommentText,
    uploadFiles,
    handleFileChange,
    handleRemoveFile,
    isSubmittingComment,
    formatFileSize,
    vendorsList,
    handleRemoveItem,
    isDeletingPOItem,
    selectedPOComments,
    detailedPOItems,
    handleStatusFilterChange,
    getPurchaseOrderById,
    toast,
    patchPurchaseOrder,
    updatePOComment,
    updatePOLeadTime,
    selectedSkuIdRef,
    handleToggleComments,
    handleMarkResolved,
    handleDeleteComment,
    handleDeleteCommentAttachment,
    handleCompletePO,
    statusFilter,
    userRole,
    // Additional props required to make this component self-contained when
    // reused outside POManagement (e.g. from ContainerFlowPage). These are
    // additive — POManagement itself never rendered this component before,
    // so nothing that already worked depends on them being absent.
    setFetchedComments,
    setFetchedSkuComments,
    onAddActivity,
    onOpenContainerDetails,
  } = props;

  // ---- Local state that used to live implicitly in POManagement's scope ----
  const dispatch = useDispatch();
  const reduxPurchaseOrders = useSelector((s: any) => s.purchaseOrders?.list);
  const purchaseOrders = reduxPurchaseOrders || [];

  const [leadTimeDays, setLeadTimeDays] = useState<string>(
    selectedPO?.containerLeadTimeDays
      ? String(selectedPO.containerLeadTimeDays)
      : '',
  );
  useEffect(() => {
    setLeadTimeDays(
      selectedPO?.containerLeadTimeDays
        ? String(selectedPO.containerLeadTimeDays)
        : '',
    );
  }, [selectedPO?.id, selectedPO?.containerLeadTimeDays]);

  const itemsTableRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [itemsCurrentPage, setItemsCurrentPage] = useState(1);
  const [itemsPageSize, setItemsPageSize] = useState(10);
  const [isItemsPaginationLoading, setIsItemsPaginationLoading] =
    useState(false);
  useEffect(() => {
    setItemsCurrentPage(1);
  }, [selectedPO?.id]);
  const paginatedItems = (allItemsForPO || []).slice(
    (itemsCurrentPage - 1) * itemsPageSize,
    itemsCurrentPage * itemsPageSize,
  );

  const [collapsedComments, setCollapsedComments] = useState<
    Record<string, boolean>
  >({});
  const [highlightedCommentId] = useState<string | null>(null);
  const [selectedItemForComments, setSelectedItemForComments] =
    useState<any>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [editingCommentFiles, setEditingCommentFiles] = useState<File[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
  const [replyToUser, setReplyToUser] = useState<string | null>(null);
  const [replyToText, setReplyToText] = useState<string | null>(null);

  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentFiles, setNewCommentFiles] = useState<File[]>([]);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    '' | 'Compressing...' | 'Uploading...'
  >('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // ---- @mention tagging (mirrors POManagement's mention engine) ----
  const [tagUsers, setTagUsers] = useState<any[]>([]);
  const [isFetchingTagUsers, setIsFetchingTagUsers] = useState(false);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionHighlightIndex, setMentionHighlightIndex] = useState(0);
  const [taggedUserMap, setTaggedUserMap] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    if (tagUsers.length === 0 && !isFetchingTagUsers) {
      setIsFetchingTagUsers(true);
      getTagUsers()
        .then((users: any) => setTagUsers(Array.isArray(users) ? users : []))
        .catch(() => {})
        .finally(() => setIsFetchingTagUsers(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getFilteredMentions = (): any[] => {
    const f = mentionFilter.toLowerCase();
    if (!f) return tagUsers;
    return tagUsers.filter((u) => {
      const name = typeof u === 'string' ? u : u.name || '';
      return (
        name.toLowerCase().includes(f) ||
        name.toLowerCase().replace(/\s+/g, '_').includes(f)
      );
    });
  };

  const handleSelectMention = (userObj: any) => {
    const name = typeof userObj === 'string' ? userObj : userObj.name || '';
    const id = typeof userObj === 'string' ? userObj : userObj.id || '';
    const tagBase = name.trim().replace(/\s+/g, '_');
    const tag = `@${tagBase}`;

    const textBefore = newCommentText.slice(0, mentionIndex);
    const textAfter = newCommentText.slice(
      mentionIndex + 1 + mentionFilter.length,
    );

    setNewCommentText(`${textBefore}${tag} ${textAfter.trimStart()}`);
    setTaggedUserMap((prev) => ({ ...prev, [tag]: id }));
    setShowMentionDropdown(false);
    setMentionHighlightIndex(0);
  };

  const handleCommentTextChange = (e: any) => {
    const val = e.target.value;
    setNewCommentText(val);
    setCommentError(null);

    const cursorPosition = e.target.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursorPosition);
    const atPos = textBeforeCursor.lastIndexOf('@');
    if (atPos !== -1) {
      const charBefore = atPos > 0 ? textBeforeCursor[atPos - 1] : ' ';
      if (charBefore === ' ' || charBefore === '\n' || atPos === 0) {
        const mentionTextOrig = textBeforeCursor.slice(atPos + 1);
        const wordsAfterAt = mentionTextOrig.split(/\s+/);

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

        if (tagUsers.length === 0 && !isFetchingTagUsers) {
          setIsFetchingTagUsers(true);
          getTagUsers()
            .then((users: any) =>
              setTagUsers(Array.isArray(users) ? users : []),
            )
            .catch((err: any) =>
              console.error('Failed to fetch tag users', err),
            )
            .finally(() => setIsFetchingTagUsers(false));
        }
        return;
      }
    }
    setShowMentionDropdown(false);
    setMentionHighlightIndex(0);
  };

  const handleCommentKeyDown = (e: any) => {
    if (showMentionDropdown) {
      const filtered = getFilteredMentions();
      if (filtered.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setMentionHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
          return;
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setMentionHighlightIndex((i) => Math.max(i - 1, 0));
          return;
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleSelectMention(filtered[mentionHighlightIndex] ?? filtered[0]);
          return;
        } else if (e.key === 'Escape') {
          setShowMentionDropdown(false);
          return;
        }
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePostComment(e);
    }
  };

  // Extract @tagged user ids from a message using taggedUserMap first, then
  // falling back to a name lookup against the fetched tagUsers list.
  const extractTaggedUserIds = (text: string): string[] => {
    const words = text.trim().split(/\s+/);
    return words
      .filter((w) => w.startsWith('@'))
      .map((w) => {
        const cleanW = w.replace(/[.,!?;:]+$/, '');
        if (taggedUserMap[cleanW]) return taggedUserMap[cleanW];
        const found = tagUsers.find((u: any) => {
          const name = typeof u === 'string' ? u : u.name || '';
          const tagBase = name.trim().replace(/\s+/g, '_');
          return `@${tagBase}`.toLowerCase() === cleanW.toLowerCase();
        });
        return found ? (typeof found === 'string' ? found : found.id) : null;
      })
      .filter(Boolean) as string[];
  };

  const forceDownload = async (url: string, filename: string) => {
    const triggerBlobDownload = async (targetUrl: string) => {
      const response = await fetch(targetUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(objectUrl);
      document.body.removeChild(a);
    };
    try {
      await triggerBlobDownload(url);
    } catch (error) {
      try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        await triggerBlobDownload(proxyUrl);
      } catch (proxyError) {
        window.open(url, '_blank');
      }
    }
  };

  // Add a discussion comment (mirrors POManagement's handlePostComment,
  // including its @mention-tagging engine — at least one @tag is required
  // to post, same as POManagement).
  const describeError = (err: any) =>
    err?.response?.data?.detail ||
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    'Comment may not have saved.';

  const handlePostComment = (e: any) => {
    e.preventDefault();
    if (!selectedPO || (!newCommentText.trim() && newCommentFiles.length === 0))
      return;

    const filesToUpload = newCommentFiles;
    const messageText = newCommentText.trim();
    const replyId = replyToCommentId;

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

    const finalFilesToUpload: File[] = [];
    for (const raw of newCommentFiles) {
      if ((raw as any).isCompressed) {
        finalFilesToUpload.push(raw);
      } else {
        const c = await compressImageIfNeeded(raw);
        (c as any).isCompressed = true;
        finalFilesToUpload.push(c);
      }
    }
    setNewCommentFiles(finalFilesToUpload);

    setUploadStatus('Uploading...');

    setReplyToCommentId(null);
    setReplyToUser(null);
    setReplyToText(null);

    // We don't do optimistic appends for files to show proper status flow
    // (Selected -> Compressing -> Uploading -> Uploaded)

    if (commentScope === 'sku' && selectedSkuId) {
      setFetchedSkuComments?.((prev: any[]) => [
        ...(prev || []),
        { ...optimisticComment, itemId: selectedSkuId },
      ]);
      postItemComment(
        selectedSkuId,
        messageText,
        taggedUserIds,
        replyId,
        finalFilesToUpload.length > 0 ? finalFilesToUpload : undefined,
      )
        .then(() => {
          setUploadStatus('');
          setNewCommentText('');
          setNewCommentFiles([]);
          setShowMentionDropdown(false);
          onAddActivity?.(
            `Added discussion comment on SKU (${selectedSkuId})`,
            'Vendor Comment',
          );
          toast.success('Comment posted successfully');
        })
        .catch((err: any) => {
          console.error('Failed to save comment to server:', err);
          setUploadStatus('');
          toast.error(`Failed to post comment: ${describeError(err)}`, {
            autoClose: 4000,
          });
        })
        .finally(() => setIsPostingComment(false));
      return;
    }

    const targetId = String(selectedPO.id).replace(/^PO-/i, '');
    postPOComment(
      targetId,
      messageText,
      taggedUserIds,
      replyId,
      finalFilesToUpload.length > 0 ? finalFilesToUpload : undefined,
    )
      .then(() => {
        setUploadStatus('');
        setNewCommentText('');
        setNewCommentFiles([]);
        setShowMentionDropdown(false);
        onAddActivity?.(
          `Added discussion comment on ${selectedPO.id}`,
          'Vendor Comment',
        );
        toast.success('Comment posted successfully');
        return getPurchaseOrderById(targetId);
      })
      .then((detailData: any) => {
        if (!detailData) return;
        const rawComments = detailData.comments || [];
        const mappedComments = rawComments.map((c: any) =>
          parseApiCommentObject(c, selectedPO.id),
        );
        setFetchedComments?.(mappedComments);
      })
      .catch((err: any) => {
        console.error('Failed to save comment to server:', err);
        setUploadStatus('');
        toast.error(`Failed to post comment: ${describeError(err)}`, {
          autoClose: 4000,
        });
      })
      .finally(() => setIsPostingComment(false));
  };

  const handleUpdateSubmit = async (commentId: string) => {
    if (
      (!editingCommentText.trim() && editingCommentFiles.length === 0) ||
      !selectedPO
    )
      return;

    setUploadStatus('Compressing...');
    setIsPostingComment(true);

    const finalFilesToUpload: File[] = [];
    for (const raw of editingCommentFiles) {
      if ((raw as any).isCompressed) {
        finalFilesToUpload.push(raw);
      } else {
        const c = await compressImageIfNeeded(raw);
        (c as any).isCompressed = true;
        finalFilesToUpload.push(c);
      }
    }
    setEditingCommentFiles(finalFilesToUpload);

    setUploadStatus('Uploading...');

    try {
      await updatePOComment(
        commentId,
        editingCommentText.trim(),
        undefined,
        finalFilesToUpload.length > 0 ? finalFilesToUpload : undefined,
      );
      setUploadStatus('');
      setEditingCommentId(null);
      setEditingCommentFiles([]);
      const targetId = String(selectedPO.id).replace(/^PO-/i, '');
      const detailData = await getPurchaseOrderById(targetId);
      const rawComments = detailData?.comments || [];
      setFetchedComments?.(
        rawComments.map((c: any) => parseApiCommentObject(c, selectedPO.id)),
      );
      toast.success('Comment updated successfully!');
    } catch (err) {
      console.error('Failed to update comment:', err);
      setUploadStatus('');
      toast.error('Failed to update comment.');
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleExportPO = async (po: any) => {
    if (!po) return;
    const toastId = toast.loading('Generating PO Export...');
    try {
      const sellercloudPoId =
        po.sellercloud_po_id || String(po.id).replace(/^PO-/i, '');
      const blob = await exportPurchaseOrderCSV(sellercloudPoId);

      const url = URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `PO-${po.id}_Export.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.update(toastId, {
        render: 'Export successful!',
        type: 'success',
        isLoading: false,
        autoClose: 3000,
      });
    } catch (err) {
      console.error('Failed to export PO:', err);
      toast.update(toastId, {
        render: 'Failed to export PO. Please try again.',
        type: 'error',
        isLoading: false,
        autoClose: 3000,
      });
    }
  };

  const poItemColumns = [
    {
      header: 'SKU',
      accessor: 'sku',
      headerClassName: 'px-3 py-2 w-40',
      className: 'px-3 py-2 min-w-[140px] whitespace-nowrap',
      render: (item: any) => (
        <div
          className="group flex cursor-pointer items-center gap-1.5"
          onClick={(e: any) => {
            e.stopPropagation();
            if (item.sku) {
              navigator.clipboard.writeText(item.sku);
              toast.success('SKU copied to clipboard!');
            }
          }}
        >
          <span className="group-hover:text-mc-gold truncate font-mono font-bold text-slate-500 transition-colors">
            {item.sku}
          </span>
          {item.sku && (
            <Copy className="group-hover:text-mc-gold h-3.5 w-3.5 text-slate-400 transition-colors" />
          )}
        </div>
      ),
    },
    {
      header: 'Product Name',
      accessor: 'name',
      headerClassName: 'px-3 py-2',
      className: 'px-3 py-2 max-w-[150px]',
      render: (item: any) => {
        const productName =
          item.name ||
          item.product_name ||
          item.productName ||
          'Unknown Product';
        return (
          <span
            className="cursor-pointer font-medium text-slate-800"
            title={productName}
          >
            {productName.length > 25
              ? productName.substring(0, 25) + '...'
              : productName}
          </span>
        );
      },
    },
    {
      header: 'Ordered Qty',
      accessor: 'qty',
      headerClassName: 'px-3 py-2 text-right',
      className: 'px-3 py-2 pr-4',
      render: (item: any) => {
        const qty = item.qty_ordered ?? item.qty ?? item.orderedQty ?? 0;
        return (
          <InlineQtyEditor
            item={item}
            initialQty={qty}
            poId={selectedPO?.id}
            onSave={handleUpdateItemQty}
            userRole={userRole}
          />
        );
      },
    },
    {
      header: 'Received Qty',
      accessor: 'receivedQty',
      headerClassName: 'px-3 py-2 text-right',
      className: 'px-3 py-2 text-right font-mono font-medium text-slate-500',
      render: (item: any) =>
        Number(
          item.qty_received ?? item.receivedQty ?? item.received_qty ?? 0,
        ).toLocaleString(),
    },
    {
      header: 'Remaining Qty',
      accessor: 'remainingQty',
      headerClassName: 'px-3 py-2 text-right',
      className: 'px-3 py-2 text-right font-mono font-medium text-slate-500',
      render: (item: any) => {
        const oQty = item.qty_ordered ?? item.qty ?? item.orderedQty ?? 0;
        const rQty =
          item.qty_received ?? item.receivedQty ?? item.received_qty ?? 0;
        const remQty =
          item.qty_remaining !== undefined && item.qty_remaining !== null
            ? item.qty_remaining
            : Math.max(0, oQty - rQty);
        return Number(remQty).toLocaleString();
      },
    },
    {
      header: 'Unit Price',
      accessor: 'unitPrice',
      headerClassName: 'px-3 py-2 text-right',
      className: 'px-3 py-2 text-right font-mono font-medium text-slate-500',
      render: (item: any) =>
        `$${Number(item.unit_price ?? item.unitPrice ?? item.price ?? 0).toFixed(2)}`,
    },
    {
      header: 'Total',
      accessor: 'total',
      headerClassName: 'px-3 py-2 text-right',
      className: 'px-3 py-2 text-right font-mono font-bold text-slate-800',
      render: (item: any) => {
        const oQty = item.qty_ordered ?? item.qty ?? item.orderedQty ?? 0;
        const uPrice = item.unit_price ?? item.unitPrice ?? item.price ?? 0;
        return `$${(Number(oQty) * Number(uPrice)).toFixed(2)}`;
      },
    },
    {
      header: 'Container/Items Count',
      accessor: 'containerInfo',
      headerClassName: 'px-3 py-2 text-left',
      className: 'px-3 py-2 text-left font-mono font-medium text-slate-600',
      render: (item: any) => {
        if (!item.containers || item.containers.length === 0)
          return (
            <span className="rounded-sm border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
              Unassigned
            </span>
          );
        return (
          <div className="flex flex-col gap-0.5">
            {item.containers.map((c: any, idx: number) => {
              const isObj = typeof c === 'object' && c !== null;
              const cDbId = isObj ? c.id : null;
              const cScId = isObj ? c.sellercloud_container_id : null;
              const cName = isObj
                ? c.container_name || c.name || 'Unnamed'
                : String(c);
              const cClickId = isObj
                ? c.id ||
                  c.sellercloud_container_id ||
                  c.name ||
                  c.container_name
                : c;
              const qty = isObj ? (c.qty_in_container ?? 0) : 0;
              const displayId = cScId || cDbId;
              return (
                <button
                  key={idx}
                  onClick={(e: any) => {
                    e.stopPropagation();
                    if (
                      cClickId &&
                      typeof onOpenContainerDetails === 'function'
                    )
                      onOpenContainerDetails(String(cClickId), String(cName));
                  }}
                  className="text-mc-black cursor-pointer rounded-sm bg-slate-100 px-1.5 py-0.5 text-left font-mono text-[11px] whitespace-nowrap transition-colors hover:bg-slate-200"
                >
                  {displayId ? `[${displayId}]` : ''}
                  {cName}({qty})
                </button>
              );
            })}
          </div>
        );
      },
    },
    {
      header: 'Container Details',
      accessor: 'details',
      headerClassName: 'px-3 py-2 text-left',
      className: 'px-3 py-2 text-left font-mono text-[11px] text-slate-500',
      render: (item: any) => {
        if (!item.containers || item.containers.length === 0)
          return <span className="text-[10px] text-slate-400">N/A</span>;
        return (
          <div className="flex flex-col gap-0.5">
            {item.containers.map((c: any, idx: number) => {
              const isObj = typeof c === 'object' && c !== null;
              const rawDate = isObj
                ? c.estimated_arrival_date || c.received_date
                : null;
              const displayDate = rawDate ? rawDate.split('T')[0] : 'TBD';
              const cId = isObj
                ? c.id ||
                  c.sellercloud_container_id ||
                  c.name ||
                  c.container_name
                : c;
              return (
                <button
                  key={idx}
                  onClick={(e: any) => {
                    e.stopPropagation();
                    if (cId && typeof onOpenContainerDetails === 'function') {
                      const passName = isObj
                        ? c.container_name || c.name
                        : undefined;
                      onOpenContainerDetails(String(cId), passName);
                    }
                  }}
                  className="cursor-pointer rounded-sm border border-slate-100 bg-slate-50 px-1.5 py-0.5 text-left whitespace-nowrap transition-colors hover:border-slate-300 hover:bg-slate-100"
                >
                  ETA: <strong className="text-mc-black">{displayDate}</strong>
                </button>
              );
            })}
          </div>
        );
      },
    },
    {
      header: 'Comments',
      accessor: 'id',
      headerClassName: 'px-6 py-4 text-center w-24',
      className: 'px-3 py-2 text-center',
      render: (item: any) => {
        const count =
          parseInt(
            item.commentsCount ||
              item.comments_count ||
              item.commentCount ||
              item.comment_count ||
              item.total_comments ||
              (Array.isArray(item.comments) ? item.comments.length : 0),
            10,
          ) || 0;
        return (
          <button
            onClick={(e: any) => {
              e.stopPropagation();
              if (item.id !== undefined || item.sku) {
                const resolvedId =
                  item.id !== undefined && item.id !== null
                    ? item.id
                    : item.sku;
                setSelectedItemForComments({ ...item, id: resolvedId });
              } else {
                toast.error('This item lacks an identifier.');
              }
            }}
            className={`relative inline-flex rounded-lg border p-1.5 transition ${
              count > 0
                ? 'border-mc-gold/50 bg-mc-gold/10 text-mc-black hover:bg-mc-gold/20 hover:border-mc-gold'
                : 'border-mc-beige-dark bg-mc-white hover:bg-mc-beige-light/50 hover:text-mc-black text-slate-400'
            }`}
            title="Item Comments"
          >
            <MessageSquare className="h-4 w-4" />
            {count > 0 && (
              <span className="absolute -top-2 -right-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-white bg-rose-500 px-1 text-[9px] font-bold text-white shadow-xs">
                {count >= 1000 ? `${Math.floor(count / 1000)}K+` : count}
              </span>
            )}
          </button>
        );
      },
    },
  ];

  const TypedDataTable: any = DataTable;

  return (
    <>
      {/* PO DETAIL OVERLAY MODAL (Rule 2) */}
      {selectedPO &&
        createPortal(
          <div
            onClick={() => {
              onSelectPO(null);
              setIsCommentOnlyView(false);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`rounded-2xl border border-slate-100 bg-white shadow-xl ${isCommentOnlyView ? 'max-w-xl' : 'max-w-5xl'} animate-scaleUp flex h-[85vh] max-h-[85vh] w-full flex-col overflow-hidden`}
            >
              {/* Header */}
              {!isCommentOnlyView && (
                <div className="z-20 flex items-center justify-between border-b border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg border border-slate-200 bg-white px-3 py-1 font-mono text-base font-bold text-slate-900">
                      {selectedPO.id}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">
                        {selectedPO.vendorName}
                      </h3>
                      <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                        Order ID:{' '}
                        {!selectedPO.orderId || selectedPO.orderId === 'N/A'
                          ? 'Stock'
                          : selectedPO.orderId}{' '}
                        • Created: {selectedPO.creationDate}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportPO(selectedPO)}
                      className="text-mc-black mr-2 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold shadow-sm transition hover:bg-slate-200"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Export
                    </button>

                    {selectedPO.sellercloud_link && !isVendor && (
                      <button
                        onClick={() =>
                          window.open(selectedPO.sellercloud_link, '_blank')
                        }
                        className="text-mc-black mr-2 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold shadow-sm transition hover:bg-slate-200"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open in Sellercloud
                      </button>
                    )}

                    <button
                      onClick={() => {
                        onSelectPO(null);
                        setIsCommentOnlyView(false);
                      }}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}

              {isCommentOnlyView && (
                <div className="z-20 flex items-center justify-between border-b border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-slate-800">
                      {selectedPO.id} - Comments
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      onSelectPO(null);
                      setIsCommentOnlyView(false);
                    }}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}

              {/* Tab Selection inside Modal */}
              {!isCommentOnlyView && (
                <div className="z-20 flex border-b border-slate-100 bg-slate-50/50">
                  {(['details', 'comments'] as const)
                    .filter((section) => {
                      if (section === 'comments') {
                        const r = String(userRole).toLowerCase();
                        return (
                          r === 'administrator' ||
                          r === 'admin' ||
                          r === 'office'
                        );
                      }
                      return true;
                    })
                    .map((section) => (
                      <button
                        key={section}
                        onClick={() => setActiveDrawerSection(section)}
                        className={`flex-1 border-b-2 py-3 text-xs font-bold capitalize transition ${
                          activeDrawerSection === section
                            ? 'text-mc-black border-mc-gold bg-white'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {section}
                      </button>
                    ))}
                </div>
              )}

              <div className="flex min-h-0 flex-1 flex-col p-6">
                {/* TAB: DETAILS */}
                {activeDrawerSection === 'details' && !isCommentOnlyView && (
                  <div className="flex min-h-0 flex-1 flex-col">
                    <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 md:grid-cols-3">
                      {/* Stats Panel - Changed from col-span-2 to col-span-3 to occupy full width while Internal Approval Status is temporarily hidden */}
                      <div className="flex min-h-0 flex-col space-y-3 md:col-span-3">
                        <div className="grid shrink-0 grid-cols-6 gap-4">
                          <div className="border-mc-beige-dark bg-mc-white rounded-xl border p-3 shadow-xs">
                            <span className="block text-[10px] font-medium text-slate-400">
                              PO Number
                            </span>
                            <strong className="font-mono text-sm font-bold text-slate-800">
                              {selectedPO.id}
                            </strong>
                          </div>
                          <div className="border-mc-beige-dark bg-mc-white rounded-xl border p-3 shadow-xs">
                            <span className="block text-[10px] font-medium text-slate-400">
                              Order ID
                            </span>
                            <strong className="font-mono text-sm font-bold text-slate-800">
                              {!selectedPO.orderId ||
                              selectedPO.orderId === 'N/A'
                                ? 'Stock'
                                : selectedPO.orderId}
                            </strong>
                          </div>
                          <div className="border-mc-beige-dark bg-mc-white rounded-xl border p-3 shadow-xs">
                            <span className="block text-[10px] font-medium text-slate-400">
                              Ordered Quantity
                            </span>
                            <strong className="font-mono text-sm font-bold text-slate-800">
                              {selectedPO.orderedQty ||
                                allItemsForPO.reduce(
                                  (sum: number, i: any) =>
                                    sum +
                                    (i.qty_ordered ??
                                      i.qty ??
                                      i.orderedQty ??
                                      0),
                                  0,
                                )}{' '}
                              units
                            </strong>
                          </div>
                          <div className="border-mc-beige-dark bg-mc-white rounded-xl border p-3 shadow-xs">
                            <span className="block text-[10px] font-medium text-slate-400">
                              Received Quantity
                            </span>
                            <strong className="font-mono text-sm font-bold text-slate-800">
                              {selectedPO.receivedQty ||
                                allItemsForPO.reduce(
                                  (sum: number, i: any) =>
                                    sum +
                                    (i.qty_received ??
                                      i.receivedQty ??
                                      i.received_qty ??
                                      0),
                                  0,
                                )}{' '}
                              units
                            </strong>
                          </div>
                          <div className="border-mc-beige-dark bg-mc-white rounded-xl border p-3 shadow-xs">
                            <span className="block text-[10px] font-medium text-slate-400">
                              Remaining Quantity
                            </span>
                            <strong className="font-mono text-sm font-bold text-slate-800">
                              {Math.max(
                                0,
                                (selectedPO.orderedQty ||
                                  allItemsForPO.reduce(
                                    (sum: number, i: any) =>
                                      sum +
                                      (i.qty_ordered ??
                                        i.qty ??
                                        i.orderedQty ??
                                        0),
                                    0,
                                  )) -
                                  (selectedPO.receivedQty ||
                                    allItemsForPO.reduce(
                                      (sum: number, i: any) =>
                                        sum +
                                        (i.qty_received ??
                                          i.receivedQty ??
                                          i.received_qty ??
                                          0),
                                      0,
                                    )),
                              )}{' '}
                              units
                            </strong>
                          </div>
                          {String(userRole).toLowerCase() === 'administrator' ||
                          String(userRole).toLowerCase() === 'office' ? (
                            <div className="border-mc-beige-dark bg-mc-white rounded-xl border p-3 shadow-xs">
                              <label className="mb-1 block text-[10px] font-medium text-slate-400">
                                Enter lead days for po order
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  value={leadTimeDays}
                                  onChange={(e) =>
                                    setLeadTimeDays(e.target.value)
                                  }
                                  className="focus:border-mc-black focus:ring-mc-black w-full rounded border border-slate-200 bg-white px-2 py-1 font-mono text-sm font-bold text-slate-800 focus:ring-1 focus:outline-none"
                                  placeholder="0"
                                />
                                <button
                                  onClick={async () => {
                                    if (!leadTimeDays) return;
                                    try {
                                      await updatePOLeadTime(
                                        selectedPO.id.replace(/^PO-/i, ''),
                                        Number(leadTimeDays),
                                      );
                                      const updatedPOs = purchaseOrders.map(
                                        (p: any) =>
                                          p.id === selectedPO.id ||
                                          p.uuid === selectedPO.uuid
                                            ? {
                                                ...p,
                                                containerLeadTimeDays:
                                                  Number(leadTimeDays),
                                              }
                                            : p,
                                      );
                                      dispatch(
                                        setPurchaseOrdersList(updatedPOs),
                                      );
                                      onAddActivity(
                                        `Updated Lead Time for ${selectedPO.id} to ${leadTimeDays} days`,
                                        'PO Updated',
                                      );
                                      toast.success(
                                        'Lead time updated successfully!',
                                      );
                                    } catch (error) {
                                      console.error(error);
                                      toast.error(
                                        'Failed to update lead time.',
                                      );
                                    }
                                  }}
                                  className="bg-mc-gold text-mc-black hover:bg-mc-gold/80 rounded px-3 py-1 text-xs font-bold whitespace-nowrap transition-colors hover:shadow-sm"
                                >
                                  {selectedPO.containerLeadTimeDays
                                    ? 'Update'
                                    : 'Save'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="border-mc-beige-dark bg-mc-white rounded-xl border p-3 shadow-xs">
                              <span className="block text-[10px] font-medium text-slate-400">
                                Lead Days
                              </span>
                              <strong className="font-mono text-sm font-bold text-slate-800">
                                {selectedPO.containerLeadTimeDays || 0} days
                              </strong>
                            </div>
                          )}
                          {/* <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-medium block">
                            Container IDs
                          </span>
                          <strong className="text-xs font-bold text-mc-black font-mono block truncate" title={selectedPO.containerNames?.join(', ') || selectedPO.container || 'Awaiting Vessel Booking'}>
                            {selectedPO.containerNames && selectedPO.containerNames.length > 0 
                               ? selectedPO.containerNames.join(', ') 
                               : selectedPO.container || 'Awaiting Vessel Booking'}
                          </strong>
                        </div>
                        <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-medium block">
                            Delivery ETA
                          </span>
                          <strong className="text-sm font-bold text-slate-800 font-mono">
                            {selectedPO.expected_delivery_date || selectedPO.eta || 'N/A'}
                          </strong>
                        </div> */}
                        </div>
                        <div className="border-mc-beige-dark bg-mc-white mt-3 flex min-h-0 flex-1 flex-col rounded-xl border p-4 shadow-sm">
                          <h5 className="text-mc-black mb-3 shrink-0 text-xs font-extrabold tracking-wider uppercase">
                            Item Specifications (Products)
                          </h5>
                          <TypedDataTable
                            columns={poItemColumns.filter((c) => {
                              if (c.header === 'Comments') {
                                const r = String(userRole).toLowerCase();
                                return (
                                  r === 'administrator' ||
                                  r === 'admin' ||
                                  r === 'office'
                                );
                              }
                              return true;
                            })}
                            data={paginatedItems}
                            keyField="sku"
                            isLoading={
                              isLoadingComments || isItemsPaginationLoading
                            }
                            containerClassName="flex-1 flex flex-col min-h-0 rounded-xl border border-mc-beige-dark bg-mc-white w-full overflow-hidden"
                            tableWrapperClassName="overflow-auto flex-1 custom-scrollbar scroll-smooth"
                            tableWrapperRef={itemsTableRef}
                            defaultThClassName="px-6 py-3 bg-transparent"
                            theadClassName="bg-mc-beige-light border-b border-mc-beige-dark text-mc-black uppercase tracking-widest font-extrabold text-[10px] sticky top-0 z-10"
                            tableClassName="w-full min-w-max whitespace-nowrap text-left text-xs border-collapse"
                            tbodyClassName="divide-y divide-mc-beige-dark/40 text-mc-black"
                            trClassName={(item: any) =>
                              `transition ${Math.max(0, (item.qty || 0) - (item.receivedQty || 0)) > 0 ? 'bg-mc-beige-light/30 hover:bg-mc-gold/5 text-mc-black' : 'bg-mc-white hover:bg-mc-beige-light/30'}`
                            }
                            emptyMessage="No items specified for this purchase order."
                          />

                          {totalItemsCount > 5 && (
                            <div className="border-mc-beige-dark bg-mc-white mt-3 rounded-xl border p-1 shadow-sm">
                              <Pagination
                                currentPage={itemsCurrentPage}
                                totalCount={totalItemsCount}
                                pageSize={itemsPageSize}
                                onPageChange={(page) => {
                                  setIsItemsPaginationLoading(true);
                                  setItemsCurrentPage(page);
                                  setTimeout(
                                    () => setIsItemsPaginationLoading(false),
                                    300,
                                  );
                                }}
                                onPageSizeChange={(newSize) => {
                                  setIsItemsPaginationLoading(true);
                                  setItemsPageSize(newSize);
                                  setItemsCurrentPage(1);
                                  setTimeout(
                                    () => setIsItemsPaginationLoading(false),
                                    300,
                                  );
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: COMMENTS DISCUSSION ENGINE */}
                {activeDrawerSection === 'comments' && (
                  <div className="flex min-h-0 flex-1 flex-col gap-4">
                    {isCommentOnlyView && (
                      <div className="mt-1 flex shrink-0 flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <label className="text-[10px] font-bold tracking-wide text-slate-500 uppercase">
                          Discussion Scope
                        </label>
                        <div className="relative">
                          <button
                            onClick={() =>
                              setIsScopeDropdownOpen(!isScopeDropdownOpen)
                            }
                            className="focus:border-mc-black flex w-full items-center justify-between rounded-md border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-700 focus:outline-hidden"
                          >
                            <span className="truncate">
                              {commentScope === 'po'
                                ? 'General PO Comments'
                                : selectedPO?.items?.find(
                                      (i: any) =>
                                        (i.id || i.sku) === selectedSkuId,
                                    )
                                  ? `SKU: ${selectedPO?.items?.find((i: any) => (i.id || i.sku) === selectedSkuId)?.sku}`
                                  : 'General PO Comments'}
                            </span>
                            <ChevronDown
                              className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isScopeDropdownOpen ? 'rotate-180' : ''}`}
                            />
                          </button>

                          {isScopeDropdownOpen && (
                            <div className="absolute top-full right-0 left-0 z-50 mt-1 max-h-60 overflow-hidden overflow-y-auto rounded-md border border-slate-200 bg-white text-xs shadow-lg">
                              <button
                                className={`w-full px-3 py-2 text-left font-bold transition-colors hover:bg-slate-50 ${commentScope === 'po' ? 'text-mc-black bg-slate-100/50' : 'text-slate-700'}`}
                                onClick={() => {
                                  setCommentScope('po');
                                  setSelectedSkuId(null);
                                  setIsScopeDropdownOpen(false);
                                }}
                              >
                                General PO Comments
                              </button>

                              {selectedPO?.items?.length > 0 && (
                                <div className="border-y border-slate-100 bg-slate-50 px-3 py-1.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                                  SKU-wise Comments
                                </div>
                              )}

                              {selectedPO?.items?.map((item: any) => {
                                const itemId = item.id || item.sku;
                                const isSelected =
                                  commentScope === 'sku' &&
                                  selectedSkuId === itemId;
                                return (
                                  <button
                                    key={`sku-${itemId}`}
                                    className={`w-full px-3 py-2 text-left transition-colors ${isSelected ? 'text-mc-black bg-slate-100/50 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                                    onClick={() => {
                                      setCommentScope('sku');
                                      setSelectedSkuId(itemId);
                                      setIsScopeDropdownOpen(false);
                                    }}
                                  >
                                    <div className="flex w-full items-center justify-between">
                                      <span className="truncate">
                                        SKU: {item.sku}
                                      </span>
                                      {(() => {
                                        const count =
                                          item.total_comments_count ??
                                          item.comments_count ??
                                          item.commentsCount ??
                                          item.comment_count ??
                                          (Array.isArray(item.comments)
                                            ? item.comments.length
                                            : 0);
                                        return count > 0 ? (
                                          <span className="ml-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-slate-200 px-1 text-[9px] font-bold text-slate-600">
                                            {count}
                                          </span>
                                        ) : null;
                                      })()}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="custom-scrollbar flex-1 space-y-3.5 overflow-y-auto pr-2">
                      {(
                        isCommentOnlyView && commentScope === 'sku'
                          ? isLoadingSkuComments
                          : isLoadingComments
                      ) ? (
                        <div className="flex flex-col items-center justify-center space-y-3 py-12">
                          <Loader2 className="text-mc-black h-6 w-6 animate-spin" />
                          <p className="font-mono text-xs font-medium text-slate-500">
                            Loading messages...
                          </p>
                        </div>
                      ) : (
                        <>
                          {(() => {
                            const commentMap = new Map<string, any>();
                            (isCommentOnlyView && commentScope === 'sku'
                              ? fetchedSkuComments
                              : selectedPOComments
                            ).forEach((c) => {
                              commentMap.set(c.id, { ...c, children: [] });
                            });

                            const rootNodes: any[] = [];
                            (isCommentOnlyView && commentScope === 'sku'
                              ? fetchedSkuComments
                              : selectedPOComments
                            ).forEach((c) => {
                              const node = commentMap.get(c.id);
                              if (
                                node.parentId &&
                                commentMap.has(node.parentId)
                              ) {
                                commentMap
                                  .get(node.parentId)
                                  .children.push(node);
                              } else {
                                rootNodes.push(node);
                              }
                            });

                            // Sort chronologically (assuming timestamp ordering natively or enforce here)
                            const sortNodes = (nodes: any[]) => {
                              return nodes.sort(
                                (a, b) =>
                                  new Date(a.rawTimestamp).getTime() -
                                  new Date(b.rawTimestamp).getTime(),
                              );
                            };

                            const renderCommentTree = (
                              node: any,
                              depth: number = 0,
                            ) => {
                              const isMeStr = (node.user || '').toLowerCase();
                              const isMe =
                                isMeStr === 'sourcing lead (you)' ||
                                (currentUser &&
                                  (isMeStr ===
                                    `${currentUser.first_name || ''} ${currentUser.last_name || ''}`
                                      .trim()
                                      .toLowerCase() ||
                                    isMeStr ===
                                      String(
                                        currentUser.username || '',
                                      ).toLowerCase() ||
                                    isMeStr ===
                                      String(
                                        currentUser.email || '',
                                      ).toLowerCase() ||
                                    isMeStr ===
                                      String(
                                        currentUser.first_name || '',
                                      ).toLowerCase() ||
                                    (currentUser.id &&
                                      String(node.userId) ===
                                        String(currentUser.id))));

                              const isCollapsed =
                                collapsedComments[node.id] || false;

                              return (
                                <div
                                  key={node.id}
                                  id={node.id} // Added id for deep link scrolling
                                  className={`relative mb-3 flex scroll-mt-20 flex-col ${
                                    highlightedCommentId === node.id
                                      ? 'rounded-xl p-1 ring-2 ring-red-500 transition-all duration-1000 ring-inset'
                                      : ''
                                  }`}
                                >
                                  <div className="group relative flex items-start gap-3 transition-colors">
                                    <div
                                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-100 text-xs font-bold shadow-sm ${isMe ? 'bg-mc-black text-white' : 'bg-slate-50 text-slate-700'}`}
                                    >
                                      {(node.user[0] || 'U').toUpperCase()}
                                    </div>
                                    <div
                                      className={`flex min-w-0 flex-1 flex-col rounded-2xl border p-3 ${isMe ? 'border-slate-200 bg-slate-100/30 shadow-sm' : 'border-slate-100/80 bg-white shadow-xs'}`}
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
                                          {editingCommentFiles.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                              {editingCommentFiles.map(
                                                (file, index) => (
                                                  <div
                                                    key={`${file.name}-${index}`}
                                                    className="flex items-center gap-2 rounded-lg bg-slate-100 px-2 py-1 text-[11px] text-slate-600"
                                                  >
                                                    <Paperclip className="h-3.5 w-3.5" />
                                                    <span className="max-w-40 truncate">
                                                      {file.name}
                                                    </span>
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        setEditingCommentFiles(
                                                          (files) =>
                                                            files.filter(
                                                              (_, fileIndex) =>
                                                                fileIndex !==
                                                                index,
                                                            ),
                                                        )
                                                      }
                                                      className="text-slate-400 hover:text-red-500"
                                                      aria-label={`Remove ${file.name}`}
                                                    >
                                                      <X className="h-3 w-3" />
                                                    </button>
                                                  </div>
                                                ),
                                              )}
                                            </div>
                                          )}
                                          <div className="relative">
                                            <textarea
                                              value={editingCommentText}
                                              onChange={(e) =>
                                                setEditingCommentText(
                                                  e.target.value,
                                                )
                                              }
                                              className="w-full rounded border border-slate-300 bg-white p-2 pr-9 text-[13px] text-slate-800 focus:border-indigo-400 focus:outline-hidden"
                                              rows={2}
                                            />
                                            <button
                                              type="button"
                                              onClick={() =>
                                                document
                                                  .getElementById(
                                                    `po-detail-comment-edit-attachment-${node.id}`,
                                                  )
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
                                              id={`po-detail-comment-edit-attachment-${node.id}`}
                                              type="file"
                                              className="hidden"
                                              multiple
                                              accept=".jpeg,.jpg,.png,.gif,.webp,.pdf,.doc,.docx,.csv,.xls,.xlsx"
                                              onChange={async (e) => {
                                                if (!e.target.files?.length)
                                                  return;
                                                const processedFiles: File[] =
                                                  [];
                                                setIsCompressing(true);

                                                for (const file of Array.from(
                                                  e.target.files,
                                                )) {
                                                  if (
                                                    !file.name.match(
                                                      /\.(jpeg|jpg|png|gif|webp|pdf|doc|docx|csv|xls|xlsx)$/i,
                                                    )
                                                  ) {
                                                    toast.error(
                                                      `Invalid file type for ${file.name}. Only Images, PDFs, Word, Excel, and CSVs are allowed.`,
                                                    );
                                                    continue;
                                                  }
                                                  if (
                                                    file.size >
                                                    5 * 1024 * 1024
                                                  ) {
                                                    toast.error(
                                                      `File ${file.name} exceeds the 5MB limit. Please upload a smaller file.`,
                                                    );
                                                    continue;
                                                  }
                                                  processedFiles.push(file);
                                                }

                                                setEditingCommentFiles(
                                                  (files) => [
                                                    ...files,
                                                    ...processedFiles,
                                                  ],
                                                );
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
                                              onClick={() =>
                                                handleUpdateSubmit(node.id)
                                              }
                                              disabled={isPostingComment}
                                              className="bg-mc-black rounded px-3 py-1 text-[11px] font-semibold text-white hover:bg-black disabled:opacity-50"
                                            >
                                              {isPostingComment && uploadStatus
                                                ? uploadStatus
                                                : 'Save'}
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-[13px] leading-relaxed break-words whitespace-pre-wrap text-slate-600">
                                          {node.message
                                            .split(/(@[\w.-]+)/g)
                                            .map((part: string, i: number) =>
                                              part.startsWith('@') ? (
                                                <span
                                                  key={i}
                                                  className="text-mc-black font-bold"
                                                >
                                                  {part}
                                                </span>
                                              ) : (
                                                part
                                              ),
                                            )}
                                        </p>
                                      )}

                                      {/* WhatsApp Style Attachment Render */}
                                      {(() => {
                                        const filesToRender =
                                          node.files && node.files.length > 0
                                            ? node.files
                                            : node.fileUrl
                                              ? [
                                                  {
                                                    fileUrl: node.fileUrl,
                                                    fileName: node.fileName,
                                                    fileType: node.fileType,
                                                  },
                                                ]
                                              : [];

                                        if (filesToRender.length === 0)
                                          return null;
                                        const isOptimistic = String(
                                          node.id,
                                        ).includes('OPT-');

                                        return (
                                          <div className="mt-2.5 flex flex-wrap gap-2">
                                            {filesToRender.map(
                                              (fileObj: any, idx: number) => {
                                                const isImage =
                                                  fileObj.fileType?.startsWith(
                                                    'image/',
                                                  ) ||
                                                  fileObj.fileUrl?.match(
                                                    /\.(jpeg|jpg|gif|png|webp|bmp)(\?.*)?$/i,
                                                  ) ||
                                                  fileObj.fileUrl?.startsWith(
                                                    'blob:',
                                                  );

                                                if (isImage) {
                                                  return (
                                                    <div
                                                      key={idx}
                                                      className="group/att relative"
                                                    >
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          !isOptimistic &&
                                                          setPreviewImage(
                                                            fileObj.fileUrl,
                                                          )
                                                        }
                                                        className={`relative focus:outline-hidden ${isOptimistic ? 'cursor-not-allowed' : ''}`}
                                                      >
                                                        <img
                                                          src={fileObj.fileUrl}
                                                          alt="Attachment"
                                                          className="h-32 w-48 rounded-xl object-cover drop-shadow-sm transition-transform hover:scale-[1.02]"
                                                          onLoad={() => {
                                                            if (
                                                              idx ===
                                                              filesToRender.length -
                                                                1
                                                            ) {
                                                              messagesEndRef.current?.scrollIntoView(
                                                                {
                                                                  behavior:
                                                                    'smooth',
                                                                },
                                                              );
                                                            }
                                                          }}
                                                        />
                                                        {isOptimistic && (
                                                          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-900/40 backdrop-blur-[2px]">
                                                            <div className="flex flex-col items-center gap-2">
                                                              <Loader2 className="h-4 w-4 animate-spin text-white" />
                                                            </div>
                                                          </div>
                                                        )}
                                                      </button>
                                                      {isMe &&
                                                        !isOptimistic &&
                                                        fileObj.id &&
                                                        handleDeleteCommentAttachment && (
                                                          <button
                                                            type="button"
                                                            onClick={() =>
                                                              handleDeleteCommentAttachment(
                                                                node.id,
                                                                fileObj.id,
                                                              )
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
                                                  <div
                                                    key={idx}
                                                    className="group/att relative w-max"
                                                  >
                                                    <a
                                                      href={
                                                        isOptimistic
                                                          ? undefined
                                                          : fileObj.fileUrl
                                                      }
                                                      download={
                                                        fileObj.fileName ||
                                                        'Document'
                                                      }
                                                      target={
                                                        isOptimistic
                                                          ? undefined
                                                          : '_blank'
                                                      }
                                                      rel="noreferrer"
                                                      className={`flex w-max items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600 transition-colors ${isOptimistic ? 'pointer-events-none opacity-70' : 'hover:bg-slate-100'}`}
                                                    >
                                                      <div className="rounded-full bg-slate-200 p-1.5 text-slate-500">
                                                        <Paperclip className="h-4 w-4" />
                                                      </div>
                                                      <div className="flex min-w-0 flex-col">
                                                        <span className="text-[11px] font-bold">
                                                          Attachment
                                                        </span>
                                                        <span className="max-w-[12rem] truncate text-[10px] text-slate-400">
                                                          {fileObj.fileName ||
                                                            'Document'}
                                                        </span>
                                                      </div>
                                                      {!isOptimistic && (
                                                        <div className="ml-2 flex rounded-full bg-slate-200 p-1.5 text-slate-500 transition-colors hover:bg-slate-300 hover:text-slate-700">
                                                          <Download className="h-3 w-3" />
                                                        </div>
                                                      )}
                                                    </a>
                                                    {isOptimistic && (
                                                      <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-slate-800/40 backdrop-blur-[1px]">
                                                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                                                      </div>
                                                    )}
                                                    {isMe &&
                                                      !isOptimistic &&
                                                      fileObj.id &&
                                                      handleDeleteCommentAttachment && (
                                                        <button
                                                          type="button"
                                                          onClick={() =>
                                                            handleDeleteCommentAttachment(
                                                              node.id,
                                                              fileObj.id,
                                                            )
                                                          }
                                                          className="absolute -top-2 -right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                                                          title="Delete attachment"
                                                        >
                                                          <Trash className="h-2.5 w-2.5" />
                                                        </button>
                                                      )}
                                                  </div>
                                                );
                                              },
                                            )}
                                          </div>
                                        );
                                      })()}

                                      {/* Action Bar */}
                                      <div className="mt-2 flex items-center gap-4">
                                        {node.fileUrl &&
                                          !(
                                            node.fileType?.startsWith(
                                              'image/',
                                            ) ||
                                            node.fileUrl.match(
                                              /\.(jpeg|jpg|gif|png|webp|bmp)(\?.*)?$/i,
                                            ) ||
                                            node.fileUrl.startsWith('blob:')
                                          ) && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                forceDownload(
                                                  node.fileUrl,
                                                  node.fileName || 'Attachment',
                                                );
                                              }}
                                              className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 opacity-100 transition hover:text-indigo-600"
                                            >
                                              <Download className="h-3 w-3" />{' '}
                                              Download
                                            </button>
                                          )}
                                        {isMe &&
                                          editingCommentId !== node.id && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditingCommentId(node.id);
                                                setEditingCommentText(
                                                  node.message,
                                                );
                                                setEditingCommentFiles([]);
                                              }}
                                              className="hover:text-mc-black flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 opacity-100 transition"
                                            >
                                              <Pencil className="h-3 w-3" />{' '}
                                              Edit
                                            </button>
                                          )}
                                        {isMe &&
                                          editingCommentId !== node.id &&
                                          handleDeleteComment && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleDeleteComment(node.id)
                                              }
                                              className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 opacity-100 transition hover:text-red-500"
                                            >
                                              <Trash className="h-3 w-3" />{' '}
                                              Delete
                                            </button>
                                          )}

                                        <>
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
                                        </>
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
                                                <MessageSquare className="h-3 w-3" />{' '}
                                                Expand {node.children.length}{' '}
                                                replies
                                              </>
                                            ) : (
                                              <>
                                                <ChevronUp className="h-3 w-3" />{' '}
                                                Collapse
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
                                      {sortNodes(node.children).map(
                                        (child: any) =>
                                          renderCommentTree(child, depth + 1),
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            };

                            return (
                              <div className="flex flex-col">
                                {sortNodes(rootNodes).map((root) =>
                                  renderCommentTree(root, 0),
                                )}
                              </div>
                            );
                          })()}
                          {(commentScope === 'po'
                            ? selectedPOComments
                            : fetchedSkuComments
                          ).length === 0 && (
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

                    <form
                      onSubmit={handlePostComment}
                      className="relative flex shrink-0 flex-col gap-2 border-t border-slate-100 pt-3"
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
                                          'comment-attachment-input',
                                        ) as HTMLInputElement;
                                        if (input) input.value = '';
                                      }
                                    }}
                                    className="absolute -top-2 -right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md transition-colors hover:border-red-200 hover:text-red-500"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                  {file.type.startsWith('image/') ? (
                                    <div className="bg-mc-gray-dark relative flex h-24 w-full items-center justify-center overflow-hidden rounded-lg">
                                      <img
                                        src={URL.createObjectURL(file)}
                                        alt="Preview"
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="bg-mc-gray-dark flex h-24 w-full flex-col items-center justify-center rounded-lg">
                                      <Paperclip className="text-mc-gray-soft mb-1 h-6 w-6" />
                                      <span className="bg-mc-gray-soft text-mc-white rounded px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase shadow-xs">
                                        {file.name.split('.').pop()}
                                      </span>
                                    </div>
                                  )}
                                  <div className="bg-mc-gray-dark text-mc-white mt-2 w-full truncate rounded-md px-2 py-1 text-center text-[10px] font-semibold">
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

                                    return filtered.map(
                                      (userObj: any, idx: number) => {
                                        const name =
                                          typeof userObj === 'string'
                                            ? userObj
                                            : userObj.name || '';
                                        const initial = (
                                          name[0] || 'U'
                                        ).toUpperCase();
                                        const isHighlighted =
                                          idx === mentionHighlightIndex;
                                        return (
                                          <button
                                            key={
                                              typeof userObj === 'string'
                                                ? userObj
                                                : userObj.id
                                            }
                                            type="button"
                                            onClick={() =>
                                              handleSelectMention(userObj)
                                            }
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
                                      },
                                    );
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
                                  .getElementById('comment-attachment-input')
                                  ?.click()
                              }
                              className="absolute top-[5px] right-2 p-1 font-bold text-slate-400 transition hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Attach file or image"
                              disabled={isCompressing}
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
                            id="comment-attachment-input"
                            className="hidden"
                            multiple
                            accept=".jpeg,.jpg,.png,.gif,.webp,.pdf,.doc,.docx,.csv,.xls,.xlsx"
                            onChange={async (e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                const selectedFiles = Array.from(
                                  e.target.files,
                                );
                                const processedFiles: File[] = [];

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

                                  const maxSizeInBytes = 5 * 1024 * 1024;
                                  if (file.size > maxSizeInBytes) {
                                    toast.error(
                                      `File ${file.name} exceeds the 5MB limits. Please upload a smaller file.`,
                                    );
                                    continue;
                                  }
                                  processedFiles.push(file);
                                }

                                if (processedFiles.length > 0) {
                                  setNewCommentFiles((prev) => [
                                    ...prev,
                                    ...processedFiles,
                                  ]);
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
                            (!newCommentText.trim() &&
                              newCommentFiles.length === 0)
                          }
                          className="bg-mc-black flex h-[42px] shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-2 text-[13px] font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isPostingComment ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>
                                {uploadStatus
                                  ? uploadStatus.replace('...', '')
                                  : 'Posting'}
                              </span>
                            </>
                          ) : (
                            <>
                              <Send className="h-3.5 w-3.5" />
                              <span>
                                {newCommentFiles.length > 0
                                  ? 'Upload'
                                  : 'Comment'}
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}

      <ItemCommentModal
        isOpen={!!selectedItemForComments}
        onClose={() => setSelectedItemForComments(null)}
        targetItem={selectedItemForComments}
        selectedPO={selectedPO}
        onAddActivity={onAddActivity}
        highlightedCommentId={highlightedCommentId}
      />
    </>
  );
}
