import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { wishlistAPI } from '../services/api';
import { useAuth } from './AuthContext';
import { useCart } from './CartContext';
import { useToast } from './ToastContext';

const WishlistContext = createContext(null);

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState(null);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { fetchCart } = useCart();
  const { showToast } = useToast();

  const fetchWishlist = useCallback(async () => {
    if (authLoading) {
      return;
    }
    if (!isAuthenticated) {
      setWishlist(null);
      return;
    }
    setLoading(true);
    try {
      const res = await wishlistAPI.getWishlist();
      setWishlist(res.data);
    } catch (err) {
      // Quiet fail if initial fetch
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const isInWishlist = (productId) => {
    if (!wishlist || !wishlist.items) return false;
    return wishlist.items.some((item) => item.productId === productId);
  };

  const toggleWishlist = async (productId) => {
    if (!isAuthenticated) {
      showToast('Please log in to save items to your wishlist', 'info');
      return false;
    }
    try {
      const isAlready = isInWishlist(productId);
      const res = await wishlistAPI.toggleWishlist(productId);
      setWishlist(res.data);
      if (isAlready) {
        showToast('Removed from wishlist', 'info');
      } else {
        showToast('Saved to wishlist!', 'success');
      }
      return true;
    } catch (err) {
      showToast(err.message, 'error');
      return false;
    }
  };

  const removeFromWishlist = async (productId) => {
    try {
      const res = await wishlistAPI.removeItem(productId);
      setWishlist(res.data);
      showToast('Removed from wishlist', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const moveToCart = async (productId, variantId) => {
    try {
      await wishlistAPI.moveToCart(productId, variantId);
      await fetchWishlist();
      await fetchCart();
      showToast('Moved item from wishlist to shopping bag!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const wishlistCount = wishlist?.totalCount || 0;

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        wishlistCount,
        loading,
        isInWishlist,
        toggleWishlist,
        removeFromWishlist,
        moveToCart,
        fetchWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
