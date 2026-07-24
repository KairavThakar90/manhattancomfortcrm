import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  BarChart3,
  FileSpreadsheet,
  Users,
  Mail,
  MessageSquare,
  Sparkles,
  Bell,
  RefreshCw,
  Layers,
  Shield,
  TrendingUp,
  LogOut,
  Package,
} from 'lucide-react';
import { useCRM } from '../hooks/useCRM';
import { logout } from '../services/auth.service';

export default function MainLayout() {
  const {
    userRole,
    user,
    notifications,
    handleTriggerSync,
    handleNotificationClick,
    handleMarkAllNotificationsRead,
    setSelectedPOId,
    setIsAuthenticated,
  } = useCRM();

  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getPageTitle = () => {
    const path = location.pathname.substring(1);
    if (!path) return 'DASHBOARD';
    return path.replace(/-/g, ' ');
  };

  const handleLogout = async () => {
    setIsAuthenticated(false);
    await logout();
  };

  const navItems = [
    {
      id: 'dashboard',
      path: '/dashboard',
      label: 'Executive Dashboard',
      icon: BarChart3,
    },
    {
      id: 'purchase-orders',
      path: '/purchase-orders',
      label: 'Purchase Orders',
      icon: FileSpreadsheet,
    },
    {
      id: 'container-flow',
      path: '/container-flow',
      label: 'Container Management',
      icon: Package,
    },
    {
      id: 'vendors',
      path: '/sourcing-vendors',
      label: 'Sourcing Vendors',
      icon: Users,
    },
    {
      id: 'email-center',
      path: '/sourcing-email-hub',
      label: 'Sourcing Email Hub',
      icon: Mail,
    },
    {
      id: 'chat',
      path: '/workspace-team-chat',
      label: 'Workspace Team Chat',
      icon: MessageSquare,
    },
    {
      id: 'ai-assistant',
      path: '/sop-ai-assistant',
      label: 'S&OP AI Assistant',
      icon: Sparkles,
    },
    {
      id: 'reports',
      path: '/reports-analytics',
      label: 'Reports & BI Analytics',
      icon: TrendingUp,
    },
    {
      id: 'system-admin',
      path: '/security-admin',
      label: 'Security Admin Panel',
      icon: Shield,
    },
  ];

  const handleNavClick = (tabId, path) => {
    if (tabId !== 'purchase-orders') {
      setSelectedPOId(null);
    }
  };

  const handleNotificationSelect = (ntf) => {
    handleNotificationClick(ntf);
    if (ntf.poId) {
      navigate('/purchase-orders');
      setShowNotifications(false);
    }
  };

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
              <h1 className="font-display font-extrabold text-white text-sm tracking-tight">
                Manhattan Comfort
              </h1>
              <span className="text-[10px] text-indigo-400 font-mono tracking-widest uppercase font-bold">
                PO & CRM
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1">
            {navItems.map((tab) => {
              const IconComp = tab.icon;
              return (
                <NavLink
                  key={tab.id}
                  to={tab.path}
                  onClick={() => handleNavClick(tab.id, tab.path)}
                  className={({ isActive }) =>
                    `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm font-bold border border-indigo-500'
                        : 'hover:bg-indigo-900/45 hover:text-indigo-100 text-indigo-300'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <IconComp
                        className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-indigo-400'}`}
                      />
                      <span>{tab.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User context footer */}
        <div className="border-t border-indigo-900/60 pt-4 flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-indigo-800 rounded-full flex items-center justify-center font-bold text-white shadow-xs uppercase">
              {user?.full_name
                ? user.full_name.slice(0, 1)
                : userRole.slice(0, 1)}
            </div>
            <div className="text-xs max-w-[140px] truncate">
              <span
                className="block text-indigo-100 font-bold truncate text-[11px]"
                title={user?.full_name || 'You'}
              >
                {user?.full_name || 'You'}
              </span>
              <span
                className="block text-indigo-400 text-[10px] truncate"
                title={user?.email || userRole}
              >
                {user?.email || userRole}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-indigo-400 hover:text-white hover:bg-indigo-600 rounded-lg transition-colors"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </aside>

      {/* Main Outer Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* TOP INTERACTIVE CONTROL HEADER */}
        <header className="h-16 bg-white border-b border-slate-100 flex-shrink-0 px-6 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-extrabold text-slate-900 text-sm tracking-tight uppercase">
              {getPageTitle()}
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
                    <span className="text-xs font-bold text-slate-800">
                      Sourcing Alerts Desk
                    </span>
                    <button
                      onClick={handleMarkAllNotificationsRead}
                      className="text-[10px] text-indigo-600 hover:underline font-semibold"
                    >
                      Clear alerts
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                    {notifications.map((ntf) => (
                      <div
                        key={ntf.id}
                        onClick={() => handleNotificationSelect(ntf)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                          ntf.read
                            ? 'bg-white border-slate-100 text-slate-500'
                            : 'bg-indigo-50/30 border-indigo-100 text-slate-800 font-medium'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[11px]">
                            {ntf.title}
                          </span>
                          <span className="text-[8px] text-slate-400 font-mono">
                            {ntf.timestamp.split(' ')[1]}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                          {ntf.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Session user tag */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 text-xs border border-slate-100 p-1.5 pr-3 rounded-lg bg-slate-50/50 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="h-6 w-6 bg-indigo-600 text-white rounded-md flex items-center justify-center font-bold text-xs uppercase shadow-2xs">
                  {user?.full_name
                    ? user.full_name.slice(0, 1)
                    : userRole.slice(0, 1)}
                </div>
                <span className="font-bold text-slate-800 text-[11px]">
                  {user?.full_name || userRole}
                </span>
              </button>

              {/* USER DROPDOWN MENU */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-xl shadow-xl z-50 py-2 animate-fadeIn font-sans">
                  {user && (
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {user.full_name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {user.email}
                      </p>
                      <span className="text-[9px] mt-1 bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded-sm inline-block uppercase tracking-wider">
                        {userRole}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="font-semibold">Log out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* INTERNAL VIEWPORT PORTAL */}
        <div
          className={`flex-1 p-6 min-h-0 ${location.pathname === '/purchase-orders' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'}`}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
