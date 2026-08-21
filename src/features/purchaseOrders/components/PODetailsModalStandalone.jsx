import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { PODetailsModal } from './PODetailsModal';
import ConfirmDeleteModal from '../../../components/common/ConfirmDeleteModal';
import { useCRM } from '../../../hooks/useCRM';
import { setPurchaseOrdersList } from '../store/purchaseOrderSlice';
import {
  getPurchaseOrderById,
  postPOComment,
  postItemComment,
  updatePOComment,
  deletePOComment,
  deletePOCommentAttachment,
  updatePOLeadTime,
  patchPurchaseOrder,
  updatePurchaseOrderItemQuantity,
} from '../services/purchaseOrder.service';

/**
 * PODetailsModalStandalone
 *
 * Self-contained wrapper around the shared <PODetailsModal /> so it can be opened
 * from anywhere (currently: ContainerFlowPage's container list) with just a PO id,
 * without needing the full POManagement page/list state around it.
 *
 * It fetches the PO + its items + comments, and implements the handlers
 * PODetailsModal needs (post comment, edit comment, update item qty, update lead
 * time) using the same service functions POManagement uses.
 */
export default function PODetailsModalStandalone({ poId, onClose }) {
  const dispatch = useDispatch();
  const { user: currentUser, userRole: contextUserRole } = useCRM();

  const userRole =
    currentUser?.role || contextUserRole || localStorage.getItem('userRole');
  const isVendor = String(userRole).toLowerCase() === 'vendor';

  const reduxPOs = useSelector((state) => state.purchaseOrders?.list) || [];

  const [po, setPo] = useState(null);
  const [detailedPOItems, setDetailedPOItems] = useState([]);
  const [fetchedComments, setFetchedComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [error, setError] = useState(null);
  const [isDeletingPOItem, setIsDeletingPOItem] = useState(false);
  const [deleteCommentTarget, setDeleteCommentTarget] = useState(null);
  const [isDeletingComment, setIsDeletingComment] = useState(false);

  const [activeDrawerSection, setActiveDrawerSection] = useState('details');
  const [isCommentOnlyView, setIsCommentOnlyView] = useState(false);
  const [commentScope, setCommentScope] = useState('po');
  const [selectedSkuId, setSelectedSkuId] = useState(null);
  const [isScopeDropdownOpen, setIsScopeDropdownOpen] = useState(false);
  const selectedSkuIdRef = useRef(null);

  // Strip a leading "PO-"/"P0-" prefix so we always call the API with the raw id,
  // mirroring POQuickView's id-cleaning logic.
  const cleanId = String(poId || '')
    .replace(/^P[O0]-/i, '')
    .trim();

  // Reset state during render if ID changes (React recommended approach)
  const [prevId, setPrevId] = useState(null);
  if (cleanId !== prevId) {
    setPrevId(cleanId);
    setIsLoading(true);
    setIsLoadingComments(true);
    setError(null);
  }

  const formatUtcTimestamp = (ts) => {
    if (!ts) return new Date().toISOString().slice(0, 10);
    const d = new Date(ts);
    return isNaN(d.getTime()) ? ts : d.toISOString().slice(0, 10);
  };

  const parseApiCommentObject = (c, defaultTargetId, isItemMode = false) => {
    const fileArr = c.files || c.attachments || c.documents || [];
    const firstFile =
      Array.isArray(fileArr) && fileArr.length > 0 ? fileArr[0] : null;

    const parsedFiles = (Array.isArray(fileArr) ? fileArr : []).map((f) => {
      let fUrl = f.file_url || f.url || c.file_url || c.file || null;
      if (fUrl && !fUrl.startsWith('blob:')) {
        const char = fUrl.includes('?') ? '&' : '?';
        fUrl = `${fUrl}${char}cb=${Date.now()}`;
      }
      return {
        id: f.id || null,
        fileUrl: fUrl,
        fileName:
          f.file_name || f.name || c.file_name || c.filename || 'Attachment',
        fileType: f.content_type || f.mimetype || '',
      };
    });

    return {
      id: String(c.id || `COM-${Math.random()}`),
      ...(isItemMode ? { itemId: defaultTargetId } : { poId: defaultTargetId }),
      user: c.user_name || c.user || c.author || 'User',
      userId: c.user_id || c.author_id || null,
      role: c.role || 'Administrator',
      message: c.comment || c.message || c.text || '',
      files: parsedFiles,
      fileUrl: (() => {
        if (parsedFiles.length > 0) return parsedFiles[0].fileUrl;
        let fUrl =
          firstFile?.file_url || firstFile?.url || c.file_url || c.file || null;
        if (fUrl && !fUrl.startsWith('blob:')) {
          const char = fUrl.includes('?') ? '&' : '?';
          fUrl = `${fUrl}${char}cb=${Date.now()}`;
        }
        return fUrl;
      })(),
      fileName:
        parsedFiles.length > 0
          ? parsedFiles[0].fileName
          : firstFile?.file_name ||
            firstFile?.name ||
            c.file_name ||
            c.filename ||
            'Attachment',
      fileType:
        parsedFiles.length > 0
          ? parsedFiles[0].fileType
          : firstFile?.content_type || firstFile?.mimetype || '',
      timestamp: formatUtcTimestamp(c.created_at || c.timestamp),
      rawTimestamp: c.created_at || c.timestamp || new Date().toISOString(),
      parentId: c.parent_id ? String(c.parent_id) : null,
    };
  };

  const mapDetailToPO = (detailData) => {
    const items = detailData?.items || [];
    const orderedQty = items.reduce(
      (sum, i) => sum + (i.qty_ordered ?? i.qty ?? i.orderedQty ?? 0),
      0,
    );
    const receivedQty = items.reduce(
      (sum, i) =>
        sum + (i.qty_received ?? i.receivedQty ?? i.received_qty ?? 0),
      0,
    );
    return {
      id: detailData?.sellercloud_po_id
        ? `PO-${detailData.sellercloud_po_id}`
        : `PO-${cleanId}`,
      uuid: detailData?.id,
      vendorName:
        detailData?.vendor?.name ||
        detailData?.vendor_name ||
        detailData?.vendorName ||
        'Unknown Vendor',
      orderId: detailData?.order_number || detailData?.orderId || 'N/A',
      creationDate: detailData?.created_on
        ? String(detailData.created_on).split('T')[0]
        : detailData?.creationDate || 'N/A',
      sellercloud_link: detailData?.sellercloud_link || null,
      containerLeadTimeDays:
        detailData?.container_lead_time_days ??
        detailData?.containerLeadTimeDays ??
        null,
      orderedQty,
      receivedQty,
      commentsCount: detailData?.total_comments_count ?? 0,
      containerNames: detailData?.container_names || [],
      items,
    };
  };

  // Pull the comments array out of a PO detail response, tolerating a few
  // different shapes the API might return it in.
  const extractRawComments = (detailData) => {
    const candidates = [
      detailData?.comments,
      detailData?.comments?.results,
      detailData?.po_comments,
      detailData?.discussion_comments,
      detailData?.comment_list,
    ];
    const found = candidates.find((c) => Array.isArray(c));
    return found || [];
  };

  const applyDetail = (detailData, idUsed) => {
    setPo(mapDetailToPO(detailData));
    setDetailedPOItems(detailData.items || []);
    const rawComments = extractRawComments(detailData);
    console.debug(
      '[PODetailsModalStandalone] fetched PO detail for id=%s (sellercloud_po_id=%s, uuid=%s) — %d comment(s) found. Raw comments field:',
      idUsed,
      detailData?.sellercloud_po_id,
      detailData?.id,
      rawComments.length,
      detailData?.comments,
    );
    setFetchedComments(
      rawComments.map((c) => parseApiCommentObject(c, `PO-${cleanId}`)),
    );
  };

  const fetchPO = () => {
    if (!cleanId) return;

    let isMounted = true;

    getPurchaseOrderById(cleanId)
      .then((detailData) => {
        if (!isMounted) return;
        if (!detailData) {
          setError('Purchase order not found.');
          return;
        }

        // Container Flow resolves the PO purely from the container's po_numbers
        // field, which may not be the same identifier POManagement uses
        // internally (po.sellercloud_po_id). If the record we got back reports
        // a different canonical sellercloud_po_id, re-fetch by that id so we're
        // reading the exact same record POManagement would (comments included).
        const canonicalId = detailData?.sellercloud_po_id
          ? String(detailData.sellercloud_po_id)
          : null;
        if (canonicalId && canonicalId !== cleanId) {
          return getPurchaseOrderById(canonicalId).then((canonicalDetail) => {
            if (isMounted)
              applyDetail(canonicalDetail || detailData, canonicalId);
          });
        }

        if (isMounted) applyDetail(detailData, cleanId);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('PODetailsModalStandalone fetch error:', err);
        setError('Failed to load purchase order details.');
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
          setIsLoadingComments(false);
        }
      });
  };

  useEffect(() => {
    let isMounted = true;

    fetchPO();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanId]);

  const handleUpdateItemQty = async (itemIdOrSku, newQty) => {
    if (!po) return;
    try {
      try {
        await updatePurchaseOrderItemQuantity(itemIdOrSku, newQty);
      } catch (itemErr) {
        console.warn(
          'Item specific update failed, falling back to PO patch.',
          itemErr,
        );
        await patchPurchaseOrder(cleanId, {
          items: [{ sku: itemIdOrSku, qty: newQty, qty_ordered: newQty }],
        });
      }
      toast.success('Ordered Quantity updated successfully.');

      // Re-sync from the server so the modal reflects the true backend state.
      const rawPo = await getPurchaseOrderById(cleanId);
      if (rawPo) {
        setPo(mapDetailToPO(rawPo));
        setDetailedPOItems(rawPo.items || []);

        // Keep the redux PO list (used elsewhere in the app) in sync too.
        const updatedPOs = reduxPOs.map((p) =>
          String(p.sellercloud_po_id) === String(cleanId) ||
          String(p.id) === `PO-${cleanId}`
            ? {
                ...p,
                items: rawPo.items,
                orderedQty: mapDetailToPO(rawPo).orderedQty,
              }
            : p,
        );
        dispatch(setPurchaseOrdersList(updatedPOs));
      }
    } catch (error) {
      toast.error('Failed to update Ordered Quantity.');
      throw error;
    }
  };

  const handleRemoveItem = async () => {
    // Item removal isn't exposed by PODetailsModal's current UI; kept as a safe
    // no-op stub so the prop is never undefined.
    setIsDeletingPOItem(false);
  };

  const handleDeleteComment = (commentId) => {
    if (String(commentId).includes('OPT-')) return;
    setDeleteCommentTarget({ type: 'comment', commentId });
  };

  const handleDeleteCommentAttachment = (commentId, attachmentId) => {
    if (!attachmentId) return;
    setDeleteCommentTarget({ type: 'attachment', commentId, attachmentId });
  };

  const handleConfirmDeleteComment = () => {
    if (!deleteCommentTarget) return;
    const { type, commentId, attachmentId } = deleteCommentTarget;
    setIsDeletingComment(true);

    if (type === 'comment') {
      const prevComments = fetchedComments;
      setFetchedComments((prev) =>
        prev.filter((c) => c.id !== commentId && c.parentId !== commentId),
      );

      deletePOComment(commentId)
        .then(() => toast.success('Comment deleted successfully'))
        .catch((err) => {
          console.error('Failed to delete PO comment', err);
          toast.error('Failed to delete comment.');
          setFetchedComments(prevComments);
        })
        .finally(() => {
          setIsDeletingComment(false);
          setDeleteCommentTarget(null);
        });
      return;
    }

    const prevComments = fetchedComments;
    setFetchedComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        const newFiles = (c.files || []).filter((f) => f.id !== attachmentId);
        return {
          ...c,
          files: newFiles,
          fileUrl: newFiles.length > 0 ? newFiles[0].fileUrl : null,
          fileName: newFiles.length > 0 ? newFiles[0].fileName : null,
          fileType: newFiles.length > 0 ? newFiles[0].fileType : null,
        };
      }),
    );

    deletePOCommentAttachment(attachmentId)
      .then(() => toast.success('Attachment deleted successfully'))
      .catch((err) => {
        console.error('Failed to delete PO comment attachment', err);
        toast.error('Failed to delete attachment.');
        setFetchedComments(prevComments);
      })
      .finally(() => {
        setIsDeletingComment(false);
        setDeleteCommentTarget(null);
      });
  };

  const handleUpdatePOLeadTime = async (rawPoId, days) => {
    await updatePOLeadTime(rawPoId, days);
    // Refresh so the local `po` state (and thus the modal) reflects the change.
    const rawPo = await getPurchaseOrderById(cleanId);
    if (rawPo) setPo(mapDetailToPO(rawPo));
  };

  if (!cleanId) return null;

  if (isLoading) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs"
        onClick={onClose}
      >
        <div
          className="flex flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-white p-8 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <Loader2 className="text-mc-gold h-6 w-6 animate-spin" />
          <span className="text-sm text-slate-500">Loading PO details…</span>
        </div>
      </div>
    );
  }

  if (error || !po) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs"
        onClick={onClose}
      >
        <div
          className="flex flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-white p-8 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-sm text-red-500">
            {error || 'Purchase order not found.'}
          </span>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const allItemsForPO =
    detailedPOItems.length > 0 ? detailedPOItems : po.items || [];

  return (
    <>
      <PODetailsModal
        selectedPO={po}
        onSelectPO={(v) => {
          if (v === null) onClose();
        }}
        isCommentOnlyView={isCommentOnlyView}
        setIsCommentOnlyView={setIsCommentOnlyView}
        activeDrawerSection={activeDrawerSection}
        setActiveDrawerSection={setActiveDrawerSection}
        currentUser={currentUser}
        isVendor={isVendor}
        userRole={userRole}
        allItemsForPO={allItemsForPO}
        totalItemsCount={allItemsForPO.length}
        detailedPOItems={detailedPOItems}
        handleUpdateItemQty={handleUpdateItemQty}
        handleRemoveItem={handleRemoveItem}
        isDeletingPOItem={isDeletingPOItem}
        tableStyles={{}}
        parseApiCommentObject={parseApiCommentObject}
        postPOComment={postPOComment}
        postItemComment={postItemComment}
        isLoadingComments={isLoadingComments}
        fetchedComments={fetchedComments}
        setFetchedComments={setFetchedComments}
        selectedPOComments={fetchedComments}
        isLoadingSkuComments={false}
        fetchedSkuComments={[]}
        setFetchedSkuComments={() => {}}
        commentScope={commentScope}
        setCommentScope={setCommentScope}
        selectedSkuId={selectedSkuId}
        setSelectedSkuId={setSelectedSkuId}
        isScopeDropdownOpen={isScopeDropdownOpen}
        setIsScopeDropdownOpen={setIsScopeDropdownOpen}
        selectedSkuIdRef={selectedSkuIdRef}
        replyingToCommentId={null}
        setReplyingToCommentId={() => {}}
        commentText=""
        setCommentText={() => {}}
        uploadFiles={[]}
        handleFileChange={() => {}}
        handleRemoveFile={() => {}}
        isSubmittingComment={false}
        formatFileSize={() => ''}
        vendorsList={[]}
        handleStatusFilterChange={() => {}}
        statusFilter="all"
        getPurchaseOrderById={getPurchaseOrderById}
        toast={toast}
        patchPurchaseOrder={patchPurchaseOrder}
        updatePOComment={updatePOComment}
        updatePOLeadTime={handleUpdatePOLeadTime}
        handleToggleComments={() => {}}
        handleMarkResolved={() => {}}
        handleDeleteComment={handleDeleteComment}
        handleDeleteCommentAttachment={handleDeleteCommentAttachment}
        handleCompletePO={() => {}}
        onAddActivity={(msg) =>
          console.debug('[PODetailsModalStandalone] activity:', msg)
        }
      />
      <ConfirmDeleteModal
        isOpen={!!deleteCommentTarget}
        isDeleting={isDeletingComment}
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
        onCancel={() => !isDeletingComment && setDeleteCommentTarget(null)}
        onConfirm={handleConfirmDeleteComment}
      />
    </>
  );
}
