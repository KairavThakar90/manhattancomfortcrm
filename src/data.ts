import {
  PurchaseOrder,
  Vendor,
  EmailLog,
  Comment,
  ChatMessage,
  Notification,
  ActivityLog,
  AuditLog,
  SellercloudSyncLog,
} from './types';

// Initial Mock Vendors
export const INITIAL_VENDORS: Vendor[] = [
  {
    id: 'VEND-001',
    name: 'ABC Manufacturing',
    contact: 'John Smith',
    email: 'john@abcmanufacturing.com',
    phone: '+1 (555) 234-5678',
    performanceScore: 92,
    delayedOrders: 3,
    totalOrders: 125,
    avgDeliveryDays: 18,
    country: 'China',
  },
  {
    id: 'VEND-002',
    name: 'XYZ Logistics & Textiles',
    contact: 'Emily Vance',
    email: 'emily@xyztextiles.com',
    phone: '+1 (555) 876-5432',
    performanceScore: 88,
    delayedOrders: 1,
    totalOrders: 80,
    avgDeliveryDays: 22,
    country: 'India',
  },
  {
    id: 'VEND-003',
    name: 'Global Tech Sourcing',
    contact: 'Liam Kuan',
    email: 'liam@globaltech.com',
    phone: '+84 24 3783 1234',
    performanceScore: 74,
    delayedOrders: 5,
    totalOrders: 45,
    avgDeliveryDays: 29,
    country: 'Vietnam',
  },
  {
    id: 'VEND-004',
    name: 'Shenzhen Electronics Corp',
    contact: 'Sophia Wang',
    email: 'sophia@shenzhenecon.com',
    phone: '+86 755 8320 0000',
    performanceScore: 96,
    delayedOrders: 0,
    totalOrders: 300,
    avgDeliveryDays: 14,
    country: 'China',
  },
  {
    id: 'VEND-005',
    name: 'Eurocraft Spares GmbH',
    contact: 'Hans Müller',
    email: 'hans@eurocraft.de',
    phone: '+49 89 2444 0000',
    performanceScore: 89,
    delayedOrders: 2,
    totalOrders: 50,
    avgDeliveryDays: 16,
    country: 'Germany',
  },
];

// Initial Mock Purchase Orders
export const INITIAL_POS: PurchaseOrder[] = [];

// Initial Email Tracking History
export const INITIAL_EMAILS: EmailLog[] = [
  {
    id: 'EML-101',
    poId: 'PO-10025',
    subject: 'Production Status Inquiry: PO-10025',
    sentAt: '2026-06-20 09:00',
    status: 'Replied',
    openCount: 3,
    lastOpenTime: '2026-06-20 11:15',
    linkClicks: 1,
    repliedAt: '2026-06-22 13:20',
    attachmentName: 'production_timeline.pdf',
  },
  {
    id: 'EML-102',
    poId: 'PO-10025',
    subject: 'Drawing Specifications Confirmation PO-10025',
    sentAt: '2026-06-16 14:35',
    status: 'Opened',
    openCount: 2,
    lastOpenTime: '2026-06-17 08:44',
    linkClicks: 0,
    repliedAt: null,
    attachmentName: 'drawing_spec_v3.dwg',
  },
  {
    id: 'EML-103',
    poId: 'PO-10027',
    subject: 'URGENT: Delayed Production Notice - PO-10027',
    sentAt: '2026-06-22 08:30',
    status: 'Opened',
    openCount: 4,
    lastOpenTime: '2026-06-23 15:40',
    linkClicks: 2,
    repliedAt: null,
    attachmentName: 'DelayedPO_Report.csv',
  },
  {
    id: 'EML-104',
    poId: 'PO-10027',
    subject: 'Required Material Certificates PO-10027',
    sentAt: '2026-05-25 10:10',
    status: 'Delivered',
    openCount: 1,
    lastOpenTime: '2026-05-25 11:02',
    linkClicks: 0,
    repliedAt: null,
    attachmentName: null,
  },
  {
    id: 'EML-105',
    poId: 'PO-10030',
    subject: 'CRITICAL DELAY ALERT: PO-10030 - OLED Panels',
    sentAt: '2026-06-15 11:22',
    status: 'Replied',
    openCount: 6,
    lastOpenTime: '2026-06-16 09:33',
    linkClicks: 3,
    repliedAt: '2026-06-18 10:15',
    attachmentName: 'SubcontractorDelay_Reason.docx',
  },
  {
    id: 'EML-106',
    poId: 'PO-10031',
    subject: 'Invoice Discrepancy Correction Needed: PO-10031',
    sentAt: '2026-06-26 15:00',
    status: 'Sent',
    openCount: 0,
    lastOpenTime: null,
    linkClicks: 0,
    repliedAt: null,
    attachmentName: 'rejection_invoice_audit.xlsx',
  },
];

// Initial Internal Comments
export const INITIAL_COMMENTS: Comment[] = [
  {
    id: 'COM-001',
    poId: 'PO-10025',
    user: 'John Smith',
    role: 'Vendor',
    message:
      'We are finishing materials preparation. Moving to assembly line by tomorrow.',
    timestamp: '2026-06-16 10:05',
  },
  {
    id: 'COM-002',
    poId: 'PO-10025',
    user: 'John Doe',
    role: 'Purchasing',
    message:
      'Thank you John. Please confirm if ETA of July 25th remains secure.',
    timestamp: '2026-06-16 11:15',
  },
  {
    id: 'COM-003',
    poId: 'PO-10025',
    user: 'Emily Rose',
    role: 'Warehouse',
    message:
      'Noting container CNT-025 is reserved for this batch. Warehouse slot allocated.',
    timestamp: '2026-06-20 14:20',
  },
  {
    id: 'COM-004',
    poId: 'PO-10025',
    user: 'Michael Chang',
    role: 'Finance',
    message:
      'Waiting for preliminary invoice from ABC to initiate LC credit approval.',
    timestamp: '2026-06-22 09:12',
  },
  {
    id: 'COM-005',
    poId: 'PO-10025',
    user: 'John Smith',
    role: 'Vendor',
    message:
      'LC parameters look good. Will upload invoice draft here by Monday.',
    timestamp: '2026-06-24 16:30',
  },
  {
    id: 'COM-006',
    poId: 'PO-10027',
    user: 'Liam Kuan',
    role: 'Vendor',
    message:
      'Awaiting semiconductor allocation from upstream supplier. Apologies for delay.',
    timestamp: '2026-06-05 09:00',
  },
  {
    id: 'COM-007',
    poId: 'PO-10027',
    user: 'John Doe',
    role: 'Purchasing',
    message:
      'This microprocessor delay halts our entire assembly. Can we expedite sourcing?',
    timestamp: '2026-06-08 11:30',
  },
  {
    id: 'COM-008',
    poId: 'PO-10027',
    user: 'Emily Rose',
    role: 'Warehouse',
    message: 'Slot rescheduled. Logistics delay flagged to management.',
    timestamp: '2026-06-12 15:45',
  },
];

// Initial Chat Messages (Linked by general channels)
export const INITIAL_CHAT: ChatMessage[] = [
  {
    id: 'CHT-001',
    channel: 'purchasing',
    user: 'John Doe',
    role: 'Purchasing',
    message:
      'Hello team! Global Tech is experiencing substantial semiconductor delay. PO-10027 is pushed by 13 days.',
    timestamp: '2026-07-03 08:30',
  },
  {
    id: 'CHT-002',
    channel: 'purchasing',
    user: 'Michael Chang',
    role: 'Finance',
    message:
      'Should we withhold LC release for their secondary order PO-10030 to mitigate risk?',
    timestamp: '2026-07-03 08:45',
  },
  {
    id: 'CHT-003',
    channel: 'warehouse',
    user: 'Emily Rose',
    role: 'Warehouse',
    message:
      'Receiving dock is extremely congested. CNT-099 (Shenzhen Electronics) arriving today, need finance clearance.',
    timestamp: '2026-07-03 09:00',
  },
  {
    id: 'CHT-004',
    channel: 'finance',
    user: 'Michael Chang',
    role: 'Finance',
    message:
      'Shenzhen Electronics invoice approved. Tax & customs paid. Emily, you are clear to accept CNT-099.',
    timestamp: '2026-07-03 09:15',
  },
  {
    id: 'CHT-005',
    channel: 'management',
    user: 'Sarah Jenkins',
    role: 'Administrator',
    message:
      'Weekly KPI review: Delay rates went up 4% due to Global Tech. Sourcing team, please identify backup micro-IC vendors in Vietnam or Taiwan.',
    timestamp: '2026-07-03 10:00',
  },
];

// Initial Notifications
export const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'NTF-001',
    type: 'delay',
    title: 'Critical Delay: PO-10030',
    message:
      'Global Tech Sourcing has delayed OLED panels shipment by 34 days.',
    timestamp: '2026-07-03 08:00',
    read: false,
    poId: 'PO-10030',
  },
  {
    id: 'NTF-002',
    type: 'invoice',
    title: 'Invoice Action Required: PO-10031',
    message:
      'Invoice EC-99122-REJ was rejected by Finance. Please upload correction.',
    timestamp: '2026-07-02 16:30',
    read: false,
    poId: 'PO-10031',
  },
  {
    id: 'NTF-003',
    type: 'container',
    title: 'Container Arrival Today: CNT-099',
    message:
      'Container carrying Shenzhen Electronics USB-C cables has cleared port gate.',
    timestamp: '2026-07-03 07:15',
    read: false,
    poId: 'PO-10028',
  },
  {
    id: 'NTF-004',
    type: 'comment',
    title: 'New Comment on PO-10025',
    message:
      'Michael Chang (Finance) added a comment regarding LC Approval status.',
    timestamp: '2026-07-02 11:12',
    read: true,
    poId: 'PO-10025',
  },
  {
    id: 'NTF-005',
    type: 'sync',
    title: 'Sellercloud Sync Complete',
    message: 'Check completed. 0 new POs downloaded, 3 PO statuses updated.',
    timestamp: '2026-07-03 05:10',
    read: true,
  },
];

// Initial Activity Logs
export const INITIAL_ACTIVITIES: ActivityLog[] = [
  {
    id: 'ACT-001',
    timestamp: '2026-07-03 10:05',
    user: 'John Doe',
    role: 'Purchasing',
    message: 'Modified shipment tracking container to CNT-025 on PO-10025',
    type: 'PO Updated',
    poId: 'PO-10025',
  },
  {
    id: 'ACT-002',
    timestamp: '2026-07-03 10:15',
    user: 'System Bot',
    role: 'Administrator',
    message: 'Sent follow-up reminder email to ABC Manufacturing for PO-10025',
    type: 'Email Sent',
    poId: 'PO-10025',
  },
  {
    id: 'ACT-003',
    timestamp: '2026-07-03 10:20',
    user: 'Emily Rose',
    role: 'Warehouse',
    message:
      'Uploaded shipping invoice copy for PO-10026, triggering automatic OCR check',
    type: 'Invoice Uploaded',
    poId: 'PO-10026',
  },
  {
    id: 'ACT-004',
    timestamp: '2026-07-03 10:35',
    user: 'Sophia Wang',
    role: 'Vendor',
    message:
      'Added progress update comment on PO-10028: "All materials validated, ship loading booked."',
    type: 'Vendor Comment',
    poId: 'PO-10028',
  },
  {
    id: 'ACT-005',
    timestamp: '2026-07-03 10:40',
    user: 'System Bot',
    role: 'Administrator',
    message: 'Triggered manual Sellercloud data sync session',
    type: 'Sync',
  },
];

// Initial Audit Logs (detailed accountability logs)
export const INITIAL_AUDITS: AuditLog[] = [
  {
    id: 'AUD-001',
    timestamp: '2026-07-03 10:05:14',
    user: 'John Doe (john@aerocrm.com)',
    action: 'Update Shipping Container ID',
    poId: 'PO-10025',
    previousValue: 'CNT-EMPTY',
    newValue: 'CNT-025',
    browser: 'Chrome 122.0.0.0 (Linux)',
    ip: '192.168.1.144',
  },
  {
    id: 'AUD-002',
    timestamp: '2026-07-03 10:08:22',
    user: 'Michael Chang (finance@aerocrm.com)',
    action: 'Change Invoice Approval Status',
    poId: 'PO-10028',
    previousValue: 'Uploaded',
    newValue: 'Approved',
    browser: 'Safari 17.2 (macOS)',
    ip: '172.56.21.99',
  },
  {
    id: 'AUD-003',
    timestamp: '2026-07-02 14:15:01',
    user: 'Sarah Jenkins (admin@aerocrm.com)',
    action: 'Update Vendor Contract Details',
    poId: 'VEND-001',
    previousValue: 'John Smith (Oversight Manager)',
    newValue: 'John Smith (Direct Operations Lead)',
    browser: 'Firefox 121.1 (Windows 11)',
    ip: '8.8.8.8',
  },
];

// Initial Sync Logs
export const INITIAL_SYNCS: SellercloudSyncLog[] = [
  {
    id: 'SYN-001',
    timestamp: '2026-07-03 05:10:00',
    newOrdersCount: 0,
    updatedOrdersCount: 3,
    status: 'Success',
    durationMs: 1420,
  },
  {
    id: 'SYN-002',
    timestamp: '2026-07-03 05:00:00',
    newOrdersCount: 1,
    updatedOrdersCount: 1,
    status: 'Success',
    durationMs: 1850,
  },
  {
    id: 'SYN-003',
    timestamp: '2026-07-03 04:50:00',
    newOrdersCount: 0,
    updatedOrdersCount: 0,
    status: 'Success',
    durationMs: 980,
  },
  {
    id: 'SYN-004',
    timestamp: '2026-07-03 04:40:00',
    newOrdersCount: 0,
    updatedOrdersCount: 1,
    status: 'Failed',
    durationMs: 5000, // timeout
  },
];

// LocalStorage Helper to manage state easily in the client
export class CRMStore {
  static get<T>(key: string, initial: T): T {
    try {
      const stored = localStorage.getItem(`crm_${key}`);
      return stored ? JSON.parse(stored) : initial;
    } catch {
      return initial;
    }
  }

  static set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(`crm_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error('Failed to store state in local storage', e);
    }
  }

  static getPurchaseOrders(): PurchaseOrder[] {
    const pos = this.get<PurchaseOrder[]>('purchase_orders', INITIAL_POS);
    // Remove only legacy mock POs (ID starting with PO-100 without a uuid)
    return pos.filter((po) => !(po.id.startsWith('PO-100') && !po.uuid));
  }

  static setPurchaseOrders(pos: PurchaseOrder[]): void {
    this.set('purchase_orders', pos);
  }

  static getVendors(): Vendor[] {
    return this.get<Vendor[]>('vendors', INITIAL_VENDORS);
  }

  static setVendors(vendors: Vendor[]): void {
    this.set('vendors', vendors);
  }

  static getEmails(): EmailLog[] {
    return this.get<EmailLog[]>('emails', INITIAL_EMAILS);
  }

  static setEmails(emails: EmailLog[]): void {
    this.set('emails', emails);
  }

  static getComments(): Comment[] {
    return this.get<Comment[]>('comments', INITIAL_COMMENTS);
  }

  static setComments(comments: Comment[]): void {
    this.set('comments', comments);
  }

  static getChats(): ChatMessage[] {
    return this.get<ChatMessage[]>('chats', INITIAL_CHAT);
  }

  static setChats(chats: ChatMessage[]): void {
    this.set('chats', chats);
  }

  static getNotifications(): Notification[] {
    return this.get<Notification[]>('notifications', INITIAL_NOTIFICATIONS);
  }

  static setNotifications(notifications: Notification[]): void {
    this.set('notifications', notifications);
  }

  static getActivities(): ActivityLog[] {
    return this.get<ActivityLog[]>('activities', INITIAL_ACTIVITIES);
  }

  static setActivities(activities: ActivityLog[]): void {
    this.set('activities', activities);
  }

  static getAudits(): AuditLog[] {
    return this.get<AuditLog[]>('audits', INITIAL_AUDITS);
  }

  static setAudits(audits: AuditLog[]): void {
    this.set('audits', audits);
  }

  static getSyncs(): SellercloudSyncLog[] {
    return this.get<SellercloudSyncLog[]>('syncs', INITIAL_SYNCS);
  }

  static setSyncs(syncs: SellercloudSyncLog[]): void {
    this.set('syncs', syncs);
  }

  static resetAll(): void {
    localStorage.removeItem('crm_purchase_orders');
    localStorage.removeItem('crm_vendors');
    localStorage.removeItem('crm_emails');
    localStorage.removeItem('crm_comments');
    localStorage.removeItem('crm_chats');
    localStorage.removeItem('crm_notifications');
    localStorage.removeItem('crm_activities');
    localStorage.removeItem('crm_audits');
    localStorage.removeItem('crm_syncs');
  }
}
