import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckoutPage } from '../pages/CheckoutPage';
import PaymentStatusPage from '../pages/PaymentStatusPage';
import * as AuthContext from '../context/AuthContext';
import * as CartContext from '../context/CartContext';
import * as ToastContext from '../context/ToastContext';
import { addressAPI, orderAPI, paymentAPI } from '../services/api';

describe('Razorpay Checkout Integration', () => {
  const mockShowToast = vi.fn();
  const mockClearCart = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    mockShowToast.mockReset();
    mockClearCart.mockReset();
    delete window.Razorpay;

    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: 1, firstName: 'Aarav', lastName: 'Sharma', email: 'customer@vognix.com', phone: '9876543210' },
      isAuthenticated: true,
    });
    vi.spyOn(ToastContext, 'useToast').mockReturnValue({ showToast: mockShowToast });
    vi.spyOn(CartContext, 'useCart').mockReturnValue({
      cart: {
        id: 1,
        totalItemsCount: 1,
        subtotal: 2499,
        couponDiscount: 0,
        shippingFee: 0,
        taxAmount: 125,
        totalAmount: 2624,
        appliedCoupon: null,
        items: [{ id: 10, productTitle: 'Silk Tailored Shirt', quantity: 1, totalPrice: 2499 }],
      },
      clearCart: mockClearCart,
    });
  });

  it('launches Razorpay Checkout after selecting payment method and verifies payment on success', async () => {
    vi.spyOn(addressAPI, 'getAddresses').mockResolvedValue({
      data: [
        {
          id: 5,
          fullName: 'Aarav Sharma',
          phone: '9876543210',
          streetAddress: '42 Atelier Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          addressType: 'HOME',
          isDefault: true,
        },
      ],
    });
    vi.spyOn(paymentAPI, 'getConfig').mockResolvedValue({
      data: { gatewayMode: 'RAZORPAY', razorpayConfigured: true, currency: 'INR' },
    });
    vi.spyOn(orderAPI, 'validateCheckout').mockResolvedValue({ data: { valid: true } });
    const createOrderSpy = vi.spyOn(paymentAPI, 'createOrder').mockResolvedValue({
      data: {
        paymentId: 88,
        orderId: 99,
        orderNumber: 'VOG-TEST-0099',
        razorpayOrderId: 'order_TestRz99',
        keyId: 'rzp_test_TysqyoYhSUIrKU',
        gatewayMode: 'RAZORPAY',
        paymentMethod: 'CARD',
        paymentStatus: 'PENDING',
        amount: 2624,
        currency: 'INR',
      },
    });
    const verifySpy = vi.spyOn(paymentAPI, 'verify').mockResolvedValue({
      data: {
        paymentId: 88,
        orderId: 99,
        paymentStatus: 'PAID',
        paymentMethod: 'CARD',
      },
    });

    let capturedOptions = null;
    const openSpy = vi.fn();
    window.Razorpay = vi.fn().mockImplementation((options) => {
      capturedOptions = options;
      return { open: openSpy, on: vi.fn() };
    });

    render(
      <MemoryRouter initialEntries={['/checkout']}>
        <Routes>
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-confirmation/:id" element={<div>Order Confirmed Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Razorpay Active')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Credit \/ Debit Card/i }));
    fireEvent.click(screen.getByRole('button', { name: /PAY NOW/i }));

    await waitFor(() => {
      expect(createOrderSpy).toHaveBeenCalledWith(
        expect.objectContaining({ addressId: 5, paymentMethod: 'CARD' }),
        expect.any(String)
      );
      expect(openSpy).toHaveBeenCalled();
    });

    expect(capturedOptions).toMatchObject({
      key: 'rzp_test_TysqyoYhSUIrKU',
      order_id: 'order_TestRz99',
      amount: 262400,
      currency: 'INR',
      prefill: expect.objectContaining({
        name: 'Aarav Sharma',
        email: 'customer@vognix.com',
        contact: '9876543210',
        method: 'card',
      }),
    });

    await act(async () => {
      await capturedOptions.handler({
        razorpay_order_id: 'order_TestRz99',
        razorpay_payment_id: 'pay_TestRz99',
        razorpay_signature: 'sig_TestRz99',
      });
    });

    await waitFor(() => {
      expect(verifySpy).toHaveBeenCalledWith({
        razorpayOrderId: 'order_TestRz99',
        razorpayPaymentId: 'pay_TestRz99',
        razorpaySignature: 'sig_TestRz99',
      });
      expect(mockClearCart).toHaveBeenCalled();
      expect(screen.getByText('Order Confirmed Page')).toBeInTheDocument();
    });
  });

  it('shows Complete Payment Now button for pending Razorpay payments and opens Razorpay on retry', async () => {
    vi.spyOn(paymentAPI, 'getStatus').mockResolvedValue({
      data: {
        paymentId: 88,
        orderId: 99,
        orderNumber: 'VOG-TEST-0099',
        razorpayOrderId: 'order_TestRz99',
        gatewayMode: 'RAZORPAY',
        paymentMethod: 'UPI',
        paymentStatus: 'PENDING',
        amount: 2624,
        currency: 'INR',
      },
    });
    const retrySpy = vi.spyOn(paymentAPI, 'retry').mockResolvedValue({
      data: {
        paymentId: 88,
        orderId: 99,
        orderNumber: 'VOG-TEST-0099',
        razorpayOrderId: 'order_TestRz99',
        keyId: 'rzp_test_TysqyoYhSUIrKU',
        gatewayMode: 'RAZORPAY',
        paymentMethod: 'UPI',
        paymentStatus: 'PENDING',
        amount: 2624,
        currency: 'INR',
      },
    });

    const openSpy = vi.fn();
    window.Razorpay = vi.fn().mockImplementation(() => ({ open: openSpy, on: vi.fn() }));

    render(
      <MemoryRouter initialEntries={['/payments/88/status']}>
        <Routes>
          <Route path="/payments/:paymentId/status" element={<PaymentStatusPage />} />
        </Routes>
      </MemoryRouter>
    );

    const completeBtn = await screen.findByRole('button', { name: /Complete Payment Now/i });
    fireEvent.click(completeBtn);

    await waitFor(() => {
      expect(retrySpy).toHaveBeenCalledWith('88');
      expect(openSpy).toHaveBeenCalled();
    });
  });
});
