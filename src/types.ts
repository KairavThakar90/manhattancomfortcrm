export type UserRole =
  'Administrator' | 'Purchasing' | 'Warehouse' | 'Finance' | 'Vendor';

export type POShippingStatus =
  'Production' | 'In Transit' | 'Port of Entry' | 'Delivered' | 'Delayed';

export type InvoiceStatus = 'Pending' | 'Uploaded' | 'Approved' | 'Rejected';

export type ProductionStage =
  'Materials' | 'Assembly' | 'Quality Check' | 'Packaging' | 'Ready to Ship';

export interface POItemContainer {
  id?: string;
  sellercloud_container_id?: number;
  container_name?: string;
  estimated_arrival_date?: string;
  received_date?: string;
  qty_in_container: number;
}

export interface POItem {
  id?: string;
  sku: string;
  name: string;
  product_name?: string;
  productName?: string;
  ProductName?: string;
  qty: number;
  receivedQty?: number;
  unitPrice: number;
  expected_delivery_date?: string;
  containers?: POItemContainer[];
  commentsCount?: number;
}

export interface InvoiceDetails {
  amount: number;
  invoiceNumber: string;
  date: string;
  ocrExtracted: boolean;
}

export interface PurchaseOrder {
  id: string; // PO-10025
  uuid?: string;
  orderId?: string;
  vendorId: string;
  vendorName: string;
  status: POShippingStatus;
  orderedQty: number;
  receivedQty: number;
  container: string;
  containerNames?: string[];
  invoiceStatus: InvoiceStatus;
  invoiceFile: string | null;
  invoiceDetails: InvoiceDetails | null;
  eta: string;
  expected_delivery_date?: string;
  creationDate: string;
  delayedDays: number;
  skus: string[];
  items: POItem[];
  productionStage: ProductionStage;
  commentsCount: number;
  emailCount: number;
  containerLeadTimeDays?: number | null;
  sellercloud_link?: string | null;
  delta_sellercloud_link?: string | null;
}

export interface Vendor {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  performanceScore: number;
  delayedOrders: number;
  totalOrders: number;
  avgDeliveryDays: number;
  country: string;
}

export interface EmailLog {
  id: string;
  poId: string;
  subject: string;
  sentAt: string;
  status: 'Sent' | 'Delivered' | 'Opened' | 'Failed' | 'Replied';
  openCount: number;
  lastOpenTime: string | null;
  linkClicks: number;
  repliedAt: string | null;
  attachmentName: string | null;
}

export interface Comment {
  id: string;
  poId: string;
  user: string;
  role: string;
  message: string;
  timestamp: string;
  parentId?: string | null;
}

export interface ChatMessage {
  id: string;
  channel: 'purchasing' | 'warehouse' | 'finance' | 'management';
  user: string;
  role: string;
  message: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  type: 'delay' | 'invoice' | 'container' | 'sync' | 'comment';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  poId?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  message: string;
  type:
    | 'PO Updated'
    | 'Email Sent'
    | 'Invoice Uploaded'
    | 'Vendor Comment'
    | 'Sync';
  poId?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  poId?: string;
  previousValue: string;
  newValue: string;
  browser: string;
  ip: string;
  ipAddress?: string;
}

export interface SellercloudSyncLog {
  id: string;
  timestamp: string;
  newOrdersCount: number;
  updatedOrdersCount: number;
  status: 'Success' | 'Failed';
  durationMs: number;
  triggerMethod?: string;
  fetchedRows?: number;
}
