import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../context/AuthContext';
import AdminLoginPage from '../pages/admin/AdminLoginPage';
import AdminCustomersPage from '../pages/admin/AdminCustomersPage';
import * as ToastContext from '../context/ToastContext';
import { authAPI, adminAPI, default as api } from '../services/api';

const AuthProbe = () => {
  const { user, isAuthenticated, loading } = useAuth();
  return (
    <div>
      <span data-testid="auth-loading">{loading ? 'loading' : 'ready'}</span>
      <span data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'guest'}</span>
      <span data-testid="auth-email">{user?.email || 'none'}</span>
    </div>
  );
};

describe('Dual-Side Authentication & Session Persistence Flow', () => {
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    mockShowToast.mockClear();
    vi.spyOn(ToastContext, 'useToast').mockReturnValue({ showToast: mockShowToast });
  });

  it('preserves saved session when profile validation encounters transient 503 startup errors', async () => {
    const savedUser = {
      id: 2,
      userId: 2,
      email: 'pavan@gmail.com',
      firstName: 'Pavan',
      lastName: 'Kalyan',
      roles: ['ROLE_CUSTOMER'],
    };
    localStorage.setItem('vognix_token', 'persisted-jwt-token');
    localStorage.setItem('vognix_user', JSON.stringify(savedUser));

    const transientError = new Error('Backend Unavailable');
    transientError.status = 503;
    transientError.isTransient = true;

    const profileSpy = vi.spyOn(authAPI, 'getProfile').mockRejectedValue(transientError);

    render(
      <AuthProvider retryDelaysMs={[5, 5]}>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-loading')).toHaveTextContent('ready');
    });

    expect(profileSpy).toHaveBeenCalledTimes(3);
    expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('auth-email')).toHaveTextContent('pavan@gmail.com');
    expect(localStorage.getItem('vognix_token')).toBe('persisted-jwt-token');
  });

  it('recovers profile cleanly when transient 503 resolves during retry', async () => {
    localStorage.setItem('vognix_token', 'persisted-jwt-token');
    localStorage.setItem(
      'vognix_user',
      JSON.stringify({ id: 2, email: 'pavan@gmail.com', roles: ['ROLE_CUSTOMER'] })
    );

    const transientError = new Error('Backend Starting');
    transientError.status = 503;
    transientError.isTransient = true;

    const refreshedProfile = {
      id: 2,
      email: 'pavan@gmail.com',
      firstName: 'Pavan',
      lastName: 'Updated',
      roles: ['ROLE_CUSTOMER'],
    };

    const profileSpy = vi
      .spyOn(authAPI, 'getProfile')
      .mockRejectedValueOnce(transientError)
      .mockResolvedValueOnce({ data: refreshedProfile });

    render(
      <AuthProvider retryDelaysMs={[5, 5]}>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-loading')).toHaveTextContent('ready');
    });

    expect(profileSpy).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
    expect(JSON.parse(localStorage.getItem('vognix_user')).lastName).toBe('Updated');
  });

  it('clears saved credentials when backend explicitly rejects token with 403/401', async () => {
    localStorage.setItem('vognix_token', 'expired-jwt');
    localStorage.setItem(
      'vognix_user',
      JSON.stringify({ id: 2, email: 'pavan@gmail.com', roles: ['ROLE_CUSTOMER'] })
    );

    const unauthorizedError = new Error('Forbidden');
    unauthorizedError.status = 403;
    vi.spyOn(authAPI, 'getProfile').mockRejectedValueOnce(unauthorizedError);

    render(
      <AuthProvider retryDelaysMs={[5]}>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-loading')).toHaveTextContent('ready');
    });

    expect(screen.getByTestId('auth-status')).toHaveTextContent('guest');
    expect(localStorage.getItem('vognix_token')).toBeNull();
    expect(localStorage.getItem('vognix_user')).toBeNull();
  });

  it('blocks ROLE_CUSTOMER from signing into AdminLoginPage without persisting session', async () => {
    vi.spyOn(authAPI, 'login').mockResolvedValueOnce({
      data: {
        token: 'customer-only-jwt',
        userId: 5,
        email: 'pavan@gmail.com',
        firstName: 'Pavan',
        lastName: 'Kalyan',
        roles: ['ROLE_CUSTOMER'],
      },
    });

    render(
      <MemoryRouter initialEntries={['/admin/login']}>
        <AuthProvider retryDelaysMs={[5]}>
          <Routes>
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin/dashboard" element={<div>Admin Dashboard</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('admin@vognix.com'), {
      target: { value: 'pavan@gmail.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'Secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Enter Admin Console/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Access denied/i);
    expect(localStorage.getItem('vognix_token')).toBeNull();
    expect(localStorage.getItem('vognix_user')).toBeNull();
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringMatching(/Access denied/i), 'error');
    expect(mockShowToast).not.toHaveBeenCalledWith(expect.stringMatching(/Welcome back/i), 'success');
    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
  });

  it('allows ROLE_ADMIN on AdminLoginPage, trims email, persists session, and navigates', async () => {
    const loginSpy = vi.spyOn(authAPI, 'login').mockResolvedValueOnce({
      data: {
        token: 'admin-jwt-token',
        userId: 1,
        email: 'admin@vognix.com',
        firstName: 'Vognix',
        lastName: 'Admin',
        roles: ['ROLE_ADMIN', 'ROLE_CUSTOMER'],
      },
    });

    render(
      <MemoryRouter initialEntries={['/admin/login']}>
        <AuthProvider retryDelaysMs={[5]}>
          <Routes>
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin/dashboard" element={<div>Admin Dashboard View</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('admin@vognix.com'), {
      target: { value: '  admin@vognix.com  ' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'Admin@123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Enter Admin Console/i }));

    expect(await screen.findByText('Admin Dashboard View')).toBeInTheDocument();
    expect(loginSpy).toHaveBeenCalledWith({ email: 'admin@vognix.com', password: 'Admin@123' });
    expect(localStorage.getItem('vognix_token')).toBe('admin-jwt-token');
    expect(mockShowToast).toHaveBeenCalledWith('Welcome back, Vognix!', 'success');
  });

  it('supports creating Admin accounts and resetting passwords in AdminCustomersPage', async () => {
    const directory = [
      {
        id: 1,
        firstName: 'Vognix',
        lastName: 'Admin',
        email: 'admin@vognix.com',
        phone: '+91 9000000001',
        roles: ['ROLE_ADMIN'],
        isActive: true,
        orderCount: 0,
        totalSpent: 0,
      },
      {
        id: 2,
        firstName: 'Pavan',
        lastName: 'Kalyan',
        email: 'pavan@gmail.com',
        phone: '+91 9876543210',
        roles: ['ROLE_CUSTOMER'],
        isActive: true,
        orderCount: 8,
        totalSpent: 15999,
      },
    ];

    localStorage.setItem('vognix_token', 'admin-jwt-token');
    localStorage.setItem(
      'vognix_user',
      JSON.stringify({ id: 1, email: 'admin@vognix.com', roles: ['ROLE_ADMIN'] })
    );
    vi.spyOn(authAPI, 'getProfile').mockResolvedValue({
      data: { id: 1, email: 'admin@vognix.com', roles: ['ROLE_ADMIN'] },
    });
    vi.spyOn(adminAPI, 'getCustomers').mockResolvedValue({
      data: { content: directory, totalPages: 1, totalElements: directory.length },
    });
    const createSpy = vi.spyOn(adminAPI, 'createCustomer').mockResolvedValue({ data: { id: 9 } });
    const resetSpy = vi.spyOn(adminAPI, 'resetCustomerPassword').mockResolvedValue({ data: null });

    render(
      <MemoryRouter>
        <AuthProvider retryDelaysMs={[5]}>
          <AdminCustomersPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('pavan@gmail.com')).toBeInTheDocument();

    // Create a new Admin account
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));
    });
    fireEvent.change(screen.getByPlaceholderText('Pavan'), { target: { value: 'Ops' } });
    fireEvent.change(screen.getByPlaceholderText('Kalyan'), { target: { value: 'Lead' } });
    fireEvent.change(screen.getByPlaceholderText('user@vognix.com'), {
      target: { value: 'ops.admin@vognix.com' },
    });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ADMIN' } });
    fireEvent.change(screen.getByPlaceholderText('Minimum 6 characters'), {
      target: { value: 'OpsAdmin@123' },
    });

    const submitButtons = screen.getAllByRole('button', { name: /Create Account/i });
    await act(async () => {
      fireEvent.click(submitButtons[submitButtons.length - 1]);
    });

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        firstName: 'Ops',
        lastName: 'Lead',
        email: 'ops.admin@vognix.com',
        phone: null,
        password: 'OpsAdmin@123',
        roles: ['ROLE_ADMIN'],
      });
    });

    // Reset customer password
    const resetPwdButtons = screen.getAllByTitle('Reset account password');
    await act(async () => {
      fireEvent.click(resetPwdButtons[1]);
    });

    fireEvent.change(screen.getByPlaceholderText('Minimum 6 characters'), {
      target: { value: 'NewPass@123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Repeat new password'), {
      target: { value: 'NewPass@123' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Save New Password/i }));
    });

    await waitFor(() => {
      expect(resetSpy).toHaveBeenCalledWith(2, 'NewPass@123');
    });
  });

  it('ignores stale 401 and non-admin 403 responses without clearing an active session', async () => {
    localStorage.setItem('vognix_token', 'fresh-jwt-token');
    localStorage.setItem(
      'vognix_user',
      JSON.stringify({ id: 2, email: 'pavan@gmail.com', roles: ['ROLE_CUSTOMER'] })
    );
    vi.spyOn(authAPI, 'getProfile').mockResolvedValue({
      data: { id: 2, email: 'pavan@gmail.com', roles: ['ROLE_CUSTOMER'] },
    });

    const expiredEvents = [];
    const onExpired = (e) => expiredEvents.push(e.detail);
    window.addEventListener('vognix:session-expired', onExpired);

    const originalAdapter = api.defaults.adapter;
    try {
      render(
        <AuthProvider retryDelaysMs={[5]}>
          <AuthProbe />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-loading')).toHaveTextContent('ready');
      });

      // 1) Simulate a 401 from an older/outdated token while a newer token is active
      api.defaults.adapter = async (config) => {
        config.headers.set('Authorization', 'Bearer outdated-jwt-token');
        const err = new Error('Unauthorized');
        err.config = config;
        err.response = { status: 401, data: { message: 'Unauthorized' } };
        throw err;
      };
      await expect(api.get('/cart')).rejects.toThrow('Unauthorized');

      // 2) Simulate a 403 Forbidden (authorization denial, not expired session)
      api.defaults.adapter = async (config) => {
        const err = new Error('Forbidden');
        err.config = config;
        err.response = { status: 403, data: { message: 'Admin access required' } };
        throw err;
      };
      await expect(api.get('/admin/dashboard')).rejects.toThrow('Admin access required');

      expect(expiredEvents).toHaveLength(0);
      expect(localStorage.getItem('vognix_token')).toBe('fresh-jwt-token');
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
    } finally {
      api.defaults.adapter = originalAdapter;
      window.removeEventListener('vognix:session-expired', onExpired);
    }
  });

  it('logs out and shows an error toast when a 401 matches the active session token', async () => {
    localStorage.setItem('vognix_token', 'active-jwt-token');
    localStorage.setItem(
      'vognix_user',
      JSON.stringify({ id: 2, email: 'pavan@gmail.com', roles: ['ROLE_CUSTOMER'] })
    );
    vi.spyOn(authAPI, 'getProfile').mockResolvedValue({
      data: { id: 2, email: 'pavan@gmail.com', roles: ['ROLE_CUSTOMER'] },
    });

    const originalAdapter = api.defaults.adapter;
    try {
      render(
        <AuthProvider retryDelaysMs={[5]}>
          <AuthProbe />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-loading')).toHaveTextContent('ready');
      });
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');

      api.defaults.adapter = async (config) => {
        const err = new Error('Unauthorized');
        err.config = config;
        err.response = {
          status: 401,
          data: { message: 'User session is no longer valid on server.' },
        };
        throw err;
      };

      await act(async () => {
        await expect(api.post('/cart/items', { variantId: 10, quantity: 1 })).rejects.toThrow(
          'User session is no longer valid on server.'
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('guest');
      });
      expect(localStorage.getItem('vognix_token')).toBeNull();
      expect(mockShowToast).toHaveBeenCalledWith(
        'User session is no longer valid on server.',
        'error'
      );
    } finally {
      api.defaults.adapter = originalAdapter;
    }
  });
});
