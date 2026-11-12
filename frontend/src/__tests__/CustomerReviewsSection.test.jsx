import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CustomerReviewsSection, computeRatingBreakdown } from '../components/CustomerReviewsSection';

describe('CustomerReviewsSection Component', () => {
  const seededProductNoWrittenReviews = {
    id: 5,
    title: 'Fine Gauge Merino Wool Crewneck',
    brandName: 'VOGNIX Luxe',
    categoryName: 'Men Fashion',
    categorySlug: 'men-fashion',
    rating: 4.9,
    reviewCount: 62,
    images: [{ id: 1, imageUrl: 'https://example.com/crewneck.jpg' }],
    recentReviews: [],
  };

  it('computes mathematically consistent non-zero star breakdown from aggregate rating & count', () => {
    const breakdown = computeRatingBreakdown(4.9, 62, []);
    const totalAssigned = breakdown.distribution.reduce((acc, row) => acc + row.count, 0);
    const weightedSum = breakdown.distribution.reduce((acc, row) => acc + row.stars * row.count, 0);

    expect(breakdown.totalRatings).toBe(62);
    expect(totalAssigned).toBe(62);
    expect((weightedSum / totalAssigned).toFixed(1)).toBe('4.9');
    expect(breakdown.distribution[0].pct).toBeGreaterThan(80);
    expect(breakdown.recommendPercent).toBeGreaterThanOrEqual(95);
  });

  it('renders attractive overview, non-zero breakdown, atelier pulse, and clickable review prompts when no written reviews exist', () => {
    const onOpenReviewModal = vi.fn();

    render(
      <CustomerReviewsSection
        product={seededProductNoWrittenReviews}
        onOpenReviewModal={onOpenReviewModal}
      />
    );

    expect(screen.getByText('4.9')).toBeInTheDocument();
    expect(screen.getByText(/62 Verified Ratings/i)).toBeInTheDocument();
    expect(screen.getByText('Atelier Favorite')).toBeInTheDocument();
    expect(screen.getByText('ATELIER QUALITY PULSE')).toBeInTheDocument();
    expect(screen.getByText('Tailoring & Fit Consensus')).toBeInTheDocument();
    expect(screen.getByText('Be the first to write a detailed review')).toBeInTheDocument();

    // Clicking a quick review prompt chip opens the modal with that topic
    fireEvent.click(screen.getByRole('button', { name: /True-to-size fit/i }));
    expect(onOpenReviewModal).toHaveBeenCalledWith('True-to-size fit');

    fireEvent.click(screen.getByRole('button', { name: /Write First Review/i }));
    expect(onOpenReviewModal).toHaveBeenCalledWith('');
  });

  it('filters written reviews by star rating, sorts, and toggles helpful votes', () => {
    const productWithReviews = {
      ...seededProductNoWrittenReviews,
      rating: 4.5,
      reviewCount: 2,
      categorySlug: 'footwear',
      recentReviews: [
        {
          id: 101,
          userName: 'Aarav S.',
          rating: 5,
          title: 'Immaculate craftsmanship',
          comment: 'Ultra-soft texture and tailored drape.',
          isVerifiedBuyer: true,
          createdAt: '2026-11-01T10:00:00',
        },
        {
          id: 102,
          userName: 'Meera K.',
          rating: 4,
          title: 'Great everyday staple',
          comment: 'Comfortable all day long.',
          isVerifiedBuyer: true,
          createdAt: '2026-11-02T10:00:00',
        },
      ],
    };

    render(
      <CustomerReviewsSection
        product={productWithReviews}
        onOpenReviewModal={vi.fn()}
      />
    );

    expect(screen.getByText('Sizing Consensus')).toBeInTheDocument();
    expect(screen.getByText('Immaculate craftsmanship')).toBeInTheDocument();
    expect(screen.getByText('Great everyday staple')).toBeInTheDocument();

    // Filter to 5-star reviews only
    const fiveStarChip = screen.getByRole('button', { name: /^5\s*\(1\)$/i });
    fireEvent.click(fiveStarChip);

    expect(screen.getByText('Immaculate craftsmanship')).toBeInTheDocument();
    expect(screen.queryByText('Great everyday staple')).not.toBeInTheDocument();

    // Reset filter to All
    fireEvent.click(screen.getByRole('button', { name: /All \(2\)/i }));
    expect(screen.getByText('Great everyday staple')).toBeInTheDocument();

    // Toggle helpful vote on first card
    const helpfulButtons = screen.getAllByRole('button', { name: /Helpful/i });
    fireEvent.click(helpfulButtons[0]);
    expect(screen.getByRole('button', { name: /Marked Helpful \(1\)/i })).toBeInTheDocument();
  });

  it('handles zero-rating new products cleanly', () => {
    render(
      <CustomerReviewsSection
        product={{
          id: 99,
          title: 'New Capsule Coat',
          brandName: 'VOGNIX Luxe',
          rating: 0,
          reviewCount: 0,
          recentReviews: [],
        }}
        onOpenReviewModal={vi.fn()}
      />
    );

    expect(screen.getByText('0.0')).toBeInTheDocument();
    expect(screen.getByText('New Atelier Drop')).toBeInTheDocument();
    expect(screen.getByText(/0 Verified Ratings/i)).toBeInTheDocument();
  });
});
