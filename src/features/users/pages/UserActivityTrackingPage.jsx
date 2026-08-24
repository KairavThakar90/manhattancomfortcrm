import React, { useState, useEffect, useMemo, useRef, useContext } from 'react';
import {
  RefreshCw,
  Activity,
  AlertCircle,
  Search,
  X,
  ChevronDown,
  Check,
  User,
} from 'lucide-react';
import moment from 'moment-timezone';
import { getUserActivities, getUsers } from '../services/user.service';
import Pagination from '../../../components/common/Pagination';
import DataTable from '../../../components/common/DataTable';
import TableLoader from '../../../components/common/TableLoader';
import { CRMContext } from '../../../context/CRMContext';

export default function UserActivityTrackingPage() {
  const { userRole, user } = useContext(CRMContext);

  const normalizedRole = (userRole || '').toLowerCase();
  const isAdminOrOffice = ['administrator', 'admin', 'office'].includes(
    normalizedRole,
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activities, setActivities] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);

  // ── All users from GET /api/v1/auth/users ─────────────────────────────
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    getUsers()
      .then((data) => setAllUsers(Array.isArray(data) ? data : []))
      .catch(() => setAllUsers([]));
  }, []);

  // ── Filters ──────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [userDropOpen, setUserDropOpen] = useState(false);
  const userDropRef = useRef(null);

  // Close user dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (userDropRef.current && !userDropRef.current.contains(e.target))
        setUserDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Data fetch — dynamic pagination via API ──────────────────────────
  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // If not Admin/Office, optionally restrict to their own ID purely via API
      const forcedUserId = !isAdminOrOffice
        ? user?.id
        : userFilter || undefined;

      const data = await getUserActivities({
        page: currentPage,
        size: pageSize,
        search: searchQuery || undefined,
        user_id: forcedUserId || undefined,
      });

      let results = [];
      let count = 0;
      if (Array.isArray(data)) {
        results = data;
        count = data.length;
      } else if (data.results && Array.isArray(data.results)) {
        results = data.results;
        count = data.total || data.count || data.results.length || 0;
      }

      setActivities(results);
      setTotalCount(count);
    } catch (err) {
      console.error('Failed to fetch user activities:', err);
      setError(err.message || 'Failed to fetch user activities.');
    } finally {
      setLoading(false);
      setHasLoadedInitial(true);
    }
  }, [user, isAdminOrOffice, currentPage, pageSize, searchQuery, userFilter]);

  // Fetch when dependencies change
  useEffect(() => {
    const id = setTimeout(() => fetchData(), 300); // Small debounce for search
    return () => clearTimeout(id);
  }, [fetchData]);

  // ── User options from /api/v1/auth/users ─────────────────────────────
  const userOptions = useMemo(
    () =>
      allUsers
        .map((u) => {
          const label =
            u.full_name ||
            `${u.first_name || ''} ${u.last_name || ''}`.trim() ||
            u.email ||
            u.username ||
            '';
          return { value: u.id, label };
        })
        .filter((o) => o.value)
        .sort((a, b) => a.label.localeCompare(b.label)),
    [allUsers],
  );

  // ── Pagination handlers ──────────────────────────────────────────────
  const handlePageChange = (p) => setCurrentPage(p);
  const handlePageSizeChange = (s) => {
    setPageSize(s);
    setCurrentPage(1);
  };

  // ── Timezone helper ──────────────────────────────────────────────────
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const fmtTime = (ts) => {
    if (!ts) return '-';
    const m = moment.utc(ts).tz(userTz);
    return m.isValid() ? m.format('YYYY/MM/DD hh:mm A') : '-';
  };

  // ── Table columns ────────────────────────────────────────────────────
  const columns = [
    {
      accessor: 'created_at',
      header: 'Time',
      headerClassName: 'px-6 py-3 bg-transparent text-left w-[16%]',
      className: 'px-6 py-3 w-[16%]',
      render: (row) => (
        <span className="text-mc-gray-soft font-mono text-xs">
          {fmtTime(row.created_at)}
        </span>
      ),
    },
    ...(isAdminOrOffice
      ? [
          {
            accessor: 'user',
            header: 'User',
            headerClassName: 'px-6 py-3 bg-transparent text-left w-[20%]',
            className: 'px-6 py-3 w-[20%]',
            render: (row) => {
              const userName = row.user_name || row.user?.full_name || 'System';
              return (
                <div className="flex flex-col text-xs">
                  <span className="text-mc-black font-bold">{userName}</span>
                  {row.user?.email && (
                    <span className="text-mc-gray-soft">{row.user.email}</span>
                  )}
                </div>
              );
            },
          },
        ]
      : []),
    {
      accessor: 'action',
      header: 'Action',
      headerClassName: 'px-6 py-3 bg-transparent text-left w-[14%]',
      className: 'px-6 py-3 w-[14%]',
      render: (row) => (
        <span className="bg-mc-beige-light text-mc-gold inline-block rounded px-2 py-1 text-[10px] font-bold tracking-wider uppercase">
          {row.action || '-'}
        </span>
      ),
    },
    {
      accessor: 'human_readable_message',
      header: 'Details',
      headerClassName: 'px-6 py-3 bg-transparent text-left',
      className: 'px-6 py-3',
      render: (row) => (
        <span className="text-mc-black text-xs font-medium">
          {row.human_readable_message || '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="bg-mc-beige-light/30 relative flex h-full w-full flex-col overflow-hidden">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="border-mc-beige-dark bg-mc-white sticky top-0 z-30 flex flex-shrink-0 items-center justify-between border-b px-5 py-3 shadow-none">
        <div className="flex items-center gap-3">
          <div className="bg-mc-beige-light text-mc-black flex h-8 w-8 items-center justify-center rounded-lg">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h1 className="font-display text-mc-black text-lg font-bold">
              Activity Tracking
            </h1>
            <p className="text-mc-gray-soft text-xs font-medium">
              Monitor user actions and system events
            </p>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="border-mc-beige-dark hover:bg-mc-beige-light text-mc-gray-soft flex items-center gap-1 rounded-lg border bg-transparent px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
          />
          <span>{loading ? 'Refreshing...' : 'Refresh Data'}</span>
        </button>
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        {/* ── Filter Bar ────────────────────────────────────────────── */}
        <div className="border-mc-beige-dark bg-mc-white flex flex-shrink-0 flex-wrap items-center gap-3 rounded-xl border p-3 shadow-none">
          {/* Search */}
          <div className="relative min-w-0 flex-1">
            <Search className="text-mc-gray-soft absolute top-2.5 left-3 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by user, action, description…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="border-mc-beige-dark bg-mc-white focus:border-mc-black w-full rounded-lg border py-2 pr-8 pl-9 text-sm transition focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="text-mc-gray-soft hover:text-mc-black absolute top-2.5 right-3"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* User dropdown - only visible to admin/office */}
          {isAdminOrOffice && (
            <div className="flex items-center gap-2">
              <User className="text-mc-gray-soft h-4 w-4 shrink-0" />
              <span className="text-mc-gray-soft text-xs font-bold whitespace-nowrap">
                User:
              </span>
              <div className="relative w-44" ref={userDropRef}>
                <button
                  type="button"
                  onClick={() => setUserDropOpen((o) => !o)}
                  className={`border-mc-beige-dark bg-mc-white hover:border-mc-gold flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs transition ${userDropOpen ? 'border-mc-gold' : ''}`}
                >
                  <span className="truncate">
                    {userFilter
                      ? userOptions.find((o) => o.value === userFilter)
                          ?.label || userFilter
                      : 'All Users'}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-slate-400 transition-transform ${userDropOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {userDropOpen && (
                  <div className="border-mc-beige-dark bg-mc-white animate-scaleUp absolute top-full left-0 z-50 mt-1 w-full rounded-xl border p-1.5 shadow-lg">
                    <div className="custom-scrollbar max-h-52 space-y-0.5 overflow-y-auto">
                      {[{ value: '', label: 'All Users' }, ...userOptions].map(
                        (opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setUserFilter(opt.value);
                              setCurrentPage(1);
                              setUserDropOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs transition ${userFilter === opt.value ? 'bg-mc-beige-light text-mc-black font-bold' : 'text-mc-black hover:bg-mc-beige-light/50'}`}
                          >
                            <span className="truncate">{opt.label}</span>
                            {userFilter === opt.value && (
                              <Check className="h-3.5 w-3.5 shrink-0" />
                            )}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Table ─────────────────────────────────────────────────── */}
        <div className="border-mc-beige-dark bg-mc-white relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border shadow-none">
          {loading && <TableLoader message="Loading activities…" />}

          {error ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-red-500">
              <AlertCircle className="mb-4 h-12 w-12 opacity-50" />
              <h3 className="mb-2 text-lg font-bold">
                Error Loading Activities
              </h3>
              <p className="text-sm opacity-80">{error}</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={activities}
              containerClassName="flex-1 flex flex-col min-h-0 w-full relative"
              tableWrapperClassName="overflow-auto flex-1 custom-scrollbar scroll-smooth"
              theadClassName="bg-mc-beige-light border-b border-mc-beige-dark text-mc-black uppercase tracking-widest text-[10px] font-extrabold sticky top-0 z-10"
              tableClassName="w-full min-w-max whitespace-nowrap text-left text-xs border-collapse"
              tbodyClassName="divide-y divide-mc-beige-dark/40 bg-mc-white"
              trClassName="transition bg-mc-white hover:bg-mc-beige-light/30"
              emptyMessage={
                searchQuery || userFilter
                  ? 'No activities matched your search or filters.'
                  : 'No activity records found.'
              }
              pagination={
                (!loading || hasLoadedInitial) && totalCount > 0 ? (
                  <Pagination
                    currentPage={currentPage}
                    totalCount={totalCount}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                  />
                ) : null
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
