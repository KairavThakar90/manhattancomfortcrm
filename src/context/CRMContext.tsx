import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { CRMStore } from '../data';
import {
  UserRole,
  PurchaseOrder,
  Vendor,
  EmailLog,
  Comment,
  ChatMessage,
  Notification,
  ActivityLog,
  AuditLog,
  SellercloudSyncLog,
} from '../types';

export const CRMContext = createContext<any>(null);

export const CRMProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('Administrator');
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [syncLogs, setSyncLogs] = useState<SellercloudSyncLog[]>([]);
  const [selectedPOId, setSelectedPOId] = useState<string | null>(null);

  useEffect(() => {
    setPurchaseOrders(CRMStore.getPurchaseOrders());
    setVendors(CRMStore.getVendors());
    setEmailLogs(CRMStore.getEmails());
    setComments(CRMStore.getComments());
    setChats(CRMStore.getChats());
    setNotifications(CRMStore.getNotifications());
    setActivityLogs(CRMStore.getActivities());
    setAuditLogs(CRMStore.getAudits());
    setSyncLogs(CRMStore.getSyncs());
  }, []);

  const handleUpdatePOs = (newPOs: PurchaseOrder[]) => {
    setPurchaseOrders(newPOs);
    CRMStore.setPurchaseOrders(newPOs);
  };

  const handleUpdateVendors = (updatedVendor: Vendor) => {
    const updated = vendors.map((v) =>
      v.id === updatedVendor.id ? updatedVendor : v,
    );
    setVendors(updated);
    CRMStore.setVendors(updated);
  };

  const handleAddEmailLog = (newEmail: EmailLog) => {
    const updated = [newEmail, ...emailLogs];
    setEmailLogs(updated);
    CRMStore.setEmails(updated);

    const updatedPOs = purchaseOrders.map((p) => {
      if (p.id === newEmail.poId) {
        return { ...p, emailCount: (p.emailCount || 0) + 1 };
      }
      return p;
    });
    handleUpdatePOs(updatedPOs);
  };

  const handleAddComment = (newComment: Comment) => {
    const updated = [newComment, ...comments];
    setComments(updated);
    CRMStore.setComments(updated);

    const updatedPOs = purchaseOrders.map((p) => {
      if (p.id === newComment.poId) {
        return { ...p, commentsCount: (p.commentsCount || 0) + 1 };
      }
      return p;
    });
    handleUpdatePOs(updatedPOs);
  };

  const handleAddChatMessage = (newMsg: ChatMessage) => {
    const updated = [...chats, newMsg];
    setChats(updated);
    CRMStore.setChats(updated);
  };

  const handleAddActivity = (
    msg: string,
    type: 'PO Updated' | 'Email Sent' | 'Invoice Uploaded' | 'Vendor Comment',
  ) => {
    const newLog: ActivityLog = {
      id: `ACT-${Math.floor(200 + Math.random() * 800)}`,
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      user: 'You',
      role: userRole,
      message: msg,
      type,
      poId: selectedPOId || undefined,
    };
    const updated = [newLog, ...activityLogs];
    setActivityLogs(updated);
    CRMStore.setActivities(updated);

    const newAudit: AuditLog = {
      id: `AUD-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      user: `You (${userRole})`,
      action: msg,
      poId: selectedPOId || undefined,
      previousValue: 'N/A',
      newValue: 'Action Triggered',
      browser: 'Chrome (Linux)',
      ip: '192.168.1.1',
    };
    const updatedAudits = [newAudit, ...auditLogs];
    setAuditLogs(updatedAudits);
    CRMStore.setAudits(updatedAudits);
  };

  const handleAddAudit = (
    poId: string,
    action: string,
    prev: string,
    next: string,
    browser?: string,
    ip?: string,
  ) => {
    const newAudit: AuditLog = {
      id: 'AUD-' + Math.floor(100 + Math.random() * 900),
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      user: 'You (' + userRole + ')',
      action,
      poId,
      previousValue: prev,
      newValue: next,
      browser: browser || 'Chrome (Linux)',
      ip: ip || '127.0.0.1',
    };
    const updatedAudits = [newAudit, ...auditLogs];
    setAuditLogs(updatedAudits);
    CRMStore.setAudits(updatedAudits);
  };

  const handleTriggerSync = () => {
    const newSync: SellercloudSyncLog = {
      id: `SYN-${Math.floor(200 + Math.random() * 800)}`,
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      newOrdersCount: 0,
      updatedOrdersCount: 3,
      status: 'Success',
      durationMs: 1450,
      triggerMethod: 'Manual Override',
    };
    const updatedSyncs = [newSync, ...syncLogs];
    setSyncLogs(updatedSyncs);
    CRMStore.setSyncs(updatedSyncs);

    const newNtf: Notification = {
      id: `NTF-${Math.floor(500 + Math.random() * 500)}`,
      type: 'sync',
      title: 'Sellercloud Sync Successful',
      message:
        'Sourcing ledger aligned with Sellercloud. Checked 5 shipping stages.',
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      read: false,
    };
    const updatedNtfs = [newNtf, ...notifications];
    setNotifications(updatedNtfs);
    CRMStore.setNotifications(updatedNtfs);

    const updatedPOs = purchaseOrders.map((p) => {
      if (p.id === 'PO-10027') {
        return {
          ...p,
          productionStage: 'Assembly',
          commentsCount: (p.commentsCount || 0) + 1,
        };
      }
      return p;
    });
    handleUpdatePOs(updatedPOs);
  };

  const handleNotificationClick = (ntf: Notification) => {
    const updated = notifications.map((n) =>
      n.id === ntf.id ? { ...n, read: true } : n,
    );
    setNotifications(updated);
    CRMStore.setNotifications(updated);
  };

  const handleMarkAllNotificationsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    CRMStore.setNotifications(updated);
  };

  return (
    <CRMContext.Provider
      value={{
        isAuthenticated,
        setIsAuthenticated,
        userRole,
        setUserRole,
        purchaseOrders,
        setPurchaseOrders,
        handleUpdatePOs,
        vendors,
        setVendors,
        handleUpdateVendors,
        emailLogs,
        setEmailLogs,
        handleAddEmailLog,
        comments,
        setComments,
        handleAddComment,
        chats,
        setChats,
        handleAddChatMessage,
        notifications,
        setNotifications,
        handleNotificationClick,
        handleMarkAllNotificationsRead,
        activityLogs,
        setActivityLogs,
        handleAddActivity,
        auditLogs,
        setAuditLogs,
        handleAddAudit,
        syncLogs,
        setSyncLogs,
        handleTriggerSync,
        selectedPOId,
        setSelectedPOId,
      }}
    >
      {children}
    </CRMContext.Provider>
  );
};
