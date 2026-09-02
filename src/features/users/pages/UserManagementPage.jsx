import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Users,
  Search,
  RefreshCw,
  Plus,
  KeyRound,
  Pencil,
  Trash2,
  AlertTriangle,
  X,
  ChevronDown,
  Check,
  Filter,
  LogIn,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { fetchUsers } from '../store/userSlice';
import { deleteUser, getUserById } from '../services/user.service';
import {
  impersonateUser,
  mapBackendRole,
} from '../../auth/services/auth.service';
import { useCRM } from '../../../hooks/useCRM';
import AddUserModal from '../components/AddUserModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import Pagination from '../../../components/common/Pagination';
import TableLoader from '../../../components/common/TableLoader';
import FullPageLoader from '../../../components/common/FullPageLoader';
import DataTable from '../../../components/common/DataTable';
import moment from 'moment-timezone';

export default function UserManagementPage() {
  const dispatch = useDispatch();
  const { user: currentUser, userRole } = useCRM();

  const { list: users, loading } = useSelector((state) => state.users);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editLoadingId, setEditLoadingId] = useState(null);
  const [loginAsLoadingId, setLoginAsLoadingId] = useState(null);

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        roleDropdownRef.current &&
        !roleDropdownRef.current.contains(e.target)
      ) {
        setRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced server-side fetch logic for Search and Role filters
  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (roleFilter) params.role = roleFilter;
      dispatch(fetchUsers(params));
    }, 400);

    return () => clearTimeout(timeout);
  }, [dispatch, searchQuery, roleFilter]);

  const userTableRef = useRef(null);

  // Scroll users table to top after pagination changes
  useEffect(() => {
    if (userTableRef.current) {
      userTableRef.current.scrollTop = 0;
    }
  }, [page, pageSize]);

  const handleRefresh = () => {
    const params = {};
    if (searchQuery.trim()) params.search = searchQuery.trim();
    if (roleFilter) params.role = roleFilter;

    dispatch(fetchUsers(params))
      .unwrap()
      .then(() => toast.success('Users refreshed successfully'))
      .catch(() => toast.error('Failed to update user list'));
  };

  const handleDeleteUser = useCallback(async (user) => {
    setDeletingUser(user);
  }, []);

  const handleEditUser = useCallback(async (user) => {
    try {
      setEditLoadingId(user.id);
      const freshUser = await getUserById(user.id);
      setEditingUser(freshUser);
      setShowAddModal(true);
    } catch (err) {
      toast.error('Failed to load user details. Please try again.');
    } finally {
      setEditLoadingId(null);
    }
  }, []);

  const handleLoginAsUser = useCallback(async (user) => {
    const userName =
      [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;
    try {
      setLoginAsLoadingId(user.id);
      const { user: impersonatedUser } = await impersonateUser(user.id);
      toast.success(`Logged in as ${userName}`);
      // Land on whichever page that role actually sees first — landing on
      // /dashboard only to have MainLayout immediately redirect a Vendor or
      // Warehouse user away is what caused the dashboard to flash briefly.
      const mappedRole = mapBackendRole(impersonatedUser?.role);
      const landingPath =
        mappedRole === 'Vendor'
          ? '/purchase-orders'
          : mappedRole === 'Warehouse'
            ? '/container-flow'
            : '/dashboard';
      // Full reload so every part of the app (redux state, cached data,
      // route guards) re-initializes cleanly under the new session.
      window.location.href = landingPath;
    } catch (err) {
      console.error('Failed to log in as user:', err);
      toast.error('Failed to log in as this user.');
    } finally {
      setLoginAsLoadingId(null);
    }
  }, []);

  const confirmDeleteUser = useCallback(async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    const userName =
      [deletingUser.first_name, deletingUser.last_name]
        .filter(Boolean)
        .join(' ') || deletingUser.email;
    try {
      await deleteUser(deletingUser.id);
      toast.success(`User "${userName}" deleted successfully`);
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (roleFilter) params.role = roleFilter;
      dispatch(fetchUsers(params));
      setDeletingUser(null);
    } catch (err) {
      toast.error('Failed to delete user. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }, [deletingUser, dispatch, searchQuery, roleFilter]);

  // Filter applied directly on backend now; bypass block.
  const filteredUsers = useMemo(() => users || [], [users]);

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, page, pageSize]);

  const renderHighlightedText = useCallback((text, highlight) => {
    if (!highlight || !highlight.trim() || !text) return text;
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = String(text).split(regex);
    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark
              key={index}
              className="text-mc-black rounded-sm bg-yellow-200 px-0.5"
            >
              {part}
            </mark>
          ) : (
            part
          ),
        )}
      </>
    );
  }, []);

  const userColumns = useMemo(
    () => [
      {
        header: 'Name',
        accessor: 'name',
        headerClassName: 'px-6 py-3 bg-transparent text-left w-[20%]',
        className: 'px-6 py-3 w-[20%] font-semibold text-mc-black text-sm',
        render: (u) => {
          const val =
            u.full_name ||
            `${u.first_name || ''} ${u.last_name || ''}`.trim() ||
            'N/A';
          return (
            <div className="w-full max-w-[200px] truncate" title={val}>
              {renderHighlightedText(val, searchQuery)}
            </div>
          );
        },
      },
      {
        header: 'Email',
        accessor: 'email',
        headerClassName: 'px-6 py-3 bg-transparent text-left w-[20%]',
        className: 'px-6 py-3 w-[20%] text-mc-gray-soft text-sm',
        render: (u) => {
          const val = u.email || 'N/A';
          return (
            <div className="w-full max-w-[240px] truncate" title={val}>
              {renderHighlightedText(val, searchQuery)}
            </div>
          );
        },
      },
      {
        header: 'Role',
        accessor: 'role',
        headerClassName: 'px-6 py-3 bg-transparent text-left w-[12%]',
        className: 'px-6 py-3 w-[12%]',
        render: (u) => (
          <span className="border-mc-beige-dark bg-mc-beige-light text-mc-black inline-flex items-center rounded-md border px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase">
            {u.role || 'User'}
          </span>
        ),
      },
      {
        header: (
          <div className="flex max-w-max flex-col gap-0.5">
            <span>Created At</span>
            <span className="text-[9px] font-medium tracking-wide text-slate-400 opacity-80">
              (YYYY-MM-DD)
            </span>
          </div>
        ),
        accessor: 'created_at',
        headerClassName: 'px-6 py-3 bg-transparent text-left w-[13%]',
        className: 'px-6 py-3 w-[13%] text-mc-gray-soft text-sm font-mono',
        render: (u) => {
          const dateStr = u.created_at || u.date_joined || u.createdAt;
          if (!dateStr) return 'N/A';
          try {
            return new Date(dateStr).toISOString().split('T')[0];
          } catch (e) {
            return 'N/A';
          }
        },
      },
      {
        header: (
          <div className="flex max-w-max flex-col gap-0.5">
            <span>Last Login</span>
            <span className="text-[9px] font-medium tracking-wide text-slate-400 opacity-80">
              (YYYY/MM/DD HH:MM)
            </span>
          </div>
        ),
        accessor: 'last_login',
        headerClassName: 'px-6 py-3 bg-transparent text-left w-[12%]',
        className: 'px-6 py-3 w-[12%] text-mc-gray-soft text-xs font-mono',
        render: (u) => {
          if (!u.last_login) return '-';
          try {
            // Detect the browser's IANA timezone (e.g. "Asia/Kolkata", "America/New_York")
            const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            // Parse backend value as UTC, then convert to user's local timezone
            const m = moment.utc(u.last_login).tz(userTz);
            if (!m.isValid()) return 'N/A';
            // Format: "24 Aug 2026, 03:30 PM IST"
            return m.format('YYYY/MM/DD hh:mm A');
          } catch {
            return 'N/A';
          }
        },
      },
      {
        header: 'Access',
        accessor: 'login_as',
        headerClassName: 'px-6 py-3 bg-transparent text-center w-[10%]',
        className: 'px-6 py-3 w-[10%] text-center',
        render: (u) => {
          const isAdmin =
            String(userRole || '').toLowerCase() === 'administrator';
          const isSelf =
            currentUser?.id && String(currentUser.id) === String(u.id);
          // Never show "Login" for another administrator's row — only
          // non-admin accounts can be logged into this way. Row data uses
          // the raw backend role value ('admin'), unlike the current
          // viewer's role which is already mapped to 'Administrator'.
          const targetIsAdmin = String(u.role || '').toLowerCase() === 'admin';
          if (!isAdmin || isSelf || targetIsAdmin) return null;
          return (
            <button
              onClick={() => handleLoginAsUser(u)}
              disabled={loginAsLoadingId === u.id}
              className="border-mc-beige-dark hover:bg-mc-beige-light hover:text-mc-gold inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-bold text-slate-600 transition disabled:cursor-not-allowed disabled:opacity-50"
              title={`Log in as this user`}
            >
              {loginAsLoadingId === u.id ? (
                <svg
                  className="h-3.5 w-3.5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
              ) : (
                <LogIn className="h-3.5 w-3.5" />
              )}
              Login
            </button>
          );
        },
      },
      {
        header: 'Actions',
        accessor: 'actions',
        headerClassName: 'px-6 py-3 bg-transparent text-center w-[13%]',
        className: 'px-6 py-3 w-[13%] text-center',
        render: (u) => (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => handleEditUser(u)}
              disabled={editLoadingId === u.id}
              className="hover:bg-mc-beige-light hover:text-mc-gold rounded-md p-1.5 text-slate-400 transition disabled:opacity-50"
              title="Edit User"
            >
              {editLoadingId === u.id ? (
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
              ) : (
                <Pencil className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => handleDeleteUser(u)}
              className="rounded-md p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
              title="Delete User"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            {currentUser?.id && String(currentUser.id) === String(u.id) && (
              <button
                onClick={() => setShowChangePasswordModal(true)}
                className="hover:bg-mc-beige-light hover:text-mc-gold rounded-md p-1.5 text-slate-400 transition"
                title="Change Password"
              >
                <KeyRound className="h-4 w-4" />
              </button>
            )}
          </div>
        ),
      },
    ],
    [
      currentUser,
      userRole,
      handleDeleteUser,
      handleEditUser,
      editLoadingId,
      handleLoginAsUser,
      loginAsLoadingId,
      searchQuery,
      renderHighlightedText,
    ],
  );

  return (
    <div className="animate-in fade-in bg-mc-beige-light/30 relative flex h-full w-full flex-col overflow-hidden">
      {loginAsLoadingId && (
        <FullPageLoader message="Logging in as this user..." />
      )}
      {/* Header */}
      <div className="border-mc-beige-dark bg-mc-white sticky top-0 z-30 flex w-full flex-shrink-0 flex-col items-start justify-between gap-4 border-b px-5 py-3 shadow-none sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="bg-mc-beige-light text-mc-black flex h-8 w-8 min-w-[2rem] items-center justify-center rounded-lg">
            <Users className="h-4 w-4 shrink-0" />
          </div>
          <div>
            <h1 className="font-display text-mc-black text-lg font-bold">
              User Management
            </h1>
            <p className="text-mc-gray-soft text-xs font-medium">
              Manage system users and access roles
            </p>
          </div>
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="border-mc-beige-dark text-mc-gray-soft hover:bg-mc-beige-light flex flex-1 items-center justify-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 sm:flex-none"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 shrink-0 ${loading ? 'animate-spin' : ''}`}
            />
            <span className="whitespace-nowrap">
              {loading ? 'Refreshing...' : 'Refresh'}
            </span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-mc-gold text-mc-black flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-1.5 text-xs font-bold transition-colors hover:opacity-80 sm:flex-none"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span className="whitespace-nowrap">Add User</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex min-h-0 w-full flex-1 flex-col gap-4 p-4">
        <div className="border-mc-beige-dark bg-mc-white flex flex-shrink-0 flex-col justify-between gap-3 rounded-xl border p-4 shadow-none md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="text-mc-gray-soft absolute top-2.5 left-3 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="border-mc-beige-dark bg-mc-white focus:border-mc-black w-full rounded-lg border py-2 pr-4 pl-9 text-sm transition focus:outline-none"
            />
          </div>
          <div className="flex w-full items-center gap-2 md:w-auto">
            <Filter className="text-mc-gray-soft h-4 w-4 shrink-0" />
            <span className="text-mc-black text-sm font-semibold">Role:</span>
            <div className="relative w-full md:w-56" ref={roleDropdownRef}>
              <button
                type="button"
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className={`bg-mc-white flex w-full items-center justify-between rounded-lg border-2 px-3 py-2 text-sm transition-colors ${
                  roleDropdownOpen
                    ? 'border-mc-gold outline-none'
                    : 'border-mc-beige-dark hover:border-mc-gold'
                }`}
              >
                <span className="truncate">
                  {roleFilter === '' && 'All Roles'}
                  {roleFilter === 'admin' && 'Admin'}
                  {roleFilter === 'office' && 'Office'}
                  {roleFilter === 'vendor' && 'Vendor'}
                  {roleFilter === 'warehouse' && 'Warehouse'}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                    roleDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {roleDropdownOpen && (
                <div className="border-mc-beige-dark bg-mc-white animate-scaleUp absolute left-0 z-50 mt-1 w-full rounded-xl border p-2 shadow-lg">
                  <div className="custom-scrollbar max-h-56 space-y-0.5 overflow-y-auto">
                    {[
                      { value: '', label: 'All Roles' },
                      { value: 'admin', label: 'Admin' },
                      { value: 'office', label: 'Office' },
                      { value: 'vendor', label: 'Vendor' },
                      { value: 'warehouse', label: 'Warehouse' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setRoleFilter(opt.value);
                          setPage(1);
                          setRoleDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                          roleFilter === opt.value
                            ? 'bg-mc-beige-light text-mc-black font-bold'
                            : 'text-mc-black hover:bg-mc-beige-light/50'
                        }`}
                      >
                        <span className="truncate">{opt.label}</span>
                        {roleFilter === opt.value && (
                          <Check className="h-4 w-4 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-mc-beige-dark bg-mc-white relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border shadow-none">
          {loading && <TableLoader message="Loading users..." />}
          <DataTable
            columns={userColumns}
            data={paginatedUsers}
            keyField="id"
            containerClassName="flex-1 flex flex-col min-h-0 w-full relative"
            tableWrapperClassName="overflow-auto flex-1 custom-scrollbar scroll-smooth"
            tableWrapperRef={userTableRef}
            theadClassName="bg-mc-beige-light border-b border-mc-beige-dark text-mc-black uppercase tracking-widest font-extrabold text-[10px] sticky top-0 z-10"
            tableClassName="w-full min-w-[800px] table-fixed text-left text-xs border-collapse"
            tbodyClassName="divide-y divide-mc-beige-dark/40 text-mc-black"
            trClassName="hover:bg-mc-beige-light/30 bg-mc-white transition-colors"
            emptyMessage={
              searchQuery ? 'No users matched your search.' : 'No users found.'
            }
            pagination={
              filteredUsers.length > 0 ? (
                <Pagination
                  currentPage={page}
                  totalCount={filteredUsers.length}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                />
              ) : null
            }
          />
        </div>
      </div>

      {(showAddModal || editingUser) && (
        <AddUserModal
          key={editingUser?.id ?? 'new'}
          user={editingUser}
          onClose={() => {
            setShowAddModal(false);
            setEditingUser(null);
          }}
          onSuccess={handleRefresh}
        />
      )}

      {showChangePasswordModal && (
        <ChangePasswordModal
          onClose={() => setShowChangePasswordModal(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="animate-in fade-in zoom-in-95 border-mc-beige-dark bg-mc-white relative w-full max-w-sm rounded-2xl border shadow-2xl duration-200">
            {/* Header */}
            <div className="border-mc-beige-dark flex items-center justify-between border-b px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="bg-mc-beige-light border-mc-beige-dark flex h-9 w-9 items-center justify-center rounded-xl border">
                  <AlertTriangle className="text-mc-gold h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-mc-black text-sm font-bold">
                    Delete User
                  </h3>
                  <p className="text-mc-gray-soft text-[10px]">
                    This cannot be undone
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeletingUser(null)}
                disabled={isDeleting}
                className="text-mc-gray-soft hover:bg-mc-beige-light rounded-lg p-1.5 transition disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="bg-mc-beige-light/40 px-5 py-5">
              <p className="text-mc-black text-sm leading-relaxed">
                Are you sure you want to permanently delete{' '}
                <span className="font-bold">
                  {[deletingUser.first_name, deletingUser.last_name]
                    .filter(Boolean)
                    .join(' ') || deletingUser.email}
                </span>
                ?
              </p>
              <p className="text-mc-gray-soft mt-2 text-xs leading-relaxed">
                The user will immediately lose all access to the system. This
                action is permanent and cannot be reversed.
              </p>
            </div>

            {/* Footer */}
            <div className="border-mc-beige-dark flex items-center justify-end gap-2 border-t px-5 py-4">
              <button
                onClick={() => setDeletingUser(null)}
                disabled={isDeleting}
                className="border-mc-beige-dark bg-mc-white text-mc-black hover:bg-mc-beige-light rounded-lg border px-4 py-2 text-xs font-bold transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                disabled={isDeleting}
                className="bg-mc-black text-mc-beige-light hover:bg-mc-black/80 flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition disabled:opacity-60"
              >
                {isDeleting ? (
                  <>
                    <svg
                      className="h-3.5 w-3.5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete User
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
