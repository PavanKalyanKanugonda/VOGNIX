import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Users, Search, CheckCircle2, XCircle, ShieldCheck, UserCheck, X } from 'lucide-react';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [updatingId, setUpdatingId] = useState(null);

  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getCustomers({
        search: searchTerm || undefined,
        page,
        size: 15,
      });
      setCustomers(res.data?.content || []);
      setTotalPages(res.data?.totalPages || 1);
      setTotalElements(res.data?.totalElements || 0);
    } catch (err) {
      showToast(err.message || 'Failed to fetch customer accounts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [searchTerm, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    setSearchTerm(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setPage(0);
    setSearchTerm('');
  };

  const handleToggleStatus = async (customer) => {
    setUpdatingId(customer.id);
    try {
      await adminAPI.updateCustomerStatus(customer.id, !customer.isActive);
      showToast(
        `${customer.email} has been ${customer.isActive ? 'suspended' : 'reactivated'}.`,
        'success'
      );
      await fetchCustomers();
    } catch (err) {
      showToast(err.message || 'Failed to update customer status', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight font-serif">
            Customers &amp; Accounts
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Inspect registered users ({totalElements}), lifetime spend, and account access states
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name or email..."
              className="pl-9 pr-8 py-2 bg-white border border-neutral-200 rounded-xl text-xs w-60 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50/70 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-6">User</th>
                <th className="py-3 px-6">Phone</th>
                <th className="py-3 px-6">Roles</th>
                <th className="py-3 px-6">Orders</th>
                <th className="py-3 px-6">Lifetime Spend</th>
                <th className="py-3 px-6">Joined</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-neutral-400">
                    <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading customer directory...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-neutral-400">
                    No users matched your search criteria.
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const isSelf =
                    (currentUser?.id && currentUser.id === c.id) ||
                    (currentUser?.email && currentUser.email.toLowerCase() === c.email?.toLowerCase());
                  const hasAdminRole = c.roles?.includes('ROLE_ADMIN');

                  return (
                    <tr key={c.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-3.5 px-6">
                        <p className="font-bold text-neutral-900">
                          {c.firstName} {c.lastName}
                          {isSelf && (
                            <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-neutral-900 text-white">
                              You
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-neutral-500 font-mono">{c.email}</p>
                      </td>
                      <td className="py-3.5 px-6 text-neutral-600">{c.phone || '—'}</td>
                      <td className="py-3.5 px-6">
                        <div className="flex flex-wrap gap-1">
                          {c.roles?.map((role) => (
                            <span
                              key={role}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                role === 'ROLE_ADMIN'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {role === 'ROLE_ADMIN' ? <ShieldCheck size={10} /> : <UserCheck size={10} />}
                              {role.replace('ROLE_', '')}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-6 font-bold text-neutral-900">{c.orderCount ?? 0}</td>
                      <td className="py-3.5 px-6 font-bold text-neutral-900">
                        ₹{Number(c.totalSpent || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-6 text-neutral-500">
                        {c.createdAt
                          ? new Date(c.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })
                          : '—'}
                      </td>
                      <td className="py-3.5 px-6">
                        {c.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 size={12} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full">
                            <XCircle size={12} /> Suspended
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <button
                          type="button"
                          disabled={updatingId === c.id || (isSelf && c.isActive)}
                          onClick={() => handleToggleStatus(c)}
                          title={
                            isSelf && c.isActive
                              ? 'Administrators cannot deactivate their own active session'
                              : hasAdminRole && c.isActive
                              ? 'Suspend account'
                              : c.isActive
                              ? 'Suspend customer account'
                              : 'Reactivate account'
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                            c.isActive
                              ? 'border border-rose-200 text-rose-700 hover:bg-rose-50'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {updatingId === c.id
                            ? 'Saving...'
                            : c.isActive
                            ? 'Suspend'
                            : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })
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
