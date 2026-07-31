import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Users, Search, RefreshCw, Plus, KeyRound } from 'lucide-react';
import { toast } from 'react-toastify';
import { fetchUsers } from '../store/userSlice';
import { useCRM } from '../hooks/useCRM';
import AddUserModal from '../components/AddUserModal';
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

  // Load users on mount
  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

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
        className: 'px-6 py-4 font-bold text-slate-800',
        render: (u) =>
          u.full_name ||
          `${u.first_name || ''} ${u.last_name || ''}`.trim() ||
          'N/A',
      },
      {
        header: 'Email',
        accessor: 'email',
        className: 'px-6 py-4 font-medium text-slate-600',
      },
      {
        header: 'Role',
        accessor: 'role',
        className: 'px-6 py-4',
        render: (u) => (
          <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border border-indigo-100">
            {u.role || 'User'}
          </span>
        ),
      },
      {
        header: 'Actions',
        accessor: 'actions',
        className: 'px-6 py-4 text-right',
        render: (u) => (
          <div className="flex items-center justify-end gap-2">
            {currentUser?.id && String(currentUser.id) === String(u.id) && (
              <button
                onClick={() => toast.info('Change password flow initiated...')}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition tooltip-trigger"
                title="Change Password"
              >
                <KeyRound className="w-4 h-4" />
              </button>
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
          <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 scroll-smooth">
            <DataTable
              columns={userColumns}
              data={paginatedUsers}
              keyField="id"
              theadClassName="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold sticky top-0 z-10"
              tableClassName="w-full text-left text-xs border-collapse"
              tbodyClassName="divide-y divide-slate-100"
              trClassName="hover:bg-slate-50 hover:bg-opacity-50 transition"
              emptyMessage={
                searchQuery
                  ? 'No users matched your search.'
                  : 'No users found.'
              }
            />
          </div>
          {filteredUsers.length > 0 && (
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
          )}
        </div>
      </div>

      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => fetchUsers(false)}
        />
      )}
    </div>
  );
}
