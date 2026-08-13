import React, { useState, useEffect } from 'react';
import { RefreshCw, Activity, AlertCircle } from 'lucide-react';
import { getUserActivities } from '../services/user.service';
import Pagination from '../../../components/common/Pagination';
import DataTable from '../../../components/common/DataTable';
import { useCRM } from '../../../hooks/useCRM';

export default function UserActivityTrackingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activities, setActivities] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const pageSize = 50;

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
  }, [currentPage]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
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
    <div className="flex h-full w-full flex-col">
      <div className="mb-4 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-mc-black font-display text-2xl font-extrabold tracking-tight">
            Activity Tracking
          </h1>
          <p className="text-mc-gray-soft mt-1 text-sm">
            Monitor user actions and system events.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="bg-mc-gold text-mc-white hover:bg-mc-black flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold shadow-md transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="border-mc-beige-dark bg-mc-white flex flex-1 flex-col overflow-hidden rounded-xl border shadow-sm">
        {error ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-red-500">
            <AlertCircle className="mb-4 h-12 w-12 opacity-50" />
            <h3 className="mb-2 text-lg font-bold">Error Loading Activities</h3>
            <p className="text-sm opacity-80">{error}</p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-auto">
              <DataTable
                columns={columns}
                data={activities}
                isLoading={loading && !hasLoadedInitial}
              />
            </div>

            {/* Pagination Controls */}
            {!loading && totalCount > 0 && (
              <div className="border-mc-beige-dark border-t p-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(totalCount / pageSize)}
                  onPageChange={handlePageChange}
                  totalCount={totalCount}
                  pageSize={pageSize}
                  isKanban={false}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
