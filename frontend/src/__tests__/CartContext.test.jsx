import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CartProvider, useCart } from '../context/CartContext';
import * as AuthContext from '../context/AuthContext';
import * as ToastContext from '../context/ToastContext';
import { cartAPI } from '../services/api';

// Test consumer component
const TestConsumer = () => {
  const { cart, cartCount, addToCart, removeFromCart, applyCoupon, removeCoupon } = useCart();
  return (
    <div>
      <span data-testid="cart-count">{cartCount}</span>
      <span data-testid="total-amount">{cart?.totalAmount || 0}</span>
      <span data-testid="applied-coupon">{cart?.appliedCoupon || 'NONE'}</span>
      <button onClick={() => addToCart(10, 2)}>Add Variant 10</button>
      <button onClick={() => removeFromCart(5)}>Remove Item 5</button>
      <button onClick={() => applyCoupon('VOGNIX10')}>Apply VOGNIX10</button>
      <button onClick={() => removeCoupon()}>Remove Coupon</button>
    </div>
  );
};

describe('CartContext Unit Tests', () => {
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(ToastContext, 'useToast').mockReturnValue({ showToast: mockShowToast });
  });

  it('renders default zero count when unauthenticated', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      isAuthenticated: false,
      user: null,
    });

    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>
    );

    expect(screen.getByTestId('cart-count')).toHaveTextContent('0');
  });

  it('adds items and updates state when authenticated', async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, email: 'customer@vognix.com' },
    });

    const mockCartResponse = {
      data: {
        id: 1,
        totalItemsCount: 2,
        totalAmount: 4999,
        items: [{ id: 5, variantId: 10, quantity: 2, unitPrice: 2499.5 }],
      },
    };

    vi.spyOn(cartAPI, 'addItem').mockResolvedValue(mockCartResponse);

    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>
    );

    const addBtn = screen.getByText('Add Variant 10');
    await act(async () => {
      addBtn.click();
    });

    expect(cartAPI.addItem).toHaveBeenCalledWith({ variantId: 10, quantity: 2 });
    expect(screen.getByTestId('cart-count')).toHaveTextContent('2');
    expect(screen.getByTestId('total-amount')).toHaveTextContent('4999');
    expect(mockShowToast).toHaveBeenCalledWith('Added to bag successfully!', 'success');
  });

  it('removes item from shopping bag', async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, email: 'customer@vognix.com' },
    });

    const emptyCartResponse = {
      data: {
        id: 1,
        totalItemsCount: 0,
        totalAmount: 0,
        items: [],
      },
    };

    vi.spyOn(cartAPI, 'removeItem').mockResolvedValue(emptyCartResponse);

    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>
    );

    const removeBtn = screen.getByText('Remove Item 5');
    await act(async () => {
      removeBtn.click();
    });

    expect(cartAPI.removeItem).toHaveBeenCalledWith(5);
    expect(screen.getByTestId('cart-count')).toHaveTextContent('0');
    expect(mockShowToast).toHaveBeenCalledWith('Item removed from shopping bag', 'info');
  });

  it('preserves active coupon across mutations and clears on removeCoupon', async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, email: 'customer@vognix.com' },
    });

    vi.spyOn(cartAPI, 'getCart').mockResolvedValue({
      data: {
        id: 1,
        totalItemsCount: 1,
        totalAmount: 2999,
        appliedCoupon: null,
        items: [{ id: 5, variantId: 10, quantity: 1, unitPrice: 2999 }],
      },
    });

    vi.spyOn(cartAPI, 'applyCoupon').mockResolvedValue({
      data: {
        id: 1,
        totalItemsCount: 1,
        totalAmount: 2699,
        appliedCoupon: 'VOGNIX10',
        items: [{ id: 5, variantId: 10, quantity: 1, unitPrice: 2999 }],
      },
    });

    vi.spyOn(cartAPI, 'addItem').mockResolvedValue({
      data: {
        id: 1,
        totalItemsCount: 3,
        totalAmount: 8097,
        appliedCoupon: 'VOGNIX10',
        items: [{ id: 5, variantId: 10, quantity: 3, unitPrice: 2999 }],
      },
    });

    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>
    );

    await act(async () => {
      screen.getByText('Apply VOGNIX10').click();
    });

    expect(cartAPI.applyCoupon).toHaveBeenCalledWith('VOGNIX10');
    expect(screen.getByTestId('applied-coupon')).toHaveTextContent('VOGNIX10');

    await act(async () => {
      screen.getByText('Add Variant 10').click();
    });

    expect(cartAPI.addItem).toHaveBeenCalledWith({ variantId: 10, quantity: 2 }, 'VOGNIX10');

    await act(async () => {
      screen.getByText('Remove Coupon').click();
    });

    expect(cartAPI.getCart).toHaveBeenCalledWith();
    expect(screen.getByTestId('applied-coupon')).toHaveTextContent('NONE');
  });
});
