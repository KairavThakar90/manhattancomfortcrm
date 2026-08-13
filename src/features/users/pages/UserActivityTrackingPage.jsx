import React, { useState, useEffect } from 'react';
import { RefreshCw, Activity, AlertCircle } from 'lucide-react';
import { getUserActivities } from '../services/user.service';
import Pagination from '../../../components/common/Pagination';
import DataTable from '../../../components/common/DataTable';
import TableLoader from '../../../components/common/TableLoader';
import { useCRM } from '../../../hooks/useCRM';

export default function UserActivityTrackingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activities, setActivities] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const [pageSize, setPageSize] = useState(25);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getUserActivities({
        page: currentPage,
        size: pageSize,
      });

      let results = [];
      if (Array.isArray(data)) {
        results = data;
        setTotalCount(data.length);
      } else if (data.results && Array.isArray(data.results)) {
        results = data.results;
        setTotalCount(data.total || data.count || data.results.length);
      }
      setActivities(results);
    } catch (err) {
      console.error('Failed to fetch user activities:', err);
      setError(err.message || 'Failed to fetch user activities.');
    } finally {
      setLoading(false);
      setHasLoadedInitial(true);
    }
  };

  useEffect(() => {
    let timeoutId = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // Define table columns
  const columns = [
    {
      accessor: 'created_at',
      header: 'Time',
      render: (row) => {
        if (!row.created_at) return '-';
        const date = new Date(row.created_at);
        return (
          <div className="flex flex-col text-xs">
            <span className="font-semibold text-slate-800">
              {date.toLocaleDateString()}
            </span>
            <span className="text-slate-500">{date.toLocaleTimeString()}</span>
          </div>
        );
      },
    },
    {
      accessor: 'user',
      header: 'User',
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
    {
      accessor: 'action',
      header: 'Action',
      render: (row) => {
        const action = row.action || '-';
        return (
          <span className="bg-mc-beige-light text-mc-gold inline-block rounded px-2 py-1 text-[10px] font-bold tracking-wider uppercase">
            {action}
          </span>
        );
      },
    },
    {
      accessor: 'human_readable_message',
      header: 'Details',
      render: (row) => {
        return (
          <span className="text-mc-black text-xs font-medium">
            {row.human_readable_message || '-'}
          </span>
        );
      },
    },
  ];

  return (
    <div className="bg-mc-beige-light/30 relative flex h-full w-full flex-col overflow-hidden">
      {/* Header */}
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
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="border-mc-beige-dark hover:bg-mc-beige-light hover:text-mc-black text-mc-gray-soft flex items-center gap-1 rounded-lg border bg-transparent px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
            />
            <span>{loading ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex min-h-0 flex-1 flex-col p-4 md:p-5">
        <div className="border-mc-beige-dark bg-mc-white relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border shadow-xs">
          {error ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-red-500">
              <AlertCircle className="mb-4 h-12 w-12 opacity-50" />
              <h3 className="mb-2 text-lg font-bold">
                Error Loading Activities
              </h3>
              <p className="text-sm opacity-80">{error}</p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col overflow-hidden">
              <DataTable
                columns={columns}
                data={activities}
                containerClassName="flex-1 flex flex-col min-h-0 w-full relative"
                tableWrapperClassName="overflow-auto flex-1 custom-scrollbar scroll-smooth"
                defaultThClassName="px-6 py-3 bg-transparent"
                theadClassName="bg-mc-beige-light border-b border-mc-beige-dark text-mc-black uppercase tracking-widest text-[10px] font-extrabold sticky top-0 z-10"
                tableClassName="w-full min-w-max whitespace-nowrap text-left text-xs border-collapse"
                tbodyClassName="divide-y divide-mc-beige-dark/40 bg-mc-white"
                trClassName="transition bg-mc-white hover:bg-mc-beige-light/30"
                pagination={
                  (!loading || hasLoadedInitial) && totalCount > 0 ? (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={Math.ceil(totalCount / pageSize)}
                      totalCount={totalCount}
                      pageSize={pageSize}
                      onPageChange={handlePageChange}
                      onPageSizeChange={handlePageSizeChange}
                      isKanban={false}
                    />
                  ) : null
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
