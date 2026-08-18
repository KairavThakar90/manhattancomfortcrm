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
      <div className="flex w-fit items-center gap-1.5 rounded-lg bg-slate-100 p-1">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
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
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
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
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
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
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
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
        <div className="space-y-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-xs">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-display text-sm font-bold text-slate-900">
                Active CRM User Directory
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Control organizational roles and privilege thresholds across
                procurement segments.
              </p>
            </div>

            {/* Privilege Modifier Dropdown (Rule 13) */}
            <div className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-3">
              <span className="text-xs font-semibold text-indigo-950">
                Switch Active Session:
              </span>
              <select
                value={userRole}
                onChange={handleRoleChange}
                className="rounded-lg border border-indigo-200 bg-white p-1.5 text-xs font-bold text-indigo-950 focus:outline-hidden"
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
                  className={`flex flex-col justify-between gap-4 rounded-xl border p-4 transition sm:flex-row sm:items-center ${
                    isActiveUser
                      ? 'border-indigo-200 bg-indigo-50/20 shadow-xs'
                      : 'border-slate-100 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                      {member.name.slice(0, 1)}
                    </div>

                    <div>
                      <h4 className="flex items-center gap-2 text-xs font-bold text-slate-900">
                        <span>{member.name}</span>
                        <span
                          className={`py-0.2 rounded-full px-2 text-[9px] font-bold ${
                            member.role === 'Management'
                              ? 'bg-indigo-600 text-white'
                              : member.role === 'Finance'
                                ? 'border border-emerald-100 bg-emerald-50 text-emerald-700'
                                : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {member.role}
                        </span>
                      </h4>
                      <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                        {member.email}
                      </p>
                    </div>
                  </div>

                  <div className="text-left text-xs sm:text-right">
                    <span className="block text-[10px] text-slate-400">
                      Assigned Privileges
                    </span>
                    <strong className="font-semibold text-slate-800">
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
        <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-xs">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-display text-sm font-bold text-slate-900">
                Unified S&OP Activity logs
              </h3>
              <p className="text-xs text-slate-500">
                Live feed tracking updates, emails, and document attachments
                (Rule 14 & 15).
              </p>
            </div>

            <div className="flex gap-2">
              <div className="relative max-w-xs">
                <Search className="absolute top-2 left-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search active logs..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 pr-3 pl-8 text-xs text-slate-700 focus:outline-hidden"
                />
              </div>

              <select
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-semibold text-slate-600"
              >
                <option value="all">All Types</option>
                <option value="PO Updated">PO Updated</option>
                <option value="Email Sent">Email Sent</option>
                <option value="Invoice Uploaded">Invoice Uploaded</option>
                <option value="Vendor Comment">Vendor Comments</option>
              </select>
            </div>
          </div>

          <div className="max-h-[360px] space-y-1 divide-y divide-slate-100 overflow-y-auto pr-2">
            {filteredActivities.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between rounded-lg px-2 py-3 text-xs transition hover:bg-slate-50/50"
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`mt-0.5 h-2 w-2 rounded-full ${
                      log.type === 'PO Updated'
                        ? 'animate-pulse bg-indigo-600'
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
                    <span className="mt-0.5 block font-mono text-[9px] tracking-wide text-slate-400 uppercase">
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
        <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-xs">
          <div>
            <h3 className="font-display text-sm font-bold text-slate-900">
              System integrity Audit Trail
            </h3>
            <p className="text-xs text-slate-500">
              Immutable trace recording security changes and administrator
              operations (Rule 16).
            </p>
          </div>

          <div className="max-h-[320px] divide-y divide-slate-100 overflow-y-auto pr-2">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between py-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="py-0.2 rounded-sm bg-slate-100 px-1.5 font-mono text-[11px] font-bold text-slate-800 uppercase">
                      {log.id}
                    </span>
                    <span className="font-semibold text-slate-700">
                      {log.action}
                    </span>
                  </div>
                  <p className="font-mono text-[10px] text-slate-500">
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
        <div className="space-y-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-display text-sm font-bold text-slate-900">
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
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Trigger Sync Manual Override</span>
            </button>
          </div>

          <div className="max-h-[300px] space-y-3 overflow-y-auto pr-2">
            {syncLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 font-mono text-xs"
              >
                <div className="space-y-1">
                  <span className="font-bold text-indigo-700">{log.id}</span>
                  <p className="font-sans text-[10px] text-slate-400">
                    Trigger Mode: {log.triggerMethod || 'Scheduled Ingestion'} •
                    Fetch run: {log.newOrdersCount + log.updatedOrdersCount} PO
                    records
                  </p>
                </div>

                <div className="text-right">
                  <span className="flex items-center justify-end gap-1 font-sans font-bold text-emerald-600">
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
