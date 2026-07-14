import React, { useState, useEffect } from 'react';
import {
  BarChart3, FileSpreadsheet, Users, Mail, MessageSquare, Sparkles,
  Settings, Bell, RefreshCw, Layers, Shield, HelpCircle, User, LogOut,
  TrendingUp, AlertTriangle, FileText, CheckCircle2, ChevronRight, X
} from 'lucide-react';
import { CRMStore } from './data';
import { UserRole, PurchaseOrder, Vendor, EmailLog, Comment, ChatMessage, Notification, ActivityLog, AuditLog, SellercloudSyncLog } from './types';

// Import our custom modules
import ExecutiveDashboard from './components/ExecutiveDashboard';
import POManagement from './components/POManagement';
import VendorManagement from './components/VendorManagement';
import EmailCenter from './components/EmailCenter';
import TeamChat from './components/TeamChat';
import AIAssistant from './components/AIAssistant';
import ReportsAnalytics from './components/ReportsAnalytics';
import AdminPanel from './components/AdminPanel';
import LoginPage from './components/LoginPage';

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Navigation & Active Session States
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [userRole, setUserRole] = useState<UserRole>('Administrator');

  // Core CRM Datasets (persistent via CRMStore)
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [syncLogs, setSyncLogs] = useState<SellercloudSyncLog[]>([]);

  // Selected PO state (linked from search or notification jumps)
  const [selectedPOId, setSelectedPOId] = useState<string | null>(null);

  // Notification center slideover state
  const [showNotifications, setShowNotifications] = useState(false);

  // Load state on mount
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

  // Syncing helpers
  const handleUpdatePOs = (newPOs: PurchaseOrder[]) => {
    setPurchaseOrders(newPOs);
    CRMStore.setPurchaseOrders(newPOs);
  };

  const handleUpdateVendors = (updatedVendor: Vendor) => {
    const updated = vendors.map(v => v.id === updatedVendor.id ? updatedVendor : v);
    setVendors(updated);
    CRMStore.setVendors(updated);
  };

  const handleAddEmailLog = (newEmail: EmailLog) => {
    const updated = [newEmail, ...emailLogs];
    setEmailLogs(updated);
    CRMStore.setEmails(updated);

    // Also update PO counter
    const updatedPOs = purchaseOrders.map(p => {
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

    // Update PO comments counter
    const updatedPOs = purchaseOrders.map(p => {
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

  const handleAddActivity = (msg: string, type: 'PO Updated' | 'Email Sent' | 'Invoice Uploaded' | 'Vendor Comment') => {
    const newLog: ActivityLog = {
      id: `ACT-${Math.floor(200 + Math.random() * 800)}`,
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      user: 'You',
      role: userRole,
      message: msg,
      type,
      poId: selectedPOId || undefined
    };
    const updated = [newLog, ...activityLogs];
    setActivityLogs(updated);
    CRMStore.setActivities(updated);

    // Add Audit log as well for deep compliance tracking
    const newAudit: AuditLog = {
      id: `AUD-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      user: `You (${userRole})`,
      action: msg,
      poId: selectedPOId || undefined,
      previousValue: 'N/A',
      newValue: 'Action Triggered',
      browser: 'Chrome (Linux)',
      ip: '192.168.1.1'
    };
    const updatedAudits = [newAudit, ...auditLogs];
    setAuditLogs(updatedAudits);
    CRMStore.setAudits(updatedAudits);
  };

  // Automated 10-Min Sellercloud Sync Trigger (Rule 3)
  const handleTriggerSync = () => {
    // Generate fresh sync log entry
    const newSync: SellercloudSyncLog = {
      id: `SYN-${Math.floor(200 + Math.random() * 800)}`,
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      newOrdersCount: 0,
      updatedOrdersCount: 3,
      status: 'Success',
      durationMs: 1450,
      triggerMethod: 'Manual Override'
    };

    const updatedSyncs = [newSync, ...syncLogs];
    setSyncLogs(updatedSyncs);
    CRMStore.setSyncs(updatedSyncs);

    // Seed new sync notification
    const newNtf: Notification = {
      id: `NTF-${Math.floor(500 + Math.random() * 500)}`,
      type: 'sync',
      title: 'Sellercloud Sync Successful',
      message: 'Sourcing ledger aligned with Sellercloud. Checked 5 shipping stages.',
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      read: false
    };
    const updatedNtfs = [newNtf, ...notifications];
    setNotifications(updatedNtfs);
    CRMStore.setNotifications(updatedNtfs);

    // Also clear a delay slightly to make the mockup highly interactive
    const updatedPOs = purchaseOrders.map(p => {
      if (p.id === 'PO-10027') {
        return { ...p, productionStage: 'Assembly', commentsCount: p.commentsCount + 1 };
      }
      return p;
    });
    handleUpdatePOs(updatedPOs);
  };

  // Jump from notification click to PO Profile
  const handleNotificationClick = (ntf: Notification) => {
    // Mark as read
    const updated = notifications.map(n => n.id === ntf.id ? { ...n, read: true } : n);
    setNotifications(updated);
    CRMStore.setNotifications(updated);

    if (ntf.poId) {
      setSelectedPOId(ntf.poId);
      setActiveTab('purchase-orders');
      setShowNotifications(false);
    }
  };

  const handleMarkAllNotificationsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    CRMStore.setNotifications(updated);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
      {/* 1. INTERACTIVE NAVIGATION SIDEBAR */}
      <aside className="w-68 bg-indigo-950 text-indigo-200 flex flex-col justify-between p-5 border-r border-indigo-900 flex-shrink-0 select-none">
        <div className="space-y-6">
          {/* Brand Badge */}
          <div className="flex items-center gap-3 px-2">
            <div className="h-9 w-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-xs font-bold border border-indigo-500">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-white text-sm tracking-tight">Manhattan Comfort</h1>
              <span className="text-[10px] text-indigo-400 font-mono tracking-widest uppercase font-bold">PO & CRM</span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1">
            {[
              { id: 'dashboard', label: 'Executive Dashboard', icon: BarChart3 },
              { id: 'purchase-orders', label: 'Purchase Orders', icon: FileSpreadsheet },
              { id: 'vendors', label: 'Sourcing Vendors', icon: Users },
              { id: 'email-center', label: 'Sourcing Email Hub', icon: Mail },
              { id: 'chat', label: 'Workspace Team Chat', icon: MessageSquare },
              { id: 'ai-assistant', label: 'S&OP AI Assistant', icon: Sparkles },
              { id: 'reports', label: 'Reports & BI Analytics', icon: TrendingUp },
              { id: 'system-admin', label: 'Security Admin Panel', icon: Shield },
            ].map(tab => {
              const IconComp = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id !== 'purchase-orders') {
                      setSelectedPOId(null);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition ${isActive
                    ? 'bg-indigo-600 text-white shadow-sm font-bold border border-indigo-500'
                    : 'hover:bg-indigo-900/45 hover:text-indigo-100 text-indigo-300'
                    }`}
                >
                  <IconComp className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-indigo-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User context footer */}
        <div className="border-t border-indigo-900/60 pt-4 flex items-center gap-3 px-2">
          <div className="h-9 w-9 bg-indigo-800 rounded-full flex items-center justify-center font-bold text-white shadow-xs">
            {userRole.slice(0, 1)}
          </div>
          <div className="text-xs">
            <span className="block text-indigo-300 font-bold">You</span>
            <span className="block text-[9px] bg-indigo-900 text-indigo-300 px-1.5 py-0.2 rounded-sm font-mono mt-0.5 uppercase tracking-wider font-extrabold">
              {userRole} Privilege
            </span>
          </div>
        </div>
      </aside>

      {/* Main Outer Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* TOP INTERACTIVE CONTROL HEADER */}
        <header className="h-16 bg-white border-b border-slate-100 flex-shrink-0 px-6 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-extrabold text-slate-900 text-sm tracking-tight uppercase">
              {activeTab.replace('-', ' ')}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Sellercloud Sync Status & Button */}
            <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-400 font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Sellercloud Connected (10m interval active)</span>
            </div>

            <button
              onClick={handleTriggerSync}
              className="p-2 hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-lg shadow-2xs transition"
              title="Trigger manual Sellercloud sync"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            {/* Notifications trigger with Red badge */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-lg shadow-2xs transition"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-rose-600 text-white rounded-full text-[9px] font-extrabold flex items-center justify-center animate-bounce shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* FLOATING NOTIFICATION CENTER SLIDEOVER */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 p-4 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                    <span className="text-xs font-bold text-slate-800">Sourcing Alerts Desk</span>
                    <button
                      onClick={handleMarkAllNotificationsRead}
                      className="text-[10px] text-indigo-600 hover:underline font-semibold"
                    >
                      Clear alerts
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                    {notifications.map(ntf => (
                      <div
                        key={ntf.id}
                        onClick={() => handleNotificationClick(ntf)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition ${ntf.read ? 'bg-white border-slate-100 text-slate-500' : 'bg-indigo-50/30 border-indigo-100 text-slate-800 font-medium'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[11px]">{ntf.title}</span>
                          <span className="text-[8px] text-slate-400 font-mono">{ntf.timestamp.split(' ')[1]}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 leading-normal">{ntf.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Session user tag */}
            <div className="flex items-center gap-2 text-xs border border-slate-100 p-1.5 pr-3 rounded-lg bg-slate-50/50">
              <div className="h-6 w-6 bg-indigo-600 text-white rounded-md flex items-center justify-center font-bold text-xs uppercase shadow-2xs">
                {userRole.slice(0, 1)}
              </div>
              <span className="font-bold text-slate-800 text-[11px]">{userRole} view</span>
            </div>
          </div>
        </header>

        {/* INTERNAL VIEWPORT PORTAL */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'dashboard' && (
            <ExecutiveDashboard
              purchaseOrders={purchaseOrders}
              vendors={vendors}
              syncLogs={syncLogs}
              onTriggerSync={handleTriggerSync}
              isSyncing={false}
              onNavigateToTab={(tab) => {
                setActiveTab(tab);
                if (tab !== 'purchase-orders') setSelectedPOId(null);
              }}
              onSelectPO={(id) => {
                setSelectedPOId(id);
                setActiveTab('purchase-orders');
              }}
              userRole={userRole}
            />
          )}

          {activeTab === 'purchase-orders' && (
            <POManagement
              purchaseOrders={purchaseOrders}
              vendors={vendors}
              comments={comments}
              emails={emailLogs}
              userRole={userRole}
              selectedPOId={selectedPOId}
              onSelectPO={setSelectedPOId}
              onUpdatePO={(po) => {
                const updated = purchaseOrders.map(p => p.id === po.id ? po : p);
                handleUpdatePOs(updated);
              }}
              onAddComment={handleAddComment}
              onAddEmailLog={handleAddEmailLog}
              onAddActivity={handleAddActivity}
              onAddAudit={(poId, action, prev, next, browser, ip) => {
                const newAudit: AuditLog = {
                  id: 'AUD-' + Math.floor(100 + Math.random() * 900),
                  timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
                  user: 'You (' + userRole + ')',
                  action,
                  poId,
                  previousValue: prev,
                  newValue: next,
                  browser: browser || 'Chrome (Linux)',
                  ip: ip || '127.0.0.1'
                };
                const updatedAudits = [newAudit, ...auditLogs];
                setAuditLogs(updatedAudits);
                CRMStore.setAudits(updatedAudits);
              }}
            />
          )}

          {activeTab === 'vendors' && (
            <VendorManagement
              vendors={vendors}
              purchaseOrders={purchaseOrders}
              onUpdateVendor={handleUpdateVendors}
              onAddActivity={handleAddActivity}
            />
          )}

          {activeTab === 'email-center' && (
            <EmailCenter
              emails={emailLogs}
              purchaseOrders={purchaseOrders}
              vendors={vendors}
              onAddEmailLog={handleAddEmailLog}
              onAddActivity={handleAddActivity}
            />
          )}

          {activeTab === 'chat' && (
            <TeamChat
              chats={chats}
              purchaseOrders={purchaseOrders}
              userRole={userRole}
              onAddChatMessage={handleAddChatMessage}
              onAddActivity={handleAddActivity}
            />
          )}

          {activeTab === 'ai-assistant' && (
            <AIAssistant
              purchaseOrders={purchaseOrders}
              vendors={vendors}
              onSelectPO={(id) => { setSelectedPOId(id); setActiveTab('purchase-orders'); }}
              onNavigateToTab={(tab) => { setActiveTab(tab); if (tab !== 'purchase-orders') setSelectedPOId(null); }}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsAnalytics
              purchaseOrders={purchaseOrders}
              vendors={vendors}
            />
          )}

          {activeTab === 'system-admin' && (
            <AdminPanel
              activityLogs={activityLogs}
              auditLogs={auditLogs}
              syncLogs={syncLogs}
              userRole={userRole}
              onChangeUserRole={setUserRole}
              onAddActivity={handleAddActivity}
              onTriggerSync={handleTriggerSync}
            />
          )}
        </div>
      </main>
    </div>
  );
}
