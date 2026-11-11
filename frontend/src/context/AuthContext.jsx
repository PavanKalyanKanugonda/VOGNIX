import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
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

  // Refresh user profile if token exists
  const fetchProfile = useCallback(async () => {
    if (!localStorage.getItem('vognix_token')) {
      setLoading(false);
      return;
    }
    try {
      const res = await authAPI.getProfile();
      if (res.data) {
        setUser(res.data);
        localStorage.setItem('vognix_user', JSON.stringify(res.data));
      }
    } catch (err) {
      // If token is invalid or expired, clear session silently
      logout(true);
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const login = async (email, password) => {
    try {
      const res = await authAPI.login({ email, password });
      const authData = res.data;
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
      const res = await authAPI.register(registerData);
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
