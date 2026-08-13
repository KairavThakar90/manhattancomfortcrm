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
} from 'lucide-react';
import { toast } from 'react-toastify';
import { fetchUsers } from '../store/userSlice';
import { deleteUser } from '../services/user.service';
import { useCRM } from '../../../hooks/useCRM';
import AddUserModal from '../components/AddUserModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import Pagination from '../../../components/common/Pagination';
import TableLoader from '../../../components/common/TableLoader';
import DataTable from '../../../components/common/DataTable';

export default function UserManagementPage() {
  const dispatch = useDispatch();
  const { user: currentUser } = useCRM();

  const { list: users, loading } = useSelector((state) => state.users);

  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load users on mount
  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  const userTableRef = useRef(null);

  // Scroll users table to top after pagination changes
  useEffect(() => {
    if (userTableRef.current) {
      userTableRef.current.scrollTop = 0;
    }
  }, [page, pageSize]);

  const handleRefresh = () => {
    dispatch(fetchUsers())
      .unwrap()
      .then(() => toast.success('Users refreshed successfully'))
      .catch(() => toast.error('Failed to update user list'));
  };

  const handleDeleteUser = useCallback(async (user) => {
    setDeletingUser(user);
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
      dispatch(fetchUsers());
      setDeletingUser(null);
    } catch (err) {
      toast.error('Failed to delete user. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }, [deletingUser, dispatch]);

  // Client-side filtering & pagination
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const lowerQuery = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        (u.first_name || '').toLowerCase().includes(lowerQuery) ||
        (u.last_name || '').toLowerCase().includes(lowerQuery) ||
        (u.email || '').toLowerCase().includes(lowerQuery) ||
        (u.username || '').toLowerCase().includes(lowerQuery) ||
        (u.role || '').toLowerCase().includes(lowerQuery),
    );
  }, [users, searchQuery]);

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, page, pageSize]);

  const userColumns = useMemo(
    () => [
      {
        header: 'Name',
        accessor: 'name',
        headerClassName: 'px-6 py-3 bg-transparent text-left w-[220px]',
        className: 'px-6 py-3 font-semibold text-mc-black text-sm',
        render: (u) =>
          u.full_name ||
          `${u.first_name || ''} ${u.last_name || ''}`.trim() ||
          'N/A',
      },
      {
        header: 'Email',
        accessor: 'email',
        headerClassName: 'px-6 py-3 bg-transparent text-left',
        className: 'px-6 py-3 text-mc-gray-soft text-sm',
      },
      {
        header: 'Role',
        accessor: 'role',
        headerClassName: 'px-6 py-3 bg-transparent text-left w-[160px]',
        className: 'px-6 py-3 w-[160px]',
        render: (u) => (
          <span className="border-mc-beige-dark bg-mc-beige-light text-mc-black inline-flex items-center rounded-md border px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase">
            {u.role || 'User'}
          </span>
        ),
      },
      {
        header: 'Actions',
        accessor: 'actions',
        headerClassName: 'px-6 py-3 bg-transparent text-center w-[90px]',
        className: 'px-6 py-3 w-[90px] text-center',
        render: (u) => (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setEditingUser(u)}
              className="hover:bg-mc-beige-light hover:text-mc-gold rounded-md p-1.5 text-slate-400 transition"
              title="Edit User"
            >
              <Pencil className="h-4 w-4" />
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
    [currentUser, handleDeleteUser],
  );

  return (
    <div className="animate-in fade-in bg-mc-beige-light/30 relative flex h-full w-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-mc-beige-dark bg-mc-white sticky top-0 z-30 flex flex-shrink-0 items-center justify-between border-b px-5 py-3 shadow-none">
        <div className="flex items-center gap-3">
          <div className="bg-mc-beige-light text-mc-black flex h-8 w-8 items-center justify-center rounded-lg">
            <Users className="h-4 w-4" />
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
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchUsers(true)}
            disabled={loading}
            className="border-mc-beige-dark text-mc-gray-soft hover:bg-mc-beige-light flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
            />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-mc-gold text-mc-black flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-bold transition-colors hover:opacity-80"
          >
            <Plus className="h-3.5 w-3.5" />
            Add User
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
              placeholder="Search by name, email, or role..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="border-mc-beige-dark bg-mc-white focus:border-mc-black w-full rounded-lg border py-2 pr-4 pl-9 text-sm transition focus:outline-none"
            />
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
            tableClassName="w-full text-left text-xs border-collapse"
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
          user={editingUser}
          onClose={() => {
            setShowAddModal(false);
            setEditingUser(null);
          }}
          onSuccess={() => dispatch(fetchUsers())}
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
