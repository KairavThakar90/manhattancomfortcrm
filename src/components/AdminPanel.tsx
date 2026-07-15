import React, { useState } from 'react';
import {
  Shield,
  Users,
  Activity,
  RotateCcw,
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertTriangle,
  Lock,
  UserCheck,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from 'lucide-react';
import { UserRole, ActivityLog, AuditLog, SellercloudSyncLog } from '../types';

interface AdminPanelProps {
  activityLogs: ActivityLog[];
  auditLogs: AuditLog[];
  syncLogs: SellercloudSyncLog[];
  userRole: UserRole;
  onChangeUserRole: (newRole: UserRole) => void;
  onAddActivity: (
    msg: string,
    type: 'PO Updated' | 'Email Sent' | 'Invoice Uploaded' | 'Vendor Comment',
  ) => void;
  onTriggerSync: () => void;
}

export default function AdminPanel({
  activityLogs,
  auditLogs,
  syncLogs,
  userRole,
  onChangeUserRole,
  onAddActivity,
  onTriggerSync,
}: AdminPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<
    'users' | 'activity' | 'audit' | 'sync'
  >('users');
  const [logSearch, setLogSearch] = useState('');
  const [logFilter, setLogFilter] = useState('all');

  // Simulated Team Directory List
  const TEAM_MEMBERS = [
    {
      name: 'You (Sourcing Lead)',
      role: 'Administrator',
      email: 'lead.sourcing@aerocrm.com',
      status: 'Active',
      permissions: 'Full Read/Write, API Keys Admin',
    },
    {
      name: 'Emily Richardson',
      role: 'Warehouse',
      email: 'richardson.e@aerocrm.com',
      status: 'Active',
      permissions: 'Receive Containers, Dock Allocation',
    },
    {
      name: 'Sarah Jenkins',
      role: 'Finance',
      email: 'jenkins.finance@aerocrm.com',
      status: 'Active',
      permissions: 'Invoice Verification, LC Clearance',
    },
    {
      name: 'Marcus Chen',
      role: 'Purchasing',
      email: 'chen.m@aerocrm.com',
      status: 'Active',
      permissions: 'Create POs, Vendor Communication',
    },
  ];

  // Filter logs based on search/type
  const filteredActivities = activityLogs.filter((log) => {
    const matchesSearch = log.message
      .toLowerCase()
      .includes(logSearch.toLowerCase());
    const matchesType = logFilter === 'all' || log.type === logFilter;
    return matchesSearch && matchesType;
  });

  // Handle Changing User Role
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextRole = e.target.value as UserRole;
    onChangeUserRole(nextRole);
    onAddActivity(
      `S&OP Security: Modified active session privilege to ${nextRole}`,
      'PO Updated',
    );
  };

  return (
    <div className="space-y-6">
      {/* Sub tabs header */}
      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
            activeSubTab === 'users'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>User Management</span>
        </button>

        <button
          onClick={() => setActiveSubTab('activity')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
            activeSubTab === 'activity'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          <span>Activity Log Feed</span>
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
            activeSubTab === 'audit'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Lock className="h-3.5 w-3.5" />
          <span>System Audit Trail</span>
        </button>

        <button
          onClick={() => setActiveSubTab('sync')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
            activeSubTab === 'sync'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Sellercloud Sync Log</span>
        </button>
      </div>

      {/* SUB-PANEL 1: USER MANAGEMENT & SIMULATED PRIVILEGES */}
      {activeSubTab === 'users' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
            <div>
              <h3 className="font-display font-bold text-slate-900 text-sm">
                Active CRM User Directory
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Control organizational roles and privilege thresholds across
                procurement segments.
              </p>
            </div>

            {/* Privilege Modifier Dropdown (Rule 13) */}
            <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex items-center gap-3">
              <span className="text-xs font-semibold text-indigo-950">
                Switch Active Session:
              </span>
              <select
                value={userRole}
                onChange={handleRoleChange}
                className="text-xs bg-white border border-indigo-200 rounded-lg p-1.5 font-bold text-indigo-950 focus:outline-hidden"
              >
                <option value="Administrator">
                  Administrator (Management)
                </option>
                <option value="Purchasing">Purchasing Desk</option>
                <option value="Finance">Finance Desk</option>
                <option value="Warehouse">Warehouse Ops</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {TEAM_MEMBERS.map((member, idx) => {
              const isActiveUser =
                member.role === userRole ||
                (member.name.includes('You') && userRole === 'Administrator');
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                    isActiveUser
                      ? 'bg-indigo-50/20 border-indigo-200 shadow-xs'
                      : 'bg-slate-50/50 border-slate-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center font-bold text-sm">
                      {member.name.slice(0, 1)}
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <span>{member.name}</span>
                        <span
                          className={`px-2 py-0.2 rounded-full text-[9px] font-bold ${
                            member.role === 'Management'
                              ? 'bg-indigo-600 text-white'
                              : member.role === 'Finance'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {member.role}
                        </span>
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        {member.email}
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right text-xs">
                    <span className="text-slate-400 block text-[10px]">
                      Assigned Privileges
                    </span>
                    <strong className="text-slate-800 font-semibold">
                      {member.permissions}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-PANEL 2: GENERAL S&OP ACTIVITY LOG FEED */}
      {activeSubTab === 'activity' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-display font-bold text-slate-900 text-sm">
                Unified S&OP Activity logs
              </h3>
              <p className="text-xs text-slate-500">
                Live feed tracking updates, emails, and document attachments
                (Rule 14 & 15).
              </p>
            </div>

            <div className="flex gap-2">
              <div className="relative max-w-xs">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search active logs..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden text-slate-700"
                />
              </div>

              <select
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-slate-600 font-semibold"
              >
                <option value="all">All Types</option>
                <option value="PO Updated">PO Updated</option>
                <option value="Email Sent">Email Sent</option>
                <option value="Invoice Uploaded">Invoice Uploaded</option>
                <option value="Vendor Comment">Vendor Comments</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto pr-2 space-y-1">
            {filteredActivities.map((log) => (
              <div
                key={log.id}
                className="py-3 flex items-start justify-between text-xs transition hover:bg-slate-50/50 rounded-lg px-2"
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`mt-0.5 h-2 w-2 rounded-full ${
                      log.type === 'PO Updated'
                        ? 'bg-indigo-600 animate-pulse'
                        : log.type === 'Email Sent'
                          ? 'bg-sky-500'
                          : log.type === 'Invoice Uploaded'
                            ? 'bg-emerald-500'
                            : 'bg-amber-500'
                    }`}
                  />
                  <div>
                    <span className="font-semibold text-slate-800">
                      {log.message}
                    </span>
                    <span className="block text-[9px] text-slate-400 uppercase tracking-wide font-mono mt-0.5">
                      {log.type}
                    </span>
                  </div>
                </div>

                <span className="font-mono text-[10px] text-slate-400">
                  {log.timestamp}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-PANEL 3: SYSTEM SECURITY AUDIT TRAIL */}
      {activeSubTab === 'audit' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div>
            <h3 className="font-display font-bold text-slate-900 text-sm">
              System integrity Audit Trail
            </h3>
            <p className="text-xs text-slate-500">
              Immutable trace recording security changes and administrator
              operations (Rule 16).
            </p>
          </div>

          <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto pr-2">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="py-3 flex items-start justify-between text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 font-mono text-[11px] uppercase bg-slate-100 px-1.5 py-0.2 rounded-sm">
                      {log.id}
                    </span>
                    <span className="font-semibold text-slate-700">
                      {log.action}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Operator: {log.user} ({log.ip})
                  </p>
                </div>

                <span className="font-mono text-[10px] text-slate-400">
                  {log.timestamp}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-PANEL 4: SELLERCLOUD AUTOMATED SYNC LOGS */}
      {activeSubTab === 'sync' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-display font-bold text-slate-900 text-sm">
                Sellercloud Synchronizer Monitor
              </h3>
              <p className="text-xs text-slate-500">
                Continuous 10-minute automated data ingestion logs feed (Rule
                3).
              </p>
            </div>

            <button
              onClick={() => {
                onTriggerSync();
                alert(
                  'Contacting Sellercloud API gateway...\nSuccess: Synced core purchase orders state parameters!',
                );
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Trigger Sync Manual Override</span>
            </button>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
            {syncLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs font-mono"
              >
                <div className="space-y-1">
                  <span className="font-bold text-indigo-700">{log.id}</span>
                  <p className="text-[10px] text-slate-400 font-sans">
                    Trigger Mode: {log.triggerMethod || 'Scheduled Ingestion'} •
                    Fetch run: {log.newOrdersCount + log.updatedOrdersCount} PO
                    records
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-emerald-600 font-bold flex items-center justify-end gap-1 font-sans">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>{log.status}</span>
                  </span>
                  <span className="text-[9px] text-slate-400">
                    {log.timestamp}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
