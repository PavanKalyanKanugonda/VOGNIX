import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cartAPI } from '../services/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const CartContext = createContext(null);
const GUEST_CART_KEY = 'vognix_guest_cart';

const readGuestCartItems = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem(GUEST_CART_KEY);
    return [];
  }
};

const writeGuestCartItems = (items) => {
  if (typeof window === 'undefined') return;
  if (!items || items.length === 0) {
    localStorage.removeItem(GUEST_CART_KEY);
  } else {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  }
};

const buildGuestCartDTO = (items) => {
  if (!items || items.length === 0) {
    return null;
  }

  let subtotal = 0;
  let totalItemsCount = 0;

  const computedItems = items.map((item) => {
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const unitPrice = Number(item.unitPrice ?? 0);
    const totalPrice = Number((unitPrice * quantity).toFixed(2));
    subtotal += totalPrice;
    totalItemsCount += quantity;
    return {
      ...item,
      id: item.id ?? item.variantId,
      quantity,
      unitPrice,
      originalPrice: Number(item.originalPrice ?? unitPrice),
      discountPercent: Number(item.discountPercent ?? 0),
      totalPrice,
      inStock: item.inStock ?? true,
    };
  });

  subtotal = Number(subtotal.toFixed(2));
  const shippingFee = subtotal > 0 && subtotal < 999 ? 99 : 0;
  const taxAmount = Number((subtotal * 0.05).toFixed(2));
  const totalAmount = Number((subtotal + shippingFee).toFixed(2));

  return {
    cartId: null,
    items: computedItems,
    subtotal,
    couponDiscount: 0,
    shippingFee,
    taxAmount,
    totalAmount,
    appliedCoupon: null,
    totalItemsCount,
  };
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const fetchCart = useCallback(async (couponCode) => {
    if (authLoading) {
      return;
    }
    if (!isAuthenticated) {
      const guestItems = readGuestCartItems();
      setCart(buildGuestCartDTO(guestItems));
      return;
    }
    setLoading(true);
    try {
      const guestItems = readGuestCartItems();
      if (guestItems.length > 0) {
        let latestCart = null;
        const remainingItems = [];
        let sessionRejected = false;

        for (let i = 0; i < guestItems.length; i++) {
          const item = guestItems[i];
          if (sessionRejected) {
            remainingItems.push(item);
            continue;
          }
          try {
            const res = await cartAPI.addItem(
              { variantId: item.variantId, quantity: Math.max(1, Number(item.quantity) || 1) },
              couponCode
            );
            latestCart = res.data;
          } catch (err) {
            const isTransientOrServer =
              err?.isTransient || err?.isNetworkError || (typeof err?.status === 'number' && err.status >= 500);
            if (err?.status === 401 || err?.status === 403) {
              sessionRejected = true;
              remainingItems.push(item);
            } else if (isTransientOrServer) {
              remainingItems.push(item);
            }
            // Business 4xx errors (e.g. out of stock) drop the invalid guest item while merging the rest
          }
        }

        writeGuestCartItems(remainingItems);
        if (sessionRejected) {
          setCart(buildGuestCartDTO(remainingItems));
          return;
        }
        if (latestCart && remainingItems.length === 0) {
          setCart(latestCart);
          return;
        }
        if (remainingItems.length > 0 && !latestCart) {
          setCart(buildGuestCartDTO(remainingItems));
          return;
        }
      }

      const res = await cartAPI.getCart(couponCode);
      setCart(res.data);
    } catch (err) {
      // Quiet fail if initial fetch
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToGuestCart = (variantId, quantity = 1, itemDetails = null) => {
    const guestItems = readGuestCartItems();
    const qty = Math.max(1, Number(quantity) || 1);
    const existingIndex = guestItems.findIndex(
      (item) => String(item.variantId) === String(variantId)
    );
    const existing = existingIndex >= 0 ? guestItems[existingIndex] : null;
    const newQuantity = existing ? existing.quantity + qty : qty;
    const maxStock = itemDetails?.availableStock ?? existing?.availableStock;

    if (maxStock != null && newQuantity > maxStock) {
      showToast(
        existing
          ? `Cannot add more. Total in bag (${newQuantity}) exceeds available stock (${maxStock})`
          : `Only ${maxStock} units available for this variant`,
        'error'
      );
      return false;
    }

    let nextItems;
    if (existing) {
      nextItems = guestItems.map((item, idx) =>
        idx === existingIndex
          ? {
              ...item,
              ...(itemDetails || {}),
              variantId,
              id: item.id ?? variantId,
              quantity: newQuantity,
            }
          : item
      );
    } else {
      nextItems = [
        ...guestItems,
        {
          id: variantId,
          variantId,
          productId: itemDetails?.productId ?? null,
          productTitle: itemDetails?.productTitle || 'Curated VOGNIX Piece',
          productSlug: itemDetails?.productSlug || '',
          brandName: itemDetails?.brandName || 'VOGNIX',
          imageUrl: itemDetails?.imageUrl || '',
          size: itemDetails?.size || '',
          color: itemDetails?.color || '',
          unitPrice: Number(itemDetails?.unitPrice ?? 0),
          originalPrice: Number(itemDetails?.originalPrice ?? itemDetails?.unitPrice ?? 0),
          discountPercent: Number(itemDetails?.discountPercent ?? 0),
          availableStock: itemDetails?.availableStock ?? null,
          inStock: itemDetails?.inStock ?? true,
          quantity: qty,
        },
      ];
    }

    writeGuestCartItems(nextItems);
    setCart(buildGuestCartDTO(nextItems));
    return true;
  };

  const addToCart = async (variantId, quantity = 1, itemDetails = null) => {
    if (!isAuthenticated) {
      const added = addToGuestCart(variantId, quantity, itemDetails);
      if (added) {
        showToast('Added to bag successfully!', 'success');
      }
      return added;
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
      if (err?.status === 401 || err?.status === 403) {
        const saved = addToGuestCart(variantId, quantity, itemDetails);
        if (saved) {
          showToast('Added to your bag! Please sign in when ready to checkout.', 'success');
          return true;
        }
      }
      showToast(err.message, 'error');
      return false;
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    if (!isAuthenticated) {
      const guestItems = readGuestCartItems();
      const target = guestItems.find(
        (item) => String(item.id) === String(itemId) || String(item.variantId) === String(itemId)
      );
      if (!target) return;

      if (quantity <= 0) {
        const nextItems = guestItems.filter(
          (item) => String(item.id) !== String(itemId) && String(item.variantId) !== String(itemId)
        );
        writeGuestCartItems(nextItems);
        setCart(buildGuestCartDTO(nextItems));
        return;
      }

      if (target.availableStock != null && quantity > target.availableStock) {
        showToast(`Requested quantity (${quantity}) exceeds available stock (${target.availableStock})`, 'error');
        return;
      }

      const nextItems = guestItems.map((item) =>
        String(item.id) === String(itemId) || String(item.variantId) === String(itemId)
          ? { ...item, quantity }
          : item
      );
      writeGuestCartItems(nextItems);
      setCart(buildGuestCartDTO(nextItems));
      return;
    }
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
    if (!isAuthenticated) {
      const guestItems = readGuestCartItems();
      const nextItems = guestItems.filter(
        (item) => String(item.id) !== String(itemId) && String(item.variantId) !== String(itemId)
      );
      writeGuestCartItems(nextItems);
      setCart(buildGuestCartDTO(nextItems));
      showToast('Item removed from shopping bag', 'info');
      return;
    }
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
    if (!isAuthenticated) {
      showToast('Please sign in to apply promo coupons at checkout', 'info');
      return false;
    }
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
    if (!isAuthenticated) {
      return true;
    }
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
    writeGuestCartItems([]);
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
