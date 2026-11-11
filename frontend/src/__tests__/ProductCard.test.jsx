import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { ProductCard } from '../components/ProductCard';
import * as WishlistContext from '../context/WishlistContext';

describe('ProductCard Component', () => {
  const mockProduct = {
    id: 101,
    title: 'Merino Wool Structured Blazer',
    brandName: 'ARMANI EXCHANGE',
    basePrice: 12999,
    discountedPrice: 9099,
    discountPercent: 30,
    rating: 4.8,
    reviewCount: 42,
    primaryImageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800',
    availableSizes: ['S', 'M', 'L', 'XL'],
  };

  it('renders product details correctly', () => {
    vi.spyOn(WishlistContext, 'useWishlist').mockReturnValue({
      isInWishlist: () => false,
      toggleWishlist: vi.fn(),
    });

    render(
      <BrowserRouter>
        <ProductCard product={mockProduct} />
      </BrowserRouter>
    );

    // Brand and Title
    expect(screen.getByText('ARMANI EXCHANGE')).toBeInTheDocument();
    expect(screen.getByText('Merino Wool Structured Blazer')).toBeInTheDocument();

    // Prices and Discount
    expect(screen.getByText('₹9,099')).toBeInTheDocument();
    expect(screen.getByText('₹12,999')).toBeInTheDocument();
    expect(screen.getAllByText(/30% OFF/i).length).toBeGreaterThanOrEqual(1);

    // Rating
    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('calls toggleWishlist when wishlist button is clicked', () => {
    const mockToggleWishlist = vi.fn();
    vi.spyOn(WishlistContext, 'useWishlist').mockReturnValue({
      isInWishlist: () => false,
      toggleWishlist: mockToggleWishlist,
    });

    render(
      <BrowserRouter>
        <ProductCard product={mockProduct} />
      </BrowserRouter>
    );

    const wishlistBtn = screen.getByTitle('Add to Wishlist');
    fireEvent.click(wishlistBtn);

    expect(mockToggleWishlist).toHaveBeenCalledWith(101);
  });
});
