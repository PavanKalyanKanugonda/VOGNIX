import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CartProvider, useCart } from '../context/CartContext';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import * as AuthContext from '../context/AuthContext';
import * as ToastContext from '../context/ToastContext';
import * as WishlistContext from '../context/WishlistContext';
import { cartAPI, productAPI } from '../services/api';

// Test consumer component
const TestConsumer = () => {
  const { cart, cartCount, addToCart, updateQuantity, removeFromCart, applyCoupon, removeCoupon } = useCart();
  return (
    <div>
      <span data-testid="cart-count">{cartCount}</span>
      <span data-testid="total-amount">{cart?.totalAmount || 0}</span>
      <span data-testid="applied-coupon">{cart?.appliedCoupon || 'NONE'}</span>
      <button
        onClick={() =>
          addToCart(10, 2, {
            productId: 1,
            productTitle: 'Silk Blazer',
            brandName: 'VOGNIX Atelier',
            size: 'M',
            color: 'Obsidian',
            unitPrice: 1200,
            originalPrice: 1500,
            discountPercent: 20,
            availableStock: 5,
            inStock: true,
          })
        }
      >
        Add Variant 10
      </button>
      <button onClick={() => updateQuantity(10, 1)}>Set Variant 10 Qty 1</button>
      <button onClick={() => removeFromCart(5)}>Remove Item 5</button>
      <button onClick={() => removeFromCart(10)}>Remove Item 10</button>
      <button onClick={() => applyCoupon('VOGNIX10')}>Apply VOGNIX10</button>
      <button onClick={() => removeCoupon()}>Remove Coupon</button>
    </div>
  );
};

describe('CartContext Unit Tests', () => {
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    mockShowToast.mockClear();
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

  it('adds, updates, and removes items in guest shopping bag without requiring login', async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      isAuthenticated: false,
      loading: false,
      user: null,
    });

    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>
    );

    expect(screen.getByTestId('cart-count')).toHaveTextContent('0');

    await act(async () => {
      screen.getByText('Add Variant 10').click();
    });

    expect(screen.getByTestId('cart-count')).toHaveTextContent('2');
    expect(screen.getByTestId('total-amount')).toHaveTextContent('2400');
    expect(mockShowToast).toHaveBeenCalledWith('Added to bag successfully!', 'success');
    expect(JSON.parse(localStorage.getItem('vognix_guest_cart'))).toHaveLength(1);

    await act(async () => {
      screen.getByText('Set Variant 10 Qty 1').click();
    });

    expect(screen.getByTestId('cart-count')).toHaveTextContent('1');
    expect(screen.getByTestId('total-amount')).toHaveTextContent('1200');

    await act(async () => {
      screen.getByText('Remove Item 10').click();
    });

    expect(screen.getByTestId('cart-count')).toHaveTextContent('0');
    expect(localStorage.getItem('vognix_guest_cart')).toBeNull();
    expect(mockShowToast).toHaveBeenCalledWith('Item removed from shopping bag', 'info');
  });

  it('merges guest shopping bag items into backend cart automatically upon authentication', async () => {
    localStorage.setItem(
      'vognix_guest_cart',
      JSON.stringify([
        {
          id: 10,
          variantId: 10,
          productTitle: 'Silk Blazer',
          unitPrice: 2499,
          quantity: 1,
        },
      ])
    );

    const authSpy = vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      isAuthenticated: false,
      loading: false,
      user: null,
    });

    const addItemSpy = vi.spyOn(cartAPI, 'addItem').mockResolvedValue({
      data: {
        id: 1,
        totalItemsCount: 1,
        totalAmount: 2499,
        items: [{ id: 99, variantId: 10, quantity: 1, unitPrice: 2499 }],
      },
    });

    const { rerender } = render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>
    );

    expect(screen.getByTestId('cart-count')).toHaveTextContent('1');

    authSpy.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { id: 1, email: 'customer@vognix.com' },
    });

    rerender(
      <CartProvider>
        <TestConsumer />
      </CartProvider>
    );

    await waitFor(() => {
      expect(addItemSpy).toHaveBeenCalledWith({ variantId: 10, quantity: 1 }, undefined);
    });
    expect(localStorage.getItem('vognix_guest_cart')).toBeNull();
    expect(screen.getByTestId('cart-count')).toHaveTextContent('1');
  });

  it('saves item to guest bag on ProductDetailPage without redirecting to login page', async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      isAuthenticated: false,
      loading: false,
      user: null,
    });
    vi.spyOn(WishlistContext, 'useWishlist').mockReturnValue({
      isInWishlist: () => false,
      toggleWishlist: vi.fn(),
    });
    vi.spyOn(productAPI, 'getProductById').mockResolvedValue({
      data: {
        id: 7,
        title: 'Tailored Wool Overcoat',
        slug: 'tailored-wool-overcoat',
        description: 'Structured wool coat',
        brandName: 'VOGNIX',
        categoryName: 'Outerwear',
        categorySlug: 'outerwear',
        basePrice: 5999,
        discountedPrice: 4999,
        discountPercent: 17,
        rating: 4.8,
        reviewCount: 12,
        images: [{ id: 1, imageUrl: 'https://example.com/coat.jpg' }],
        variants: [
          {
            id: 77,
            size: 'M',
            color: 'Charcoal',
            colorCode: '#333333',
            stockQuantity: 8,
            inStock: true,
          },
        ],
        recentReviews: [],
      },
    });

    render(
      <MemoryRouter initialEntries={['/products/7']}>
        <CartProvider>
          <Routes>
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/login" element={<div>Login Page Redirected</div>} />
          </Routes>
        </CartProvider>
      </MemoryRouter>
    );

    const addBtn = await screen.findByRole('button', { name: /ADD TO BAG/i });
    await act(async () => {
      addBtn.click();
    });

    expect(screen.queryByText('Login Page Redirected')).not.toBeInTheDocument();
    expect(mockShowToast).toHaveBeenCalledWith('Added to bag successfully!', 'success');
    const saved = JSON.parse(localStorage.getItem('vognix_guest_cart'));
    expect(saved).toHaveLength(1);
    expect(saved[0].variantId).toBe(77);
    expect(saved[0].productTitle).toBe('Tailored Wool Overcoat');
  });

  it('preserves guest bag items when merge hits a transient 503 error upon authentication', async () => {
    localStorage.setItem(
      'vognix_guest_cart',
      JSON.stringify([
        {
          id: 10,
          variantId: 10,
          productTitle: 'Silk Blazer',
          unitPrice: 2499,
          quantity: 2,
        },
      ])
    );

    const authSpy = vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      isAuthenticated: false,
      loading: false,
      user: null,
    });

    const transientError = new Error('Backend Unavailable');
    transientError.status = 503;
    transientError.isTransient = true;
    const addItemSpy = vi.spyOn(cartAPI, 'addItem').mockRejectedValue(transientError);

    const { rerender } = render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>
    );

    expect(screen.getByTestId('cart-count')).toHaveTextContent('2');

    authSpy.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      user: { id: 1, email: 'customer@vognix.com' },
    });

    rerender(
      <CartProvider>
        <TestConsumer />
      </CartProvider>
    );

    await waitFor(() => {
      expect(addItemSpy).toHaveBeenCalledWith({ variantId: 10, quantity: 2 }, undefined);
    });

    const preserved = JSON.parse(localStorage.getItem('vognix_guest_cart'));
    expect(preserved).toHaveLength(1);
    expect(preserved[0].variantId).toBe(10);
    expect(screen.getByTestId('cart-count')).toHaveTextContent('2');
  });
});
