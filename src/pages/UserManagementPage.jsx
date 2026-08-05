import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Users, Search, RefreshCw, Plus, KeyRound } from 'lucide-react';
import { toast } from 'react-toastify';
import { fetchUsers } from '../store/userSlice';
import { useCRM } from '../hooks/useCRM';
import AddUserModal from '../components/AddUserModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import Pagination from '../components/common/Pagination';
import TableLoader from '../components/common/TableLoader';
import DataTable from '../components/common/DataTable';

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
          <span className="inline-flex items-center bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border border-indigo-100">
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
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition"
                title="Change Password"
              >
                <KeyRound className="w-4 h-4" />
              </button>
            ) : (
              <span className="text-slate-200 text-xs">—</span>
            )}
          </div>
        ),
      },
    ],
    [currentUser],
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 w-full overflow-hidden relative animate-in fade-in">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-slate-800">
              User Management
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Manage system users and access roles
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchUsers(true)}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-xs font-medium transition disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
            />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg font-semibold text-xs transition-colors shadow-sm flex items-center gap-2"
          >
            <Plus className="h-3.5 w-3.5" />
            Add User
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 w-full min-h-0 flex flex-col gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center gap-3 flex-shrink-0 justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or role..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white transition"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0 relative">
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
