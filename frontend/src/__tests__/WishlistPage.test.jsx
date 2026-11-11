import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WishlistPage } from '../pages/WishlistPage';
import * as WishlistContext from '../context/WishlistContext';

describe('WishlistPage Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('allows selecting a specific variant and moving it directly to bag', async () => {
    const moveToCart = vi.fn().mockResolvedValue(true);
    const removeFromWishlist = vi.fn();

    vi.spyOn(WishlistContext, 'useWishlist').mockReturnValue({
      loading: false,
      removeFromWishlist,
      moveToCart,
      wishlist: {
        totalCount: 1,
        items: [
          {
            id: 1,
            productId: 205,
            productTitle: 'Cashmere Tailored Coat',
            brandName: 'VOGNIX ATELIER',
            basePrice: 8999,
            discountedPrice: 6999,
            discountPercent: 22,
            inStock: true,
            variants: [
              { id: 301, size: 'S', color: 'Camel', inStock: true },
              { id: 302, size: 'M', color: 'Espresso', inStock: true },
            ],
          },
        ],
      },
    });

    render(
      <BrowserRouter>
        <WishlistPage />
      </BrowserRouter>
    );

    const variantSelect = screen.getByLabelText(/Select size for Cashmere Tailored Coat/i);
    expect(variantSelect).toBeInTheDocument();

    fireEvent.change(variantSelect, { target: { value: '302' } });
    fireEvent.click(screen.getByRole('button', { name: /Move to Bag/i }));

    await waitFor(() => {
      expect(moveToCart).toHaveBeenCalledWith(205, 302);
    });
  });
});
