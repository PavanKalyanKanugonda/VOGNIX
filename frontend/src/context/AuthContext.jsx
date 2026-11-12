import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);
const DEFAULT_RETRY_DELAYS_MS = [800, 1600, 2400];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientAuthError = (err) => {
  if (!err) return false;
  if (err.isTransient || err.isNetworkError) return true;
  return err.status === 0 || err.status === 502 || err.status === 503 || err.status === 504;
};

export const AuthProvider = ({ children, retryDelaysMs = DEFAULT_RETRY_DELAYS_MS }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('vognix_user');
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      localStorage.removeItem('vognix_user');
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('vognix_token') || null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const isAdmin = user?.roles?.includes('ROLE_ADMIN') || false;
  const isAuthenticated = !!token && !!user;

  const logout = useCallback((silent = false) => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('vognix_token');
    localStorage.removeItem('vognix_user');
    if (!silent) {
      showToast('You have been logged out safely.', 'info');
    }
  }, [showToast]);

  // Refresh user profile if token exists, retrying transient startup errors without wiping session
  const fetchProfile = useCallback(async (isCancelled = () => false) => {
    if (!localStorage.getItem('vognix_token')) {
      if (!isCancelled()) {
        setLoading(false);
      }
      return;
    }

    for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
      if (isCancelled()) return;
      try {
        const res = await authAPI.getProfile();
        if (!isCancelled() && res?.data) {
          setUser(res.data);
          localStorage.setItem('vognix_user', JSON.stringify(res.data));
        }
        if (!isCancelled()) {
          setLoading(false);
        }
        return;
      } catch (err) {
        if (isCancelled()) return;

        // Only clear saved credentials when backend explicitly rejects the token/user (401/403/404)
        if (err?.status === 401 || err?.status === 403 || err?.status === 404) {
          logout(true);
          if (!isCancelled()) {
            setLoading(false);
          }
          return;
        }

        if (isTransientAuthError(err) && attempt < retryDelaysMs.length) {
          await sleep(retryDelaysMs[attempt]);
          continue;
        }

        // Preserve local session on transient startup/network errors instead of logging out prematurely
        if (!isTransientAuthError(err) && err?.status == null) {
          logout(true);
        }
        if (!isCancelled()) {
          setLoading(false);
        }
        return;
      }
    }
  }, [logout, retryDelaysMs]);

  useEffect(() => {
    let cancelled = false;
    fetchProfile(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [fetchProfile]);

  const login = async (email, password, options = {}) => {
    const { requireAdmin = false } = options;
    try {
      const normalizedEmail = typeof email === 'string' ? email.trim() : email;
      const res = await authAPI.login({ email: normalizedEmail, password });
      const authData = res.data;
      if (requireAdmin && !authData?.roles?.includes('ROLE_ADMIN')) {
        const err = new Error('Access denied: This console is restricted to accounts with Administrator (ROLE_ADMIN) privileges.');
        err.status = 403;
        throw err;
      }
      setToken(authData.token);
      setUser(authData);
      localStorage.setItem('vognix_token', authData.token);
      localStorage.setItem('vognix_user', JSON.stringify(authData));
      showToast(`Welcome back, ${authData.firstName}!`, 'success');
      return authData;
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const register = async (registerData) => {
    try {
      const payload = {
        ...registerData,
        email: typeof registerData.email === 'string' ? registerData.email.trim() : registerData.email,
        firstName: typeof registerData.firstName === 'string' ? registerData.firstName.trim() : registerData.firstName,
        lastName: typeof registerData.lastName === 'string' ? registerData.lastName.trim() : registerData.lastName,
        phone: typeof registerData.phone === 'string' && registerData.phone.trim() ? registerData.phone.trim() : null,
      };
      const res = await authAPI.register(payload);
      const authData = res.data;
      setToken(authData.token);
      setUser(authData);
      localStorage.setItem('vognix_token', authData.token);
      localStorage.setItem('vognix_user', JSON.stringify(authData));
      showToast(`Account created successfully! Welcome to VOGNIX, ${authData.firstName}`, 'success');
      return authData;
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const updateUser = (updatedData) => {
    setUser((prev) => {
      const merged = { ...prev, ...updatedData };
      localStorage.setItem('vognix_user', JSON.stringify(merged));
      return merged;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        loading,
        login,
        register,
        logout,
        updateUser,
        fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
