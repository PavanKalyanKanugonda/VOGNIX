import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  UserCheck,
  X,
  UserPlus,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';

const INITIAL_CREATE_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  roleMode: 'CUSTOMER', // CUSTOMER, ADMIN, BOTH
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [updatingId, setUpdatingId] = useState(null);

  // Create Account Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(INITIAL_CREATE_FORM);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  // Reset Password Modal
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetSaving, setResetSaving] = useState(false);
  const [resetError, setResetError] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

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

  const handleToggleAdminRole = async (customer) => {
    const currentlyAdmin = customer.roles?.includes('ROLE_ADMIN');
    const nextRoles = currentlyAdmin ? ['ROLE_CUSTOMER'] : ['ROLE_ADMIN', 'ROLE_CUSTOMER'];
    setUpdatingId(customer.id);
    try {
      await adminAPI.updateCustomerRoles(customer.id, nextRoles);
      showToast(
        currentlyAdmin
          ? `Removed Administrator access from ${customer.email}.`
          : `Granted Administrator access to ${customer.email}.`,
        'success'
      );
      await fetchCustomers();
    } catch (err) {
      showToast(err.message || 'Failed to update account roles', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!createForm.firstName.trim() || !createForm.lastName.trim() || !createForm.email.trim()) {
      setCreateError('Please fill in first name, last name, and email.');
      return;
    }
    if (createForm.password.length < 6) {
      setCreateError('Initial password must be at least 6 characters.');
      return;
    }

    const roles =
      createForm.roleMode === 'ADMIN'
        ? ['ROLE_ADMIN']
        : createForm.roleMode === 'BOTH'
        ? ['ROLE_ADMIN', 'ROLE_CUSTOMER']
        : ['ROLE_CUSTOMER'];

    setCreateSaving(true);
    try {
      await adminAPI.createCustomer({
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        email: createForm.email.trim(),
        phone: createForm.phone.trim() || null,
        password: createForm.password,
        roles,
      });
      showToast(`Created account for ${createForm.email.trim()}!`, 'success');
      setIsCreateOpen(false);
      setCreateForm(INITIAL_CREATE_FORM);
      await fetchCustomers();
    } catch (err) {
      setCreateError(err.message || 'Failed to create account.');
    } finally {
      setCreateSaving(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetTarget) return;
    setResetError('');
    if (resetPassword.length < 6) {
      setResetError('New password must be at least 6 characters.');
      return;
    }
    if (resetPassword !== resetConfirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }

    setResetSaving(true);
    try {
      await adminAPI.resetCustomerPassword(resetTarget.id, resetPassword);
      showToast(`Password reset for ${resetTarget.email}.`, 'success');
      setResetTarget(null);
      setResetPassword('');
      setResetConfirmPassword('');
    } catch (err) {
      setResetError(err.message || 'Failed to reset account password.');
    } finally {
      setResetSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header + Search + Create Button */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight font-serif">
            Customers &amp; Accounts
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Inspect registered users ({totalElements}), create Customer/Admin accounts, manage roles, and reset passwords
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search name or email..."
                className="pl-9 pr-8 py-2 bg-white border border-neutral-200 rounded-xl text-xs w-56 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
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

          <button
            type="button"
            onClick={() => {
              setCreateError('');
              setCreateForm(INITIAL_CREATE_FORM);
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
          >
            <UserPlus size={14} /> Create Account
          </button>
        </div>
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
                <th className="py-3 px-6 text-right">Actions</th>
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
                        <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            type="button"
                            disabled={updatingId === c.id || (isSelf && hasAdminRole)}
                            onClick={() => handleToggleAdminRole(c)}
                            title={
                              isSelf && hasAdminRole
                                ? 'Administrators cannot revoke their own ROLE_ADMIN privileges'
                                : hasAdminRole
                                ? 'Revoke Administrator privileges'
                                : 'Promote account to Administrator'
                            }
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {hasAdminRole ? 'Make Customer' : 'Make Admin'}
                          </button>

                          <button
                            type="button"
                            disabled={updatingId === c.id}
                            onClick={() => {
                              setResetTarget(c);
                              setResetPassword('');
                              setResetConfirmPassword('');
                              setResetError('');
                            }}
                            title="Reset account password"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-neutral-200 text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-40"
                          >
                            <KeyRound size={11} /> Password
                          </button>

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
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
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
                        </div>
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

      {/* Create Customer / Admin Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h2 className="font-serif text-lg font-bold text-neutral-900">Create Account</h2>
                <p className="text-xs text-neutral-500">Provision a persistent customer or administrator login</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={createForm.firstName}
                    onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                    placeholder="Pavan"
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={createForm.lastName}
                    onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                    placeholder="Kalyan"
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="user@vognix.com"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Account Role *</label>
                <select
                  value={createForm.roleMode}
                  onChange={(e) => setCreateForm({ ...createForm, roleMode: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  <option value="CUSTOMER">Customer (ROLE_CUSTOMER)</option>
                  <option value="ADMIN">Administrator (ROLE_ADMIN)</option>
                  <option value="BOTH">Administrator + Customer</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Initial Password *</label>
                <div className="relative">
                  <input
                    type={showCreatePassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3 pr-9 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword((v) => !v)}
                    className="absolute right-2.5 top-2 text-neutral-400 hover:text-neutral-700"
                  >
                    {showCreatePassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-neutral-200 rounded-xl font-semibold text-neutral-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSaving}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {createSaving ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h2 className="font-serif text-lg font-bold text-neutral-900">Reset Account Password</h2>
                <p className="text-xs text-neutral-500 font-mono">{resetTarget.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {resetError && (
              <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                {resetError}
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">New Password *</label>
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3 pr-9 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword((v) => !v)}
                    className="absolute right-2.5 top-2 text-neutral-400 hover:text-neutral-700"
                  >
                    {showResetPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Confirm New Password *</label>
                <input
                  type={showResetPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="px-4 py-2 border border-neutral-200 rounded-xl font-semibold text-neutral-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetSaving}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {resetSaving ? 'Saving...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
