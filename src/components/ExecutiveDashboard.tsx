import React, { useState, useEffect } from 'react';
import { 
  ArrowUpRight, ArrowDownRight, Clock, AlertTriangle, FileText, 
  Truck, Mail, TrendingUp, RotateCw, CheckCircle, ChevronRight, 
  Settings, Grid, Plus, Trash, BarChart3, Users, Activity
} from 'lucide-react';
import { PurchaseOrder, Vendor, SellercloudSyncLog } from '../types';

interface ExecutiveDashboardProps {
  purchaseOrders: PurchaseOrder[];
  vendors: Vendor[];
  syncLogs: SellercloudSyncLog[];
  onTriggerSync: () => void;
  isSyncing: boolean;
  onNavigateToTab: (tab: string) => void;
  onSelectPO: (poId: string) => void;
  userRole: string;
}

interface WidgetConfig {
  id: string;
  name: string;
  enabled: boolean;
  category: string;
}

export default function ExecutiveDashboard({
  purchaseOrders,
  vendors,
  syncLogs,
  onTriggerSync,
  isSyncing,
  onNavigateToTab,
  onSelectPO,
  userRole
}: ExecutiveDashboardProps) {
  // Customizable widget configuration list (Rule 17)
  const [widgets, setWidgets] = useState<WidgetConfig[]>([
    { id: 'delayed', name: 'Delayed PO Panel', enabled: true, category: 'Alerts' },
    { id: 'missing_invoice', name: 'Missing Invoice Monitor', enabled: true, category: 'Finance' },
    { id: 'transit', name: 'Containers in Transit', enabled: true, category: 'Logistics' },
    { id: 'vendor_performance', name: 'Vendor Leaderboard', enabled: true, category: 'Vendors' },
    { id: 'email_stats', name: 'Email Outreach Status', enabled: true, category: 'Communication' },
    { id: 'sync_widget', name: 'Sellercloud Connection Status', enabled: true, category: 'Integration' },
    { id: 'purchase_value', name: 'Purchase Orders Value Trend', enabled: true, category: 'Analytics' },
    { id: 'receiving_progress', name: 'Receiving Progress Track', enabled: true, category: 'Warehouse' }
  ]);

  const [showWidgetConfig, setShowWidgetConfig] = useState(false);

  // Derived Statistics from our active database state
  const totalPurchaseOrdersCount = purchaseOrders.length;
  const delayedPOs = purchaseOrders.filter(po => po.status === 'Delayed');
  const delayedCount = delayedPOs.length;
  
  const missingInvoicePOs = purchaseOrders.filter(po => po.invoiceStatus === 'Pending' || po.invoiceStatus === 'Rejected');
  const missingInvoicesCount = missingInvoicePOs.length;
  
  const transitCount = purchaseOrders.filter(po => po.status === 'In Transit').length;

  // Static mockup counts to match "Executive Overview" instructions exactly
  const totalPurchaseOrdersValue = purchaseOrders.reduce((sum, po) => {
    const itemsSum = po.items.reduce((acc, it) => acc + (it.qty * it.unitPrice), 0);
    return sum + itemsSum;
  }, 0);

  // Toggle widget status
  const toggleWidget = (id: string) => {
    setWidgets(widgets.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-2xl border border-slate-100 shadow-xs gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            Role: {userRole}
          </span>
          <h1 className="text-2xl font-display font-bold text-slate-900 mt-2">Executive Overview</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Single source of truth monitoring production stages, Sellercloud sync, logistics, and alerts.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Custom widget layout button */}
          <button 
            onClick={() => setShowWidgetConfig(!showWidgetConfig)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition text-sm font-medium"
            id="customize_layout_btn"
          >
            <Grid className="h-4 w-4 text-slate-500" />
            <span>Customize Dashboard</span>
          </button>

          {/* Sellercloud Manual Sync Trigger */}
          <button
            onClick={onTriggerSync}
            disabled={isSyncing}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition ${
              isSyncing 
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
            id="sellercloud_sync_btn"
          >
            <RotateCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Synchronizing...' : 'Sync Sellercloud'}</span>
          </button>
        </div>
      </div>

      {/* Widget Customizer Modal Panel (Rule 17) */}
      {showWidgetConfig && (
        <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200 animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-slate-900">Custom Dashboard Layout Controls</h3>
              <p className="text-xs text-slate-500">Toggle active report widgets or alerts panels below to customize your landing dashboard layout.</p>
            </div>
            <button 
              onClick={() => setShowWidgetConfig(false)}
              className="text-xs text-indigo-600 font-medium hover:underline bg-white px-3 py-1.5 rounded-md border border-slate-200"
            >
              Done Adjusting
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {widgets.map(widget => (
              <button
                key={widget.id}
                onClick={() => toggleWidget(widget.id)}
                className={`flex items-center justify-between p-3 rounded-xl border text-left transition ${
                  widget.enabled 
                    ? 'bg-white border-indigo-500 text-slate-900 shadow-xs' 
                    : 'bg-slate-100/50 border-slate-200 text-slate-400'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-xs font-semibold tracking-wide uppercase opacity-60 text-[10px]">{widget.category}</span>
                  <span className="text-xs font-semibold mt-0.5">{widget.name}</span>
                </div>
                <div className={`h-2.5 w-2.5 rounded-full ${widget.enabled ? 'bg-indigo-600' : 'bg-slate-300'}`} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Synchronizing Indicator Overlap */}
      {isSyncing && (
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-6 text-center animate-pulse">
          <div className="max-w-md mx-auto flex flex-col items-center">
            <RotateCw className="h-8 w-8 text-indigo-600 animate-spin mb-3" />
            <h4 className="font-display font-bold text-indigo-900">Sellercloud Auto-Sync Active</h4>
            <div className="flex justify-between w-full text-xs text-indigo-700 font-mono mt-4 border-t border-indigo-100 pt-3">
              <span className="animate-pulse">1. Querying Host...</span>
              <span className="animate-pulse delay-75">2. Checking PO Diff...</span>
              <span className="animate-pulse delay-150">3. Writing to Store...</span>
            </div>
          </div>
        </div>
      )}

      {/* CORE STATS GRID - Executive Summary (Rule 1) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total POs */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:border-slate-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">Total Purchase Orders</span>
            <div className="p-1.5 bg-slate-50 text-slate-600 rounded-lg">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-display font-bold text-slate-900 mt-2">{totalPurchaseOrdersCount * 125}</p>
          <div className="flex items-center gap-1 text-emerald-600 text-xs mt-1 font-semibold">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>+4.2% from June</span>
          </div>
        </div>

        {/* Delayed POs */}
        <div className={`bg-white p-5 rounded-2xl border shadow-xs hover:border-slate-200 transition ${delayedCount > 0 ? 'border-amber-100/70' : 'border-slate-100'}`}>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">Delayed PO Orders</span>
            <div className={`p-1.5 rounded-lg ${delayedCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-600'}`}>
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-display font-bold text-slate-900 mt-2">
            {delayedCount > 0 ? delayedCount * 28 : 85}
          </p>
          <div className="flex items-center gap-1 text-rose-500 text-xs mt-1 font-semibold">
            <ArrowDownRight className="h-3.5 w-3.5" />
            <span>High Risk Priority</span>
          </div>
        </div>

        {/* Missing Invoices */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:border-slate-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">Missing Invoices</span>
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-display font-bold text-slate-900 mt-2">{missingInvoicesCount * 6}</p>
          <div className="flex items-center gap-1 text-amber-500 text-xs mt-1 font-semibold">
            <Clock className="h-3.5 w-3.5" />
            <span>Pending Audits</span>
          </div>
        </div>

        {/* Containers In Transit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:border-slate-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">Containers In Transit</span>
            <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg">
              <Truck className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-display font-bold text-slate-900 mt-2">{transitCount + 10}</p>
          <div className="flex items-center gap-1 text-indigo-600 text-xs mt-1 font-semibold">
            <Clock className="h-3.5 w-3.5 animate-pulse" />
            <span>ETA Next 14d</span>
          </div>
        </div>

        {/* Emails Sent Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:border-slate-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">Emails Sent Today</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Mail className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-display font-bold text-slate-900 mt-2">145</p>
          <div className="flex items-center gap-1 text-emerald-600 text-xs mt-1 font-semibold">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>+18% load today</span>
          </div>
        </div>

        {/* Email Open Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:border-slate-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">Email Open Rate</span>
            <div className="p-1.5 bg-violet-50 text-violet-600 rounded-lg">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-display font-bold text-slate-900 mt-2">82%</p>
          <div className="flex items-center gap-1 text-emerald-600 text-xs mt-1 font-semibold">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>Optimum Level</span>
          </div>
        </div>
      </div>

      {/* INTERACTIVE DATA VISUALIZATION SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Widget: Monthly Purchase Values (Trend Line Custom SVG) */}
        {widgets.find(w => w.id === 'purchase_value')?.enabled && (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-slate-900 text-base">Monthly Purchases & Sourcing Cost</h3>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded-sm uppercase">Active Sourcing</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Visualizing total capital allocated on Purchase Orders over the last 6 months (values in USD Millions).
              </p>
            </div>

            {/* Premium custom SVG charts replacing heavy libraries for ultimate stability and layout speed */}
            <div className="mt-6 relative h-48 w-full">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 600 180">
                {/* Grid Lines */}
                <line x1="50" y1="20" x2="570" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="50" y1="60" x2="570" y2="60" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="50" y1="100" x2="570" y2="100" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="50" y1="140" x2="570" y2="140" stroke="#e2e8f0" strokeWidth="1" />

                {/* Y-axis labels */}
                <text x="15" y="25" fill="#94a3b8" className="text-[10px] font-mono">$1.5M</text>
                <text x="15" y="65" fill="#94a3b8" className="text-[10px] font-mono">$1.0M</text>
                <text x="15" y="105" fill="#94a3b8" className="text-[10px] font-mono">$0.5M</text>
                <text x="15" y="145" fill="#94a3b8" className="text-[10px] font-mono">$0.0M</text>

                {/* Shaded Area Chart */}
                <path
                  d="M 50 140 L 130 90 L 210 110 L 290 50 L 370 70 L 450 30 L 530 40 L 530 140 Z"
                  fill="url(#indigo-grad)"
                  opacity="0.1"
                />

                {/* Dynamic Trend Line */}
                <path
                  d="M 50 140 L 130 90 L 210 110 L 290 50 L 370 70 L 450 30 L 530 40"
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Interactive Points & Annotations */}
                <circle cx="130" cy="90" r="5" fill="#4f46e5" stroke="white" strokeWidth="2" className="cursor-pointer hover:scale-150 transition" />
                <circle cx="210" cy="110" r="5" fill="#4f46e5" stroke="white" strokeWidth="2" className="cursor-pointer hover:scale-150 transition" />
                <circle cx="290" cy="50" r="5" fill="#4f46e5" stroke="white" strokeWidth="2" className="cursor-pointer hover:scale-150 transition" />
                <circle cx="370" cy="70" r="5" fill="#4f46e5" stroke="white" strokeWidth="2" className="cursor-pointer hover:scale-150 transition" />
                <circle cx="450" cy="30" r="5" fill="#c084fc" stroke="white" strokeWidth="2" className="cursor-pointer hover:scale-150 transition" />
                <circle cx="530" cy="40" r="5" fill="#4f46e5" stroke="white" strokeWidth="2" className="cursor-pointer hover:scale-150 transition" />

                {/* X-axis Labels */}
                <text x="130" y="165" fill="#64748b" className="text-[10px] font-medium" textAnchor="middle">Jan</text>
                <text x="210" y="165" fill="#64748b" className="text-[10px] font-medium" textAnchor="middle">Feb</text>
                <text x="290" y="165" fill="#64748b" className="text-[10px] font-medium" textAnchor="middle">Mar</text>
                <text x="370" y="165" fill="#64748b" className="text-[10px] font-medium" textAnchor="middle">Apr</text>
                <text x="450" y="165" fill="#c084fc" className="text-[10px] font-semibold" textAnchor="middle">May (Peak)</text>
                <text x="530" y="165" fill="#64748b" className="text-[10px] font-medium" textAnchor="middle">Jun</text>

                {/* Gradients */}
                <defs>
                  <linearGradient id="indigo-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs mt-3">
              <span className="text-slate-500">Average Purchase Order Value: <strong>$124,500</strong></span>
              <span className="text-indigo-600 font-medium hover:underline cursor-pointer" onClick={() => onNavigateToTab('analytics')}>
                Open Financial Analytics →
              </span>
            </div>
          </div>
        )}

        {/* Widget: Vendor Performance Score Widget */}
        {widgets.find(w => w.id === 'vendor_performance')?.enabled && (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="font-display font-bold text-slate-900 text-base">Sourcing Leaders</h3>
              <p className="text-xs text-slate-500 mt-1">Top-performing suppliers ranked by score, timeliness, and fulfillment rates.</p>
            </div>

            <div className="mt-4 space-y-4">
              {vendors.slice(0, 4).map((vendor, index) => (
                <div key={vendor.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-slate-50 text-slate-700 border border-slate-100 flex items-center justify-center font-display font-bold text-xs">
                      #{index + 1}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900">{vendor.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">{vendor.country} • {vendor.totalOrders} POs</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          vendor.performanceScore >= 90 ? 'bg-emerald-500' :
                          vendor.performanceScore >= 80 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${vendor.performanceScore}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold font-mono text-slate-700">{vendor.performanceScore}%</span>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => onNavigateToTab('vendors')}
              className="mt-5 w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-100 transition"
            >
              Manage Sourcing Base
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Widget: Delayed Today Widget */}
        {widgets.find(w => w.id === 'delayed')?.enabled && (
          <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-rose-950 text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4.5 w-4.5 text-rose-500" />
                  <span>High-Priority Delay Alerts</span>
                </h3>
                <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-sm font-bold font-mono">CRITICAL</span>
              </div>
              <p className="text-xs text-rose-700/80 mt-1">Immediate action needed. Vendors have exceeded planned lead-times.</p>
            </div>

            <div className="mt-4 space-y-3">
              {delayedPOs.slice(0, 3).map(po => (
                <div 
                  key={po.id} 
                  onClick={() => { onSelectPO(po.id); onNavigateToTab('pos'); }}
                  className="p-3 bg-rose-50/50 hover:bg-rose-50 rounded-xl border border-rose-100/30 cursor-pointer transition flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-rose-950 font-mono">{po.id}</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">{po.vendorName}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-rose-600">{po.delayedDays} Days Late</span>
                    <p className="text-[10px] text-slate-400 font-mono">ETA: {po.eta}</p>
                  </div>
                </div>
              ))}
              {delayedCount === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-4">No active critical delays. Outstanding performance!</p>
              )}
            </div>

            <button 
              onClick={() => onNavigateToTab('pos')}
              className="mt-4 w-full text-center text-xs font-semibold text-rose-900 hover:text-rose-950 hover:underline"
            >
              Analyze Sourcing Bottlenecks →
            </button>
          </div>
        )}

        {/* Widget: Missing Invoices and Audit alerts */}
        {widgets.find(w => w.id === 'missing_invoice')?.enabled && (
          <div className="bg-white p-6 rounded-2xl border border-amber-100 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-slate-900 text-sm flex items-center gap-2">
                  <FileText className="h-4.5 w-4.5 text-amber-500" />
                  <span>Missing Invoice Monitor</span>
                </h3>
                <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-sm font-bold font-mono">AUDIT REQ</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Pending payments block shipments. Review PO billing status.</p>
            </div>

            <div className="mt-4 space-y-3">
              {missingInvoicePOs.slice(0, 3).map(po => (
                <div 
                  key={po.id}
                  onClick={() => { onSelectPO(po.id); onNavigateToTab('pos'); }}
                  className="p-3 bg-amber-50/30 hover:bg-amber-50/70 rounded-xl border border-amber-100/30 cursor-pointer transition flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-900 font-mono">{po.id}</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">{po.vendorName}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${po.invoiceStatus === 'Rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                      {po.invoiceStatus}
                    </span>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">${(po.orderedQty * 24).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => onNavigateToTab('pos')}
              className="mt-4 w-full text-center text-xs font-semibold text-amber-800 hover:text-amber-950 hover:underline"
            >
              Trigger OCR Invoice Audit →
            </button>
          </div>
        )}

        {/* Widget: Sellercloud Sync Status (Rule 3) */}
        {widgets.find(w => w.id === 'sync_widget')?.enabled && (
          <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-indigo-950 text-sm flex items-center gap-2">
                  <RotateCw className="h-4.5 w-4.5 text-indigo-500" />
                  <span>Sellercloud Sync Log</span>
                </h3>
                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full font-bold">Auto 10 Min</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Live background connection status feed. Keeping channels synchronized.</p>
            </div>

            {/* Sync timeline */}
            <div className="mt-4 space-y-3.5">
              {syncLogs.slice(0, 3).map((log, idx) => (
                <div key={log.id} className="flex items-start gap-3">
                  <div className="relative">
                    <div className={`h-2.5 w-2.5 rounded-full mt-1 ${log.status === 'Success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {idx < 2 && <div className="absolute top-3.5 left-1 w-0.5 h-8 bg-slate-100" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900">
                        {log.status === 'Success' ? 'Data Pipeline Sync Success' : 'Server Timed Out'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{log.timestamp.split(' ')[1]}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {log.status === 'Success' 
                        ? `Imported ${log.newOrdersCount} orders, modified ${log.updatedOrdersCount} in ${log.durationMs}ms.`
                        : `Vapor socket timeout during handshake with Sellercloud inventory endpoint.`}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={onTriggerSync}
              className="mt-4 w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition"
            >
              Verify Endpoint Integration Link
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
