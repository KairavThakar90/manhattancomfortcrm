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
  User,
} from 'lucide-react';
import { useCRM } from '../hooks/useCRM';
import {
  logout,
  isImpersonating,
  restoreAdminSession,
} from '../features/auth/services/auth.service';
import { navItems } from '../utils/navigation';
import UpdateProfileModal from '../features/users/components/UpdateProfileModal';
import FullPageLoader from '../components/common/FullPageLoader';

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
  const [showUpdateProfileModal, setShowUpdateProfileModal] = useState(false);
  const [isReturningToAdmin, setIsReturningToAdmin] = useState(false);

  // Filter nav items by role
  const visibleNavItems = navItems.filter((tab) => {
    // Hide Dashboard entirely while impersonating another user — it
    // surfaces company-wide executive data unrelated to that session.
    if (tab.id === 'dashboard' && isImpersonating()) return false;
    if (!tab.roles) return true; // no restriction = visible to all
    const normalizedRole = (userRole || '').toLowerCase();
    return tab.roles.some((r) => r.toLowerCase() === normalizedRole);
  });

  // Auto-redirect vendor users to purchase orders
  useEffect(() => {
    if (
      userRole === 'Vendor' &&
      !location.pathname.startsWith('/purchase-orders') &&
      !location.pathname.startsWith('/user-activities')
    ) {
      navigate('/purchase-orders', { replace: true });
    }
  }, [userRole, location.pathname, navigate]);

  // Auto-redirect warehouse users to container flow
  useEffect(() => {
    if (
      (userRole || '').toLowerCase() === 'warehouse' &&
      !location.pathname.startsWith('/container-flow') &&
      !location.pathname.startsWith('/user-activities')
    ) {
      navigate('/container-flow', { replace: true });
    }
  }, [userRole, location.pathname, navigate]);

  // Never let an impersonated session sit on the Dashboard — it surfaces
  // company-wide executive data unrelated to "logged in as this user".
  useEffect(() => {
    if (isImpersonating() && location.pathname.startsWith('/dashboard')) {
      navigate('/purchase-orders', { replace: true });
    }
  }, [location.pathname, navigate]);

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

  const handleReturnToAdmin = async () => {
    setIsReturningToAdmin(true);
    await restoreAdminSession();
    // Full reload to re-initialize the app cleanly under the admin session.
    window.location.href = '/user-management';
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
    <div className="bg-mc-beige-light text-mc-black selection:bg-mc-gold flex min-h-screen font-sans antialiased selection:text-white">
      {isReturningToAdmin && (
        <FullPageLoader message="Returning to your account..." />
      )}
      {/* 1. INTERACTIVE NAVIGATION SIDEBAR */}
      <aside
        className={`border-mc-beige-dark bg-mc-white text-mc-gray-soft flex flex-shrink-0 flex-col justify-between border-r transition-all duration-300 ease-in-out select-none ${
          sidebarOpen ? 'w-64 p-5' : 'w-16 p-3'
        }`}
      >
        <div className="space-y-6">
          {/* Top bar: Brand + Hamburger always in top corner */}
          <div
            className={`flex ${sidebarOpen ? 'items-center justify-between' : 'flex-col items-center gap-4'}`}
          >
            {sidebarOpen ? (
              <div className="flex min-w-0 items-center pr-2">
                <img
                  src="https://www.manhattancomfort.com/media/wysiwyg/Manhattan_Comfort_Logo_Black.png"
                  alt="Manhattan Comfort Logo"
                  className="h-9 w-auto object-contain"
                />
              </div>
            ) : (
              <div className="flex min-w-0 items-center">
                <img
                  src="/favicon.png"
                  alt="MC Logo Small"
                  className="h-7 w-7 object-contain"
                />
              </div>
            )}

            {/* Collapse/Expand button — always in the top corner */}
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="text-mc-gray-soft hover:bg-mc-beige-light hover:text-mc-gold flex-shrink-0 cursor-pointer rounded-xl p-2 transition-colors"
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
                    } text-mc-gray-soft hover:bg-mc-beige-light hover:text-mc-gold`}
                  >
                    <IconComp className="text-mc-gray-soft h-4 w-4 flex-shrink-0" />
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
                        ? 'bg-mc-gray-dark text-mc-white font-bold shadow-sm'
                        : 'text-mc-gray-soft hover:bg-mc-beige-light hover:text-mc-gold'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <IconComp
                        className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-mc-white' : 'text-mc-gray-soft'}`}
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
          className={`border-mc-beige-dark flex items-center border-t pt-4 ${
            sidebarOpen ? 'justify-between px-2' : 'justify-center'
          }`}
        >
          {sidebarOpen ? (
            <>
              <div className="flex min-w-0 items-center gap-3">
                <div className="bg-mc-gold text-mc-white flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full font-bold uppercase shadow-xs">
                  {user?.full_name
                    ? user.full_name.slice(0, 1)
                    : userRole.slice(0, 1)}
                </div>
                <div className="min-w-0 text-xs">
                  <span
                    className="text-mc-black block truncate text-[11px] font-bold"
                    title={user?.full_name || 'You'}
                  >
                    {user?.full_name || 'You'}
                  </span>
                  <span
                    className="text-mc-gray-soft block truncate text-[10px]"
                    title={user?.email || userRole}
                  >
                    {user?.email || userRole}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-mc-gray-soft hover:bg-mc-gray-dark hover:text-mc-white flex-shrink-0 rounded-lg p-2 transition-colors"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              onClick={handleLogout}
              title="Log out"
              className="text-mc-gray-soft hover:bg-mc-gray-dark hover:text-mc-white rounded-lg p-2 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Outer Content Area */}
      <main className="flex h-screen flex-1 flex-col overflow-hidden">
        {/* TOP INTERACTIVE CONTROL HEADER */}
        <header className="border-mc-beige-dark bg-mc-white flex h-16 flex-shrink-0 items-center justify-between border-b px-6 shadow-xs">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-mc-black text-sm font-extrabold tracking-tight uppercase">
              {getPageTitle()}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications trigger with Red badge */}
            <div className="relative hidden">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="border-mc-beige-dark text-mc-gray-soft hover:bg-mc-beige-light hover:text-mc-gold rounded-lg border p-2 shadow-2xs transition"
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
                <div className="animate-fadeIn border-mc-beige-dark bg-mc-white absolute right-0 z-50 mt-2 w-80 space-y-3 rounded-2xl border p-4 shadow-xl">
                  <div className="border-mc-beige-dark flex items-center justify-between border-b pb-2">
                    <span className="text-mc-black text-xs font-bold">
                      Sourcing Alerts Desk
                    </span>
                    <button
                      onClick={handleMarkAllNotificationsRead}
                      className="text-mc-gold text-[10px] font-semibold hover:underline"
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
                            ? 'border-mc-beige-dark bg-mc-white text-mc-gray-soft'
                            : 'border-mc-gold bg-mc-beige-light/50 text-mc-black font-medium'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold">
                            {ntf.title}
                          </span>
                          <span className="text-mc-gray-soft font-mono text-[8px]">
                            {ntf.timestamp.split(' ')[1]}
                          </span>
                        </div>
                        <p className="text-mc-gray-soft mt-1 text-[10px] leading-normal">
                          {ntf.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Shown while an admin is logged in as another user */}
            {isImpersonating() && (
              <button
                onClick={handleReturnToAdmin}
                title="Return to your own account"
                className="border-mc-gold bg-mc-beige-light text-mc-black hover:bg-mc-gold/20 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition"
              >
                <LogOut className="h-3.5 w-3.5" />
                Return to Admin
              </button>
            )}

            {/* Quick Session user tag */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="border-mc-beige-dark bg-mc-beige-light hover:border-mc-gold flex cursor-pointer items-center gap-2 rounded-lg border p-1.5 pr-3 text-xs transition-colors"
              >
                <div className="bg-mc-gold text-mc-white flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold uppercase shadow-xs">
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
                <div className="animate-fadeIn border-mc-beige-dark bg-mc-white absolute right-0 z-50 mt-2 w-56 rounded-xl border py-2 font-sans shadow-xl">
                  {user && (
                    <div className="border-mc-beige-dark border-b px-4 py-2">
                      <p className="text-mc-black truncate text-xs font-bold">
                        {user.full_name}
                      </p>
                      <p className="text-mc-gray-soft truncate text-[10px]">
                        {user.email}
                      </p>
                      <span className="bg-mc-beige-light text-mc-gold mt-1 inline-block rounded-sm px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase">
                        {userRole}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowUpdateProfileModal(true);
                    }}
                    className="text-mc-black hover:bg-mc-beige-light hover:text-mc-gold flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-sm transition-colors"
                  >
                    <User className="h-4 w-4" />
                    <span className="font-semibold">Update Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      handleLogout();
                    }}
                    className="text-mc-black hover:bg-mc-beige-light hover:text-mc-gold flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-sm transition-colors"
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
            ['/purchase-orders', '/containers', '/tracker-logistics'].includes(
              location.pathname,
            )
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
                className={`bg-mc-gray-dark/70 absolute inset-0 backdrop-blur-sm transition-opacity duration-300 ${
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
                <div className="border-mc-beige-dark/60 bg-mc-white overflow-hidden rounded-3xl border p-8 text-center shadow-2xl">
                  {/* Animated glow rings */}
                  <div className="relative mb-6 flex items-center justify-center">
                    <div
                      className="border-mc-gold/20 absolute h-28 w-28 animate-ping rounded-full border"
                      style={{ animationDuration: '2s' }}
                    />
                    <div
                      className="border-mc-gold/30 absolute h-20 w-20 animate-ping rounded-full border"
                      style={{
                        animationDuration: '2.5s',
                        animationDelay: '0.3s',
                      }}
                    />
                    <div className="border-mc-gold/50 bg-mc-gold/10 shadow-mc-orange/20 flex h-14 w-14 items-center justify-center rounded-2xl border shadow-lg">
                      <ModalIcon className="text-mc-gold h-7 w-7" />
                    </div>
                  </div>

                  {/* Rocket badge */}
                  <div className="mb-3 flex items-center justify-center gap-1.5">
                    <Rocket className="text-mc-gold h-3 w-3 animate-bounce" />
                    <span className="text-mc-gold text-[10px] font-extrabold tracking-[0.2em] uppercase">
                      Coming Soon
                    </span>
                    <Rocket
                      className="text-mc-gold h-3 w-3 animate-bounce"
                      style={{ animationDelay: '0.15s' }}
                    />
                  </div>

                  <h2 className="text-mc-black mb-2 text-lg leading-tight font-extrabold">
                    {comingSoonModal.label}
                  </h2>
                  <p className="text-mc-gray-soft/70 mb-6 text-xs leading-relaxed">
                    This feature is under active development and will be
                    available in an upcoming release.
                  </p>

                  {/* Progress bar animation */}
                  <div className="bg-mc-beige-dark/60 mb-6 h-1 w-full overflow-hidden rounded-full">
                    <div
                      className="from-mc-orange to-mc-gold h-full rounded-full bg-gradient-to-r"
                      style={{ width: '65%', animation: 'none' }}
                    />
                  </div>

                  <button
                    onClick={closeComingSoon}
                    className="bg-mc-gold hover:bg-mc-black w-full rounded-xl py-2.5 text-xs font-bold tracking-wide text-white transition-colors"
                  >
                    Got it
                  </button>
                </div>

                {/* Close icon */}
                <button
                  onClick={closeComingSoon}
                  className="text-mc-gray-soft hover:bg-mc-beige-light hover:text-mc-gold absolute top-3 right-3 rounded-lg p-1.5 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })()}

      <UpdateProfileModal
        isOpen={showUpdateProfileModal}
        onClose={() => setShowUpdateProfileModal(false)}
      />
    </div>
  );
}
