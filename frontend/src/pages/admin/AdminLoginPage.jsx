import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, ArrowRight, Store } from 'lucide-react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { login, logout, user, isAuthenticated, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const rawRedirect = searchParams.get('redirect') || location.state?.from?.pathname || '/admin/dashboard';
  const safeRedirect =
    rawRedirect && rawRedirect.startsWith('/admin') && !rawRedirect.startsWith('/admin/login')
      ? rawRedirect
      : '/admin/dashboard';

  useEffect(() => {
    if (!loading && isAuthenticated && isAdmin) {
      navigate(safeRedirect, { replace: true });
    }
  }, [loading, isAuthenticated, isAdmin, navigate, safeRedirect]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter administrator email and password.');
      return;
    }
    setErrorMsg('');
    setSubmitting(true);
    try {
      await login(email.trim(), password, { requireAdmin: true });
      navigate(safeRedirect, { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Invalid administrator credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemoAdmin = () => {
    setEmail('admin@vognix.com');
    setPassword('Admin@123');
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto space-y-6">
        {/* Console Brand Header */}
        <div className="text-center">
          <Link to="/" className="inline-block">
            <span className="text-3xl font-black tracking-widest text-white font-serif block">
              VOGNIX
            </span>
          </Link>
          <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-extrabold uppercase tracking-widest">
            <ShieldCheck size={12} /> Admin Console Access
          </span>
          <h1 className="mt-4 text-2xl font-bold text-white">Sign in to Admin Portal</h1>
          <p className="mt-1.5 text-xs text-neutral-400">
            Manage catalog, inventory, fulfillment lifecycle, customers, and audit logs
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white p-8 rounded-2xl shadow-2xl border border-neutral-800 space-y-6">
          {/* Quick-Fill Demo Admin Card */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 text-xs flex items-center justify-between gap-3">
            <div>
              <p className="font-bold text-indigo-950">Demo Admin Account</p>
              <p className="text-[11px] text-indigo-700 font-mono">admin@vognix.com</p>
            </div>
            <button
              type="button"
              onClick={fillDemoAdmin}
              className="px-3 py-1.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg font-semibold text-xs transition-colors shrink-0 cursor-pointer"
            >
              Auto-Fill Admin
            </button>
          </div>

          {!loading && isAuthenticated && !isAdmin && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between gap-2">
              <span>
                Signed in as <strong>{user?.email}</strong> (Customer). Sign in with an Administrator account below.
              </span>
              <button
                type="button"
                onClick={() => logout()}
                className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg font-semibold text-amber-900 hover:bg-amber-100 shrink-0 cursor-pointer"
              >
                Sign out
              </button>
            </div>
          )}

          {errorMsg && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium leading-relaxed">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Administrator Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@vognix.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password?from=admin"
                  className="text-xs font-medium text-rose-600 hover:text-rose-700 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-700"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-semibold text-sm bg-neutral-900 hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Enter Admin Console</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
            <Link to="/" className="inline-flex items-center gap-1.5 font-semibold text-neutral-700 hover:text-black">
              <Store size={14} /> Storefront
            </Link>
            <Link to="/login" className="font-semibold text-rose-600 hover:text-rose-700 hover:underline">
              Customer Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
