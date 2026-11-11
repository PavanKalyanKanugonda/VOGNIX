import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cartAPI } from '../services/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const fetchCart = useCallback(async (couponCode) => {
    if (!isAuthenticated) {
      setCart(null);
      return;
    }
    setLoading(true);
    try {
      const res = await cartAPI.getCart(couponCode);
      setCart(res.data);
    } catch (err) {
      // Quiet fail if initial fetch
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (variantId, quantity = 1) => {
    if (!isAuthenticated) {
      showToast('Please log in to add items to your shopping bag', 'info');
      return false;
    }
    try {
      const activeCoupon = cart?.appliedCoupon;
      const res = activeCoupon
        ? await cartAPI.addItem({ variantId, quantity }, activeCoupon)
        : await cartAPI.addItem({ variantId, quantity });
      setCart(res.data);
      showToast('Added to bag successfully!', 'success');
      return true;
    } catch (err) {
      showToast(err.message, 'error');
      return false;
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    try {
      const activeCoupon = cart?.appliedCoupon;
      const res = activeCoupon
        ? await cartAPI.updateQuantity(itemId, quantity, activeCoupon)
        : await cartAPI.updateQuantity(itemId, quantity);
      setCart(res.data);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      const activeCoupon = cart?.appliedCoupon;
      const res = activeCoupon
        ? await cartAPI.removeItem(itemId, activeCoupon)
        : await cartAPI.removeItem(itemId);
      setCart(res.data);
      showToast('Item removed from shopping bag', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const applyCoupon = async (code) => {
    try {
      const res = await cartAPI.applyCoupon(code);
      setCart(res.data);
      showToast(`Coupon '${code}' applied successfully!`, 'success');
      return true;
    } catch (err) {
      showToast(err.message, 'error');
      return false;
    }
  };

  const removeCoupon = async () => {
    try {
      const res = await cartAPI.getCart();
      setCart(res.data);
      showToast('Coupon removed from bag', 'info');
      return true;
    } catch (err) {
      showToast(err.message, 'error');
      return false;
    }
  };

  const clearCart = () => {
    setCart(null);
  };

  const cartCount = cart?.totalItemsCount || 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        loading,
        fetchCart,
        addToCart,
        updateQuantity,
        removeFromCart,
        applyCoupon,
        removeCoupon,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
