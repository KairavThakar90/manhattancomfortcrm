import apiClient from './api';
import {
  PO_LIST,
  PO_BY_ID,
  PO_CREATE,
  PO_UPDATE,
  PO_DELETE,
  PO_FILTERS_ALL,
  PO_EXPORT_CSV,
  PO_COMMENTS,
  PO_SYNC,
} from '../utils/endpoints';

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
  ordering?: string;
  page?: number;
  page_size?: number;
  limit?: number;
}): Promise<PurchaseOrder[] | PaginatedResult<PurchaseOrder> | any> {
  const { data } = await apiClient.get<any>(PO_LIST, { params });
  return data;
}

/** Export POs to CSV */
export async function exportPurchaseOrdersCSV(payload?: any) {
  const response = await apiClient.post(PO_EXPORT_CSV, payload, {
    responseType: 'blob', // crucial for downloading files
  });
  return response.data;
}

/** Fetch all purchase orders filters */
export async function getPurchaseOrdersAllFilters(vendorId?: string) {
  const params: any = {};
  if (vendorId) {
    params.vendor_id = vendorId;
  }
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
): Promise<any> {
  const { data } = await apiClient.post(PO_COMMENTS(poId), {
    comment: message,
    parent_id: parent_id || null,
    tagged_user_ids: tagged_user_ids || [],
  });
  return data;
}

/** Sync POs from SellerCloud */
export async function syncPurchaseOrders(viewId: string = '25'): Promise<any> {
  const { data } = await apiClient.post(`${PO_SYNC}?view_id=${viewId}`);
  return data;
}
