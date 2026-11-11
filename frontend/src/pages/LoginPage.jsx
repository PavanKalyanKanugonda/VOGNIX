import React, { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, UserCheck, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const rawRedirect = searchParams.get('redirect') || location.state?.from?.pathname || '/';
  const safeRedirect =
    rawRedirect && !rawRedirect.startsWith('/login') && !rawRedirect.startsWith('/register')
      ? rawRedirect
      : '/';

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    setErrorMsg('');
    setSubmitting(true);
    try {
      const auth = await login(email, password);
      if (auth?.roles?.includes('ROLE_ADMIN')) {
        navigate(safeRedirect.startsWith('/admin') && !safeRedirect.startsWith('/admin/login') ? safeRedirect : '/admin/dashboard', { replace: true });
      } else {
        navigate(safeRedirect.startsWith('/admin') ? '/' : safeRedirect, { replace: true });
      }
    } catch (err) {
      setErrorMsg(err.message || 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemoCredentials = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMsg('');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-neutral-50">
      <div className="max-w-md w-full space-y-8 bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-neutral-200">
        <div className="text-center">
          <Link to="/" className="inline-block text-3xl font-black tracking-widest text-neutral-900 font-serif">
            VOGNIX
          </Link>
          <h2 className="mt-4 text-2xl font-bold text-neutral-900">Welcome back</h2>
          <p className="mt-2 text-sm text-neutral-500">
            Sign in to access your curated wardrobe, orders, and wishlist
          </p>
        </div>

        {/* Demo Credentials Quick-Fill Chips */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs space-y-2">
          <p className="font-semibold text-amber-900 flex items-center gap-1.5">
            <ShieldCheck size={16} className="text-amber-700" />
            Quick Demo Auto-Fill (Internship Assessment):
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => fillDemoCredentials('customer@vognix.com', 'Customer@123')}
              className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white hover:bg-amber-100/50 border border-amber-300 rounded-lg text-neutral-800 font-medium transition-colors shadow-xs"
            >
              <UserCheck size={14} className="text-emerald-600" />
              <span>Customer Demo</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemoCredentials('admin@vognix.com', 'Admin@123')}
              className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white hover:bg-amber-100/50 border border-amber-300 rounded-lg text-neutral-800 font-medium transition-colors shadow-xs"
            >
              <ShieldCheck size={14} className="text-indigo-600" />
              <span>Admin Demo</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {errorMsg}
          </div>
        )}

        <form className="mt-8 space-y-5" onSubmit={handleLogin}>
          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <Mail size={18} />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@vognix.com"
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-neutral-900 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-rose-600 hover:text-rose-700 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-neutral-900 focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-medium bg-neutral-900 hover:bg-neutral-800 focus:ring-4 focus:ring-neutral-300 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to VOGNIX</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 space-y-2">
          <p className="text-sm text-neutral-600">
            Don't have an account?{' '}
            <Link
              to={safeRedirect !== '/' ? `/register?redirect=${encodeURIComponent(safeRedirect)}` : '/register'}
              className="font-semibold text-rose-600 hover:text-rose-700 hover:underline"
            >
              Create an account
            </Link>
          </p>
          <p className="text-xs text-neutral-400">
            Store Administrator?{' '}
            <Link to="/admin/login" className="font-semibold text-neutral-700 hover:text-black underline">
              Sign in at Admin Console
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
