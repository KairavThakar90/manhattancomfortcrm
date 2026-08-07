import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Users, Search, RefreshCw, Plus, KeyRound } from 'lucide-react';
import { toast } from 'react-toastify';
import { fetchUsers } from '../store/userSlice';
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
        headerClassName: 'px-6 py-3 bg-slate-50 text-left w-[220px]',
        className: 'px-6 py-3 font-semibold text-slate-800 text-sm',
        render: (u) =>
          u.full_name ||
          `${u.first_name || ''} ${u.last_name || ''}`.trim() ||
          'N/A',
      },
      {
        header: 'Email',
        accessor: 'email',
        headerClassName: 'px-6 py-3 bg-slate-50 text-left',
        className: 'px-6 py-3 text-slate-500 text-sm',
      },
      {
        header: 'Role',
        accessor: 'role',
        headerClassName: 'px-6 py-3 bg-slate-50 text-left w-[160px]',
        className: 'px-6 py-3 w-[160px]',
        render: (u) => (
          <span className="inline-flex items-center rounded-md border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-bold tracking-wider text-indigo-700 uppercase">
            {u.role || 'User'}
          </span>
        ),
      },
      {
        header: 'Actions',
        accessor: 'actions',
        headerClassName: 'px-6 py-3 bg-slate-50 text-center w-[90px]',
        className: 'px-6 py-3 w-[90px] text-center',
        render: (u) => (
          <div className="flex items-center justify-center gap-2">
            {currentUser?.id && String(currentUser.id) === String(u.id) ? (
              <button
                onClick={() => setShowChangePasswordModal(true)}
                className="rounded-md p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                title="Change Password"
              >
                <KeyRound className="h-4 w-4" />
              </button>
            ) : (
              <span className="text-xs text-slate-200">—</span>
            )}
          </div>
        ),
      },
    ],
    [currentUser],
  );

  return (
    <div className="animate-in fade-in relative flex h-full w-full flex-col overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-30 flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-slate-800">
              User Management
            </h1>
            <p className="text-xs font-medium text-slate-500">
              Manage system users and access roles
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchUsers(true)}
            disabled={loading}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
            />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add User
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex min-h-0 w-full flex-1 flex-col gap-4 p-4">
        <div className="flex flex-shrink-0 flex-col justify-between gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or role..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-4 pl-9 text-sm transition focus:border-indigo-500 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          {loading && <TableLoader message="Loading users..." />}
          <DataTable
            columns={userColumns}
            data={paginatedUsers}
            keyField="id"
            containerClassName="flex-1 flex flex-col min-h-0 w-full relative"
            tableWrapperClassName="overflow-auto flex-1 custom-scrollbar scroll-smooth"
            tableWrapperRef={userTableRef}
            theadClassName="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold sticky top-0 z-10"
            tableClassName="w-full text-left text-xs border-collapse"
            tbodyClassName="divide-y divide-slate-100"
            trClassName="hover:bg-slate-50 hover:bg-opacity-50 transition"
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

      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => dispatch(fetchUsers())}
        />
      )}

      {showChangePasswordModal && (
        <ChangePasswordModal
          onClose={() => setShowChangePasswordModal(false)}
        />
      )}
    </div>
  );
}
