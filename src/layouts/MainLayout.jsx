import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Bell,
  RefreshCw,
  Layers,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  X,
  Rocket,
} from 'lucide-react';
import { useCRM } from '../hooks/useCRM';
import { logout } from '../features/auth/services/auth.service';
import { navItems } from '../utils/navigation';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [comingSoonModal, setComingSoonModal] = useState(null); // holds { label, icon }
  const [modalVisible, setModalVisible] = useState(false);

  // Filter nav items by role — Vendors only see Purchase Orders
  const visibleNavItems = navItems.filter((tab) => {
    if (!tab.roles) return true; // no restriction = visible to all
    return tab.roles.includes(userRole);
  });

  // Auto-redirect vendor users to purchase orders
  useEffect(() => {
    if (
      userRole === 'Vendor' &&
      !location.pathname.startsWith('/purchase-orders')
    ) {
      navigate('/purchase-orders', { replace: true });
    }
  }, [userRole, location.pathname, navigate]);

  const openComingSoon = (tab) => {
    setComingSoonModal(tab);
    // Defer to next tick so the enter animation plays
    requestAnimationFrame(() => setModalVisible(true));
  };

  const closeComingSoon = () => {
    setModalVisible(false);
    setTimeout(() => setComingSoonModal(null), 300);
  };

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') closeComingSoon();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
      {/* 1. INTERACTIVE NAVIGATION SIDEBAR */}
      <aside
        className={`flex flex-shrink-0 flex-col justify-between border-r border-indigo-900 bg-indigo-950 text-indigo-200 transition-all duration-300 ease-in-out select-none ${
          sidebarOpen ? 'w-64 p-5' : 'w-16 p-3'
        }`}
      >
        <div className="space-y-6">
          {/* Top bar: Brand + Hamburger always in top corner */}
          <div
            className={`flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'}`}
          >
            {sidebarOpen && (
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-indigo-500 bg-indigo-600 font-bold text-white shadow-xs">
                  <Layers className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="font-display truncate text-sm font-extrabold tracking-tight text-white">
                    Manhattan Comfort
                  </h1>
                  <span className="font-mono text-[10px] font-bold tracking-widest text-indigo-400 uppercase">
                    PO &amp; CRM
                  </span>
                </div>
              </div>
            )}

            {/* Collapse/Expand button — always in the top corner */}
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="flex-shrink-0 cursor-pointer rounded-xl p-2 text-indigo-400 transition-colors hover:bg-indigo-800/60 hover:text-white"
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen ? (
                <ChevronsLeft className="h-5 w-5" />
              ) : (
                <ChevronsRight className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1">
            {visibleNavItems.map((tab) => {
              const IconComp = tab.icon;

              if (tab.comingSoon) {
                return (
                  <button
                    key={tab.id}
                    type="button"
                    title={
                      !sidebarOpen ? `${tab.label} — Coming Soon` : undefined
                    }
                    onClick={() => openComingSoon(tab)}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-xl text-xs font-semibold tracking-wide transition ${
                      sidebarOpen
                        ? 'px-3.5 py-2.5'
                        : 'justify-center px-2.5 py-2.5'
                    } text-indigo-300 hover:bg-indigo-900/45 hover:text-indigo-100`}
                  >
                    <IconComp className="h-4 w-4 flex-shrink-0 text-indigo-400" />
                    {sidebarOpen && (
                      <span className="flex-1 truncate text-left">
                        {tab.label}
                      </span>
                    )}
                  </button>
                );
              }

              return (
                <NavLink
                  key={tab.id}
                  to={tab.path}
                  onClick={() => handleNavClick(tab.id, tab.path)}
                  title={!sidebarOpen ? tab.label : undefined}
                  className={({ isActive }) =>
                    `flex w-full items-center gap-3 rounded-xl text-xs font-semibold tracking-wide transition ${
                      sidebarOpen
                        ? 'px-3.5 py-2.5'
                        : 'justify-center px-2.5 py-2.5'
                    } ${
                      isActive
                        ? 'border border-indigo-500 bg-indigo-600 font-bold text-white shadow-sm'
                        : 'text-indigo-300 hover:bg-indigo-900/45 hover:text-indigo-100'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <IconComp
                        className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-indigo-400'}`}
                      />
                      {sidebarOpen && (
                        <span className="truncate">{tab.label}</span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User context footer */}
        <div
          className={`flex items-center border-t border-indigo-900/60 pt-4 ${
            sidebarOpen ? 'justify-between px-2' : 'justify-center'
          }`}
        >
          {sidebarOpen ? (
            <>
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-800 font-bold text-white uppercase shadow-xs">
                  {user?.full_name
                    ? user.full_name.slice(0, 1)
                    : userRole.slice(0, 1)}
                </div>
                <div className="min-w-0 text-xs">
                  <span
                    className="block truncate text-[11px] font-bold text-indigo-100"
                    title={user?.full_name || 'You'}
                  >
                    {user?.full_name || 'You'}
                  </span>
                  <span
                    className="block truncate text-[10px] text-indigo-400"
                    title={user?.email || userRole}
                  >
                    {user?.email || userRole}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex-shrink-0 rounded-lg p-2 text-indigo-400 transition-colors hover:bg-indigo-600 hover:text-white"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              onClick={handleLogout}
              title="Log out"
              className="rounded-lg p-2 text-indigo-400 transition-colors hover:bg-indigo-600 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Outer Content Area */}
      <main className="flex h-screen flex-1 flex-col overflow-hidden">
        {/* TOP INTERACTIVE CONTROL HEADER */}
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 shadow-2xs">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-sm font-extrabold tracking-tight text-slate-900 uppercase">
              {getPageTitle()}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications trigger with Red badge */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="rounded-lg border border-slate-200 p-2 text-slate-600 shadow-2xs transition hover:bg-slate-50"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 animate-bounce items-center justify-center rounded-full bg-rose-600 text-[9px] font-extrabold text-white shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* FLOATING NOTIFICATION CENTER SLIDEOVER */}
              {showNotifications && (
                <div className="animate-fadeIn absolute right-0 z-50 mt-2 w-80 space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                    <span className="text-xs font-bold text-slate-800">
                      Sourcing Alerts Desk
                    </span>
                    <button
                      onClick={handleMarkAllNotificationsRead}
                      className="text-[10px] font-semibold text-indigo-600 hover:underline"
                    >
                      Clear alerts
                    </button>
                  </div>

                  <div className="max-h-[240px] space-y-2 overflow-y-auto pr-1">
                    {notifications.map((ntf) => (
                      <div
                        key={ntf.id}
                        onClick={() => handleNotificationSelect(ntf)}
                        className={`cursor-pointer rounded-xl border p-2.5 text-xs transition ${
                          ntf.read
                            ? 'border-slate-100 bg-white text-slate-500'
                            : 'border-indigo-100 bg-indigo-50/30 font-medium text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold">
                            {ntf.title}
                          </span>
                          <span className="font-mono text-[8px] text-slate-400">
                            {ntf.timestamp.split(' ')[1]}
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] leading-normal text-slate-500">
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
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-1.5 pr-3 text-xs transition-colors hover:bg-slate-100"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-xs font-bold text-white uppercase shadow-2xs">
                  {user?.full_name
                    ? user.full_name.slice(0, 1)
                    : userRole.slice(0, 1)}
                </div>
                <span className="text-[11px] font-bold text-slate-800">
                  {user?.full_name || userRole}
                </span>
              </button>

              {/* USER DROPDOWN MENU */}
              {showUserMenu && (
                <div className="animate-fadeIn absolute right-0 z-50 mt-2 w-56 rounded-xl border border-slate-100 bg-white py-2 font-sans shadow-xl">
                  {user && (
                    <div className="border-b border-slate-100 px-4 py-2">
                      <p className="truncate text-xs font-bold text-slate-800">
                        {user.full_name}
                      </p>
                      <p className="truncate text-[10px] text-slate-400">
                        {user.email}
                      </p>
                      <span className="mt-1 inline-block rounded-sm bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-indigo-700 uppercase">
                        {userRole}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      handleLogout();
                    }}
                    className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
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
          className={`min-h-0 flex-1 p-6 ${
            ['/purchase-orders', '/containers'].includes(location.pathname)
              ? 'flex flex-col overflow-hidden'
              : 'overflow-y-auto'
          }`}
        >
          <Outlet />
        </div>
      </main>

      {/* ── COMING SOON MODAL ── */}
      {comingSoonModal &&
        (() => {
          const ModalIcon = comingSoonModal.icon;
          return (
            <div
              className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-300 ${
                modalVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
              onClick={closeComingSoon}
            >
              {/* Backdrop */}
              <div
                className={`absolute inset-0 bg-indigo-950/70 backdrop-blur-sm transition-opacity duration-300 ${
                  modalVisible ? 'opacity-100' : 'opacity-0'
                }`}
              />

              {/* Card */}
              <div
                className={`relative z-10 w-[340px] transition-all duration-300 ${
                  modalVisible
                    ? 'translate-y-0 scale-100 opacity-100'
                    : 'translate-y-4 scale-90 opacity-0'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="overflow-hidden rounded-3xl border border-indigo-700/60 bg-indigo-950 p-8 text-center shadow-2xl">
                  {/* Animated glow rings */}
                  <div className="relative mb-6 flex items-center justify-center">
                    <div
                      className="absolute h-28 w-28 animate-ping rounded-full border border-indigo-500/20"
                      style={{ animationDuration: '2s' }}
                    />
                    <div
                      className="absolute h-20 w-20 animate-ping rounded-full border border-indigo-500/30"
                      style={{
                        animationDuration: '2.5s',
                        animationDelay: '0.3s',
                      }}
                    />
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-500/50 bg-indigo-600/30 shadow-lg shadow-indigo-900">
                      <ModalIcon className="h-7 w-7 text-indigo-300" />
                    </div>
                  </div>

                  {/* Rocket badge */}
                  <div className="mb-3 flex items-center justify-center gap-1.5">
                    <Rocket className="h-3 w-3 animate-bounce text-indigo-400" />
                    <span className="text-[10px] font-extrabold tracking-[0.2em] text-indigo-400 uppercase">
                      Coming Soon
                    </span>
                    <Rocket
                      className="h-3 w-3 animate-bounce text-indigo-400"
                      style={{ animationDelay: '0.15s' }}
                    />
                  </div>

                  <h2 className="mb-2 text-lg leading-tight font-extrabold text-white">
                    {comingSoonModal.label}
                  </h2>
                  <p className="mb-6 text-xs leading-relaxed text-indigo-300/70">
                    This feature is under active development and will be
                    available in an upcoming release.
                  </p>

                  {/* Progress bar animation */}
                  <div className="mb-6 h-1 w-full overflow-hidden rounded-full bg-indigo-900/60">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                      style={{ width: '65%', animation: 'none' }}
                    />
                  </div>

                  <button
                    onClick={closeComingSoon}
                    className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold tracking-wide text-white transition-colors hover:bg-indigo-500"
                  >
                    Got it
                  </button>
                </div>

                {/* Close icon */}
                <button
                  onClick={closeComingSoon}
                  className="absolute top-3 right-3 rounded-lg p-1.5 text-indigo-400 transition-colors hover:bg-indigo-800/60 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
