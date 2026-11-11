import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import AdminOrdersPage from '../pages/admin/AdminOrdersPage';
import * as ToastContext from '../context/ToastContext';
import { adminAPI } from '../services/api';

describe('Admin Ordered Products Visibility', () => {
  const mockShowToast = vi.fn();

  const sampleOrder = {
    id: 42,
    orderNumber: 'VOG-D2213BD7-6AF',
    userId: 3,
    customerName: 'Pavankalyan Kanugonda',
    customerEmail: 'pavan@gmail.com',
    shippingAddressSnapshot: 'Pavankalyan Kanugonda, 1-57a Street, Bengaluru, Karnataka - 560001 (Phone: 9876543210)',
    subtotal: 1818.6,
    discountAmount: 0,
    shippingFee: 0,
    taxAmount: 90.93,
    totalAmount: 1818.6,
    status: 'PAID',
    couponCode: null,
    cancellationReason: null,
    paymentMethod: 'NETBANKING',
    paymentStatus: 'PAID',
    paymentId: 4,
    transactionId: 'pay_TytMDOiKTYuCnt',
    cancellable: true,
    createdAt: '2026-11-11T19:24:21.395642',
    items: [
      {
        id: 4,
        productId: 18,
        variantId: 48,
        sku: 'VOG-KID-TEE-4Y',
        productTitle: 'Kids Organic Cotton Graphic Tee Combo',
        brandName: 'StreetVibe',
        productImage: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800',
        size: '4-5Y',
        color: 'Multi-Pack',
        unitPrice: 909.3,
        quantity: 2,
        totalPrice: 1818.6,
      },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    mockShowToast.mockReset();
    vi.spyOn(ToastContext, 'useToast').mockReturnValue({ showToast: mockShowToast });
  });

  it('displays ordered products, variant details, SKU, and quantity on Admin Dashboard', async () => {
    vi.spyOn(adminAPI, 'getDashboardStats').mockResolvedValue({
      data: {
        totalRevenue: 1818.6,
        totalOrders: 1,
        totalCustomers: 4,
        totalProducts: 32,
        pendingOrders: 1,
        deliveredOrders: 0,
        lowStockCount: 0,
        lowStockItems: [],
        recentOrders: [sampleOrder],
      },
    });

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <Routes>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Kids Organic Cotton Graphic Tee Combo')).toBeInTheDocument();
    expect(screen.getByText(/StreetVibe/i)).toBeInTheDocument();
    expect(screen.getByText('4-5Y')).toBeInTheDocument();
    expect(screen.getByText('Multi-Pack')).toBeInTheDocument();
    expect(screen.getByText('Qty: 2')).toBeInTheDocument();
    expect(screen.getByText('VOG-KID-TEE-4Y')).toBeInTheDocument();
  });

  it('shows ordered products directly in the main Admin Orders table without expanding and supports search', async () => {
    const getOrdersSpy = vi.spyOn(adminAPI, 'getAllOrders').mockResolvedValue({
      data: {
        content: [sampleOrder],
        totalPages: 1,
      },
    });

    render(
      <MemoryRouter initialEntries={['/admin/orders']}>
        <Routes>
          <Route path="/admin/orders" element={<AdminOrdersPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Product details are immediately visible in the main row without clicking expand
    expect(await screen.findByText('Kids Organic Cotton Graphic Tee Combo')).toBeInTheDocument();
    expect(screen.getByText('4-5Y')).toBeInTheDocument();
    expect(screen.getByText('Multi-Pack')).toBeInTheDocument();
    expect(screen.getByText('Qty: 2')).toBeInTheDocument();
    expect(screen.getByText(/SKU: VOG-KID-TEE-4Y/i)).toBeInTheDocument();

    // Expanding shows full Purchased Items + Transaction details
    fireEvent.click(screen.getByRole('button', { name: /Show order details/i }));
    expect(await screen.findByText(/Purchased Items \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText('pay_TytMDOiKTYuCnt')).toBeInTheDocument();

    // Search filters by product/order/customer via API
    const searchInput = screen.getByPlaceholderText(/Search order #, customer, or product/i);
    fireEvent.change(searchInput, { target: { value: 'Graphic Tee' } });
    fireEvent.submit(searchInput.closest('form'));

    await waitFor(() => {
      expect(getOrdersSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'Graphic Tee',
          page: 0,
          size: 10,
        })
      );
    });
  });

  it('auto-expands order details when navigated with ?expand=<orderId>', async () => {
    vi.spyOn(adminAPI, 'getAllOrders').mockResolvedValue({
      data: {
        content: [sampleOrder],
        totalPages: 1,
      },
    });

    render(
      <MemoryRouter initialEntries={['/admin/orders?expand=42']}>
        <Routes>
          <Route path="/admin/orders" element={<AdminOrdersPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Purchased Items \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText('pay_TytMDOiKTYuCnt')).toBeInTheDocument();
  });
});
