import apiClient from '../../../services/api';
import {
  PO_LIST,
  PO_BY_ID,
  PO_CREATE,
  PO_UPDATE,
  PO_DELETE,
  PO_FILTERS_ALL,
  PO_EXPORT_CSV,
  PO_EXPORT_SINGLE_CSV,
  PO_COMMENTS,
  PO_COMMENT_UPDATE,
  PO_COMMENT_DELETE,
  PO_COMMENT_ATTACHMENT_DELETE,
  PO_ITEM_COMMENTS,
  PO_ITEM_COMMENT_UPDATE,
  PO_ITEM_COMMENT_DELETE,
  PO_ITEM_COMMENT_ATTACHMENT_DELETE,
  PO_SYNC,
  PO_SYNC_SINGLE,
  PO_STATUS_UPDATE,
  PO_ITEM_QTY_UPDATE,
} from '../../../utils/endpoints';

// ==========================================
// Purchase Order Service
// ==========================================

export interface PurchaseOrderItem {
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
}

export interface PurchaseOrder {
  id: string; // Used for UI display, generated if new
  uuid?: string; // Django DB ID if it exists
  orderId?: string;
  vendorId: string;
  vendorName: string;
  status:
    | 'New'
    | 'Production'
    | 'Ready to Ship'
    | 'In Transit'
    | 'Delivered'
    | 'Delayed'; // UI Specific Status
  orderedQty: number;
  receivedQty: number;
  container: string;
  containerNames?: string[];
  invoiceStatus: 'Pending' | 'Uploaded' | 'Paid' | 'Delayed' | null;
  invoiceFile: string | null;
  invoiceDetails: {
    amount: number;
    invoiceNumber: string;
    date: string;
    ocrExtracted: boolean;
  } | null;
  eta: string;
  expected_delivery_date?: string;
  creationDate: string;
  created_on?: string; // DB raw date
  delayedDays: number; // calculated field
  skus: string[];
  items: PurchaseOrderItem[];
  productionStage: string;
  commentsCount: number;
  emailCount: number;
  containerLeadTimeDays?: number | null;
  sellercloud_link?: string;
}

export interface CreatePOPayload {
  vendorId: string;
  items: PurchaseOrderItem[];
  eta: string;
  [key: string]: unknown;
}

export interface UpdatePOPayload {
  status?: string;
  vendor_status?: string;
  eta?: string;
  container?: string;
  items?: PurchaseOrderItem[];
  [key: string]: unknown;
}

export interface PaginatedResult<T> {
  total: number;
  page: number;
  page_size: number;
  results: T[];
  [key: string]: any;
}

/** Fetch all purchase orders */
export async function getPurchaseOrders(params?: {
  search?: string;
  vendor_id?: string;
  status_label?: string;
  status?: string;
  approved_status?: string;
  ordering?: string;
  date_from?: string;
  is_completed?: boolean;

  page?: number;
  page_size?: number;
  limit?: number;
}): Promise<PurchaseOrder[] | PaginatedResult<PurchaseOrder> | any> {
  const fetchParams = { ...params, _t: Date.now() };
  const { data } = await apiClient.get<any>(PO_LIST, { params: fetchParams });
  return data;
}

/** Export POs to CSV */
export async function exportPurchaseOrdersCSV(payload?: any) {
  const response = await apiClient.post(PO_EXPORT_CSV, payload, {
    responseType: 'blob', // crucial for downloading files
  });
  return response.data;
}

/** Export a single PO to CSV by sellercloud_po_id */
export async function exportPurchaseOrderCSV(sellercloud_po_id: string) {
  const response = await apiClient.get(
    PO_EXPORT_SINGLE_CSV(sellercloud_po_id),
    {
      responseType: 'blob', // crucial for downloading files
    },
  );
  return response.data;
}

/** Fetch all purchase orders filters */
export async function getPurchaseOrdersAllFilters(params?: any) {
  const { data } = await apiClient.get(PO_FILTERS_ALL, { params });
  return data;
}

/** Fetch a single purchase order by ID */
export async function getPurchaseOrderById(id: string): Promise<PurchaseOrder> {
  const { data } = await apiClient.get<PurchaseOrder>(PO_BY_ID(id));
  return data;
}

/** Create a new purchase order */
export async function createPurchaseOrder(
  payload: CreatePOPayload,
): Promise<PurchaseOrder> {
  const { data } = await apiClient.post<PurchaseOrder>(PO_CREATE, payload);
  return data;
}

/** Update an existing purchase order */
export async function updatePurchaseOrder(
  id: string,
  payload: UpdatePOPayload,
): Promise<PurchaseOrder> {
  const { data } = await apiClient.put<PurchaseOrder>(PO_UPDATE(id), payload);
  return data;
}

/** Partially update a purchase order */
export async function patchPurchaseOrder(
  id: string,
  payload: Partial<UpdatePOPayload>,
): Promise<PurchaseOrder> {
  const { data } = await apiClient.patch<PurchaseOrder>(PO_UPDATE(id), payload);
  return data;
}

/** Partially update a purchase order item's quantity */
export async function updatePurchaseOrderItemQuantity(
  itemId: string,
  qtyOrdered: number,
): Promise<any> {
  const { data } = await apiClient.patch(PO_ITEM_QTY_UPDATE(itemId), {
    qty_ordered: qtyOrdered,
  });
  return data;
}

/** Update purchase order status */
export async function updatePOStatus(id: string, status: string): Promise<any> {
  const cleanId = id.replace(/^PO-/i, '');
  const { data } = await apiClient.patch(PO_STATUS_UPDATE(cleanId), { status });
  return data;
}

/** Update purchase order delay reason */
export async function updatePODelayReason(
  id: string,
  delayReason: string,
): Promise<any> {
  const cleanId = id.replace(/^PO-/i, '');
  const { data } = await apiClient.patch(PO_STATUS_UPDATE(cleanId), {
    delay_reason: delayReason,
  });
  return data;
}

/** Delete a purchase order by ID */
export async function deletePurchaseOrder(id: string): Promise<void> {
  await apiClient.delete(PO_DELETE(id));
}

/** Update PO Lead Time */
export async function updatePOLeadTime(
  poId: string,
  leadTimeDays: number,
): Promise<any> {
  const { data } = await apiClient.patch(
    `/purchase-orders/${poId}/lead-time?container_lead_time_days=${leadTimeDays}`,
  );
  return data;
}

/** Post a comment on a Purchase Order */
export async function postPOComment(
  poId: string,
  message: string,
  tagged_user_ids?: string[],
  parent_id?: string | null,
  files?: File[],
): Promise<any> {
  if (files && files.length > 0) {
    const formData = new FormData();
    formData.append('comment', message);
    if (parent_id) formData.append('parent_id', String(parent_id));
    if (tagged_user_ids && tagged_user_ids.length > 0) {
      tagged_user_ids.forEach((id) => formData.append('tagged_user_ids', id));
    }
    files.forEach((f) => formData.append('files', f));

    const { data } = await apiClient.post(PO_COMMENTS(poId), formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 0,
    });
    return data;
  }

  const { data } = await apiClient.post(
    PO_COMMENTS(poId),
    {
      comment: message,
      parent_id: parent_id || null,
      tagged_user_ids: tagged_user_ids || [],
    },
    {
      timeout: 0,
    },
  );
  return data;
}

/** Update an existing comment */
export async function updatePOComment(
  commentId: string,
  message: string,
  tagged_user_ids?: string[],
  files?: File[],
): Promise<any> {
  if (files && files.length > 0) {
    const formData = new FormData();
    formData.append('comment', message);
    if (tagged_user_ids && tagged_user_ids.length > 0) {
      tagged_user_ids.forEach((id) => formData.append('tagged_user_ids', id));
    }
    files.forEach((file) => formData.append('files', file));

    const { data } = await apiClient.put(
      PO_COMMENT_UPDATE(commentId),
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 0,
      },
    );
    return data;
  }

  const { data } = await apiClient.put(
    PO_COMMENT_UPDATE(commentId),
    {
      comment: message,
      tagged_user_ids: tagged_user_ids || [],
    },
    {
      timeout: 0,
    },
  );
  return data;
}

/** Delete an existing PO comment */
export async function deletePOComment(commentId: string): Promise<any> {
  const { data } = await apiClient.delete(PO_COMMENT_DELETE(commentId));
  return data;
}

/** Delete a single attachment from a PO comment */
export async function deletePOCommentAttachment(
  attachmentId: string,
): Promise<any> {
  const { data } = await apiClient.delete(
    PO_COMMENT_ATTACHMENT_DELETE(attachmentId),
  );
  return data;
}

export async function syncPurchaseOrders(days: string = '25'): Promise<any> {
  const url = days === 'all' ? PO_SYNC : `${PO_SYNC}?days=${days}`;
  const { data } = await apiClient.post(url, undefined, {
    timeout: 0,
  });
  return data;
}

/** Sync a single purchase order by sellercloud_po_id */
export async function syncSinglePurchaseOrder(
  sellercloud_po_id: string | number,
): Promise<any> {
  const { data } = await apiClient.post(
    PO_SYNC_SINGLE(sellercloud_po_id),
    undefined,
    {
      timeout: 0,
    },
  );
  return data;
}

// ------------------------------------------
// Item Comments
// ------------------------------------------

/** Get comments for a specific PO Item */
export async function getItemComments(itemId: string): Promise<any> {
  const { data } = await apiClient.get(PO_ITEM_COMMENTS(itemId));
  return data;
}

/** Post a comment on a PO Item */
export async function postItemComment(
  itemId: string,
  message: string,
  tagged_user_ids?: string[],
  parent_id?: string | null,
  files?: File[],
): Promise<any> {
  if (files && files.length > 0) {
    const formData = new FormData();
    formData.append('comment', message);
    if (parent_id) formData.append('parent_id', String(parent_id));
    if (tagged_user_ids && tagged_user_ids.length > 0) {
      tagged_user_ids.forEach((id) => formData.append('tagged_user_ids', id));
    }
    files.forEach((f) => formData.append('files', f));

    const { data } = await apiClient.post(PO_ITEM_COMMENTS(itemId), formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 0,
    });
    return data;
  }

  const { data } = await apiClient.post(
    PO_ITEM_COMMENTS(itemId),
    {
      comment: message,
      parent_id: parent_id || null,
      tagged_user_ids: tagged_user_ids || [],
    },
    {
      timeout: 0,
    },
  );
  return data;
}

/** Update an existing PO Item comment */
export async function updateItemComment(
  commentId: string,
  message: string,
  tagged_user_ids?: string[],
  files?: File[],
): Promise<any> {
  if (files && files.length > 0) {
    const formData = new FormData();
    formData.append('comment', message);
    if (tagged_user_ids && tagged_user_ids.length > 0) {
      tagged_user_ids.forEach((id) => formData.append('tagged_user_ids', id));
    }
    files.forEach((file) => formData.append('files', file));

    const { data } = await apiClient.put(
      PO_ITEM_COMMENT_UPDATE(commentId),
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 0,
      },
    );
    return data;
  }

  const { data } = await apiClient.put(
    PO_ITEM_COMMENT_UPDATE(commentId),
    {
      comment: message,
      tagged_user_ids: tagged_user_ids || [],
    },
    {
      timeout: 0,
    },
  );
  return data;
}

/** Delete an existing PO Item comment */
export async function deleteItemComment(commentId: string): Promise<any> {
  const { data } = await apiClient.delete(PO_ITEM_COMMENT_DELETE(commentId));
  return data;
}

/** Delete a single attachment from a PO Item comment */
export async function deleteItemCommentAttachment(
  attachmentId: string,
): Promise<any> {
  const { data } = await apiClient.delete(
    PO_ITEM_COMMENT_ATTACHMENT_DELETE(attachmentId),
  );
  return data;
}
