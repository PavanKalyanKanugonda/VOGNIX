import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { ShieldAlert, Clock, User, FileText, Globe } from 'lucide-react';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const { showToast } = useToast();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getAuditLogs({ page, size: 15 });
      setLogs(res.data?.content || []);
      setTotalPages(res.data?.totalPages || 1);
    } catch (err) {
      showToast(err.message || 'Failed to fetch audit logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const getActionColor = (action) => {
    if (action.includes('CREATED') || action.includes('REGISTERED')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (action.includes('DELETED') || action.includes('CANCELLED')) {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    if (action.includes('UPDATED')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    return 'bg-neutral-100 text-neutral-700 border-neutral-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight font-serif">
          Administrative Audit Trail
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Immutable audit records of administrative changes, stock updates, and order events
        </p>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50/70 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-6">Timestamp</th>
                <th className="py-3 px-6">Action</th>
                <th className="py-3 px-6">Actor (Admin / System)</th>
                <th className="py-3 px-6">Entity</th>
                <th className="py-3 px-6">Event Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-neutral-400">
                    <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-neutral-400">
                    No audit records recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-4 px-6 font-mono text-neutral-600">
                      {new Date(log.createdAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'medium',
                      })}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getActionColor(
                          log.actionType
                        )}`}
                      >
                        {log.actionType}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 font-medium text-neutral-800">
                        <User size={13} className="text-neutral-400" />
                        <span>{log.userEmail || 'System Process'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-semibold text-neutral-900">{log.entityName}</p>
                      {log.entityId && (
                        <p className="text-[10px] text-neutral-400 font-mono">
                          ID: #{log.entityId}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-6 text-neutral-700 max-w-sm truncate">
                      {log.details || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 bg-neutral-50/50 border-t border-neutral-200 flex items-center justify-between text-xs">
            <span className="text-neutral-500">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 bg-white border border-neutral-200 rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 bg-white border border-neutral-200 rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
