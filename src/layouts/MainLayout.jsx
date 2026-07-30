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
import { logout } from '../services/auth.service';
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [comingSoonModal, setComingSoonModal] = useState(null); // holds { label, icon }
  const [modalVisible, setModalVisible] = useState(false);

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
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
      {/* 1. INTERACTIVE NAVIGATION SIDEBAR */}
      <aside
        className={`bg-indigo-950 text-indigo-200 flex flex-col justify-between border-r border-indigo-900 flex-shrink-0 select-none transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'w-64 p-5' : 'w-16 p-3'
        }`}
      >
        <div className="space-y-6">
          {/* Top bar: Brand + Hamburger always in top corner */}
          <div
            className={`flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'}`}
          >
            {sidebarOpen && (
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-xs font-bold border border-indigo-500 flex-shrink-0">
                  <Layers className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="font-display font-extrabold text-white text-sm tracking-tight truncate">
                    Manhattan Comfort
                  </h1>
                  <span className="text-[10px] text-indigo-400 font-mono tracking-widest uppercase font-bold">
                    PO &amp; CRM
                  </span>
                </div>
              </div>
            )}

            {/* Collapse/Expand button — always in the top corner */}
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="flex-shrink-0 p-2 rounded-xl text-indigo-400 hover:text-white hover:bg-indigo-800/60 transition-colors cursor-pointer"
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
            {navItems.map((tab) => {
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
                    className={`w-full flex items-center gap-3 rounded-xl text-xs font-semibold tracking-wide transition cursor-pointer ${
                      sidebarOpen
                        ? 'px-3.5 py-2.5'
                        : 'px-2.5 py-2.5 justify-center'
                    } hover:bg-indigo-900/45 hover:text-indigo-100 text-indigo-300`}
                  >
                    <IconComp className="h-4 w-4 flex-shrink-0 text-indigo-400" />
                    {sidebarOpen && (
                      <span className="truncate flex-1 text-left">
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
                    `w-full flex items-center gap-3 rounded-xl text-xs font-semibold tracking-wide transition ${
                      sidebarOpen
                        ? 'px-3.5 py-2.5'
                        : 'px-2.5 py-2.5 justify-center'
                    } ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm font-bold border border-indigo-500'
                        : 'hover:bg-indigo-900/45 hover:text-indigo-100 text-indigo-300'
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
          className={`border-t border-indigo-900/60 pt-4 flex items-center ${
            sidebarOpen ? 'justify-between px-2' : 'justify-center'
          }`}
        >
          {sidebarOpen ? (
            <>
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 bg-indigo-800 rounded-full flex items-center justify-center font-bold text-white shadow-xs uppercase flex-shrink-0">
                  {user?.full_name
                    ? user.full_name.slice(0, 1)
                    : userRole.slice(0, 1)}
                </div>
                <div className="text-xs min-w-0">
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
                className="p-2 text-indigo-400 hover:text-white hover:bg-indigo-600 rounded-lg transition-colors flex-shrink-0"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              onClick={handleLogout}
              title="Log out"
              className="p-2 text-indigo-400 hover:text-white hover:bg-indigo-600 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
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

      {/* ── COMING SOON MODAL ── */}
      {comingSoonModal &&
        (() => {
          const ModalIcon = comingSoonModal.icon;
          return (
            <div
              className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-300 ${
                modalVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
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
                    ? 'opacity-100 scale-100 translate-y-0'
                    : 'opacity-0 scale-90 translate-y-4'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-indigo-950 border border-indigo-700/60 rounded-3xl shadow-2xl p-8 text-center overflow-hidden">
                  {/* Animated glow rings */}
                  <div className="relative flex items-center justify-center mb-6">
                    <div
                      className="absolute h-28 w-28 rounded-full border border-indigo-500/20 animate-ping"
                      style={{ animationDuration: '2s' }}
                    />
                    <div
                      className="absolute h-20 w-20 rounded-full border border-indigo-500/30 animate-ping"
                      style={{
                        animationDuration: '2.5s',
                        animationDelay: '0.3s',
                      }}
                    />
                    <div className="h-14 w-14 rounded-2xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center shadow-lg shadow-indigo-900">
                      <ModalIcon className="h-7 w-7 text-indigo-300" />
                    </div>
                  </div>

                  {/* Rocket badge */}
                  <div className="flex items-center justify-center gap-1.5 mb-3">
                    <Rocket className="h-3 w-3 text-indigo-400 animate-bounce" />
                    <span className="text-[10px] font-extrabold tracking-[0.2em] uppercase text-indigo-400">
                      Coming Soon
                    </span>
                    <Rocket
                      className="h-3 w-3 text-indigo-400 animate-bounce"
                      style={{ animationDelay: '0.15s' }}
                    />
                  </div>

                  <h2 className="text-white font-extrabold text-lg leading-tight mb-2">
                    {comingSoonModal.label}
                  </h2>
                  <p className="text-indigo-300/70 text-xs leading-relaxed mb-6">
                    This feature is under active development and will be
                    available in an upcoming release.
                  </p>

                  {/* Progress bar animation */}
                  <div className="w-full bg-indigo-900/60 rounded-full h-1 mb-6 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                      style={{ width: '65%', animation: 'none' }}
                    />
                  </div>

                  <button
                    onClick={closeComingSoon}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold tracking-wide transition-colors"
                  >
                    Got it
                  </button>
                </div>

                {/* Close icon */}
                <button
                  onClick={closeComingSoon}
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-indigo-400 hover:text-white hover:bg-indigo-800/60 transition-colors"
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
