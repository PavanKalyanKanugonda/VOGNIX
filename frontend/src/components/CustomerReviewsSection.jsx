import React, { useState, useMemo } from 'react';
import {
  Star,
  ShieldCheck,
  MessageSquarePlus,
  Sparkles,
  ThumbsUp,
  Award,
  SlidersHorizontal,
  PenLine,
  ArrowUpRight,
} from 'lucide-react';
import { FALLBACK_IMAGE, handleImageError } from '../utils/imageFallback';

/**
 * Computes a mathematically consistent 5-star breakdown combining actual written reviews
 * with any baseline aggregate ratings stored on the product (when reviewCount > writtenReviews.length).
 */
export function computeRatingBreakdown(rawRating, rawTotalCount, writtenReviews = []) {
  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let writtenSum = 0;

  writtenReviews.forEach((rev) => {
    const clamped = Math.min(5, Math.max(1, Math.round(Number(rev?.rating) || 5)));
    counts[clamped] += 1;
    writtenSum += clamped;
  });

  const writtenCount = writtenReviews.length;
  const parsedCount = Math.max(0, Math.round(Number(rawTotalCount) || 0));
  const totalRatings = Math.max(parsedCount, writtenCount);

  if (totalRatings === 0) {
    return {
      totalRatings: 0,
      writtenCount: 0,
      averageRating: 0,
      recommendPercent: 0,
      distribution: [5, 4, 3, 2, 1].map((stars) => ({
        stars,
        count: 0,
        writtenCount: 0,
        pct: 0,
      })),
    };
  }

  const parsedRating = Math.min(5, Math.max(1, Number(rawRating) || (writtenCount > 0 ? writtenSum / writtenCount : 5)));
  const remaining = totalRatings - writtenCount;

  if (remaining > 0) {
    const extraCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const targetTotalSum = Math.round(parsedRating * totalRatings);
    const remainingTargetSum = Math.min(remaining * 5, Math.max(remaining, targetTotalSum - writtenSum));
    const remainingAvg = remainingTargetSum / remaining;

    if (remainingAvg >= 4.999) {
      extraCounts[5] = remaining;
    } else if (remainingAvg <= 1.001) {
      extraCounts[1] = remaining;
    } else {
      const sigma = 0.72;
      const weights = {};
      let weightSum = 0;
      for (let s = 1; s <= 5; s += 1) {
        const w = Math.exp(-Math.pow(s - remainingAvg, 2) / (2 * sigma * sigma));
        weights[s] = w;
        weightSum += w;
      }

      let assigned = 0;
      for (let s = 1; s <= 5; s += 1) {
        extraCounts[s] = Math.floor((weights[s] / weightSum) * remaining);
        assigned += extraCounts[s];
      }

      // Assign any remainder to stars closest to remainingAvg
      const orderByCloseness = [5, 4, 3, 2, 1].sort(
        (a, b) => Math.abs(a - remainingAvg) - Math.abs(b - remainingAvg)
      );
      let idx = 0;
      while (assigned < remaining) {
        const targetStar = orderByCloseness[idx % orderByCloseness.length];
        extraCounts[targetStar] += 1;
        assigned += 1;
        idx += 1;
      }

      let currentSum = [1, 2, 3, 4, 5].reduce((acc, s) => acc + s * extraCounts[s], 0);
      let diff = remainingTargetSum - currentSum;
      let guard = remaining * 5 + 10;

      while (diff > 0 && guard > 0) {
        guard -= 1;
        // Prefer upgrading 4->5, then 3->4, 2->3, 1->2
        let moved = false;
        for (let s = 4; s >= 1; s -= 1) {
          if (extraCounts[s] > 0) {
            extraCounts[s] -= 1;
            extraCounts[s + 1] += 1;
            diff -= 1;
            moved = true;
            break;
          }
        }
        if (!moved) break;
      }

      while (diff < 0 && guard > 0) {
        guard -= 1;
        let moved = false;
        for (let s = 5; s >= 2; s -= 1) {
          if (extraCounts[s] > 0) {
            extraCounts[s] -= 1;
            extraCounts[s - 1] += 1;
            diff += 1;
            moved = true;
            break;
          }
        }
        if (!moved) break;
      }
    }

    for (let s = 1; s <= 5; s += 1) {
      counts[s] += extraCounts[s];
    }
  }

  const positiveCount = counts[5] + counts[4];
  const recommendPercent = Math.round((positiveCount / totalRatings) * 100);

  const distribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: counts[stars],
    writtenCount: writtenReviews.filter((r) => Math.round(Number(r?.rating) || 0) === stars).length,
    pct: Math.round((counts[stars] / totalRatings) * 100),
  }));

  return {
    totalRatings,
    writtenCount,
    averageRating: writtenCount === totalRatings ? writtenSum / totalRatings : parsedRating,
    recommendPercent,
    distribution,
  };
}

function getCategoryPulse(product) {
  const slug = (product?.categorySlug || product?.categoryName || '').toLowerCase();
  if (slug.includes('footwear')) {
    return {
      scaleTitle: 'Sizing Consensus',
      scaleLabels: ['Narrow', 'True to UK Size', 'Wide'],
      highlights: ['Cushioned Sole', 'Ergonomic Fit', 'Craft Finish'],
      prompts: ['True to UK size', 'All-day comfort', 'Clean finish', 'Responsive grip'],
    };
  }
  if (slug.includes('watch') || slug.includes('accessor') || slug.includes('bag') || slug.includes('luggage')) {
    return {
      scaleTitle: 'Craft & Proportions',
      scaleLabels: ['Compact', 'Balanced Spec', 'Statement'],
      highlights: ['Atelier Hardware', 'Material Grade', 'Everyday Utility'],
      prompts: ['Premium build', 'Refined finish', 'Great utility', 'Worth the craft'],
    };
  }
  return {
    scaleTitle: 'Tailoring & Fit Consensus',
    scaleLabels: ['Runs Small', 'True to Size', 'Runs Relaxed'],
    highlights: ['Fabric & Drape', 'Fine Stitching', 'Color Fidelity'],
    prompts: ['True-to-size fit', 'Luxurious fabric', 'Immaculate stitching', 'Vibrant color'],
  };
}

function getVerdictBadge(rating, totalRatings) {
  if (totalRatings === 0) return { label: 'New Atelier Drop', tone: 'bg-slate-100 text-slate-700 border-slate-200' };
  if (rating >= 4.7) return { label: 'Atelier Favorite', tone: 'bg-rose-50 text-rose-700 border-rose-200' };
  if (rating >= 4.2) return { label: 'Highly Rated', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  return { label: 'Community Reviewed', tone: 'bg-amber-50 text-amber-700 border-amber-200' };
}

function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'V';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const FractionalStars = ({ rating, size = 'w-4 h-4' }) => {
  return (
    <div className="inline-flex items-center gap-1" aria-label={`Rated ${Number(rating).toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((index) => {
        const fillFraction = Math.min(1, Math.max(0, rating - (index - 1)));
        const fillPercent = Math.round(fillFraction * 100);
        return (
          <div key={index} className={`relative ${size} shrink-0`}>
            <Star className={`${size} text-slate-200 fill-slate-200`} />
            {fillPercent > 0 && (
              <div className="absolute inset-0 overflow-hidden" style={{ width: `${fillPercent}%` }}>
                <Star className={`${size} text-amber-400 fill-amber-400`} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const CustomerReviewsSection = ({ product, onOpenReviewModal }) => {
  const reviewsList = product?.recentReviews || [];
  const [selectedStarFilter, setSelectedStarFilter] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [helpfulVotes, setHelpfulVotes] = useState({});

  const breakdown = useMemo(
    () => computeRatingBreakdown(product?.rating, product?.reviewCount, reviewsList),
    [product?.rating, product?.reviewCount, reviewsList]
  );

  const pulse = useMemo(() => getCategoryPulse(product), [product]);
  const verdict = getVerdictBadge(breakdown.averageRating, breakdown.totalRatings);

  const filteredReviews = useMemo(() => {
    let list = [...reviewsList];
    if (selectedStarFilter !== null) {
      list = list.filter((rev) => Math.round(Number(rev.rating) || 0) === selectedStarFilter);
    }
    if (sortBy === 'highest') {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'lowest') {
      list.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    } else {
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
    return list;
  }, [reviewsList, selectedStarFilter, sortBy]);

  const toggleHelpful = (reviewId) => {
    setHelpfulVotes((prev) => ({
      ...prev,
      [reviewId]: !prev[reviewId],
    }));
  };

  const formattedRating = breakdown.totalRatings > 0 ? breakdown.averageRating.toFixed(1) : '0.0';

  return (
    <section id="customer-reviews" className="border-t border-slate-200 pt-12 space-y-8 scroll-mt-24">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-rose-600 font-extrabold text-[11px] tracking-widest uppercase inline-flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5" /> COMMUNITY IMPRESSIONS
          </span>
          <h3 className="font-display text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Customer Ratings &amp; Reviews
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Verified purchaser feedback from the VOGNIX community
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenReviewModal?.('')}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-950 hover:bg-rose-600 active:scale-95 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all duration-300 shadow-md hover:shadow-rose-600/25 shrink-0"
        >
          <MessageSquarePlus className="w-4 h-4" />
          Write a Review
        </button>
      </div>

      {/* Luxury 3-Panel Overview Bento Card */}
      <div className="rounded-3xl bg-gradient-to-br from-white via-slate-50/80 to-rose-50/40 border border-slate-200/90 shadow-card p-6 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Panel 1: Hero Score & Verdict */}
          <div className="lg:col-span-4 lg:border-r lg:border-slate-200/80 lg:pr-8 flex flex-col items-center lg:items-start text-center lg:text-left space-y-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-extrabold uppercase tracking-widest ${verdict.tone}`}>
              <Award className="w-3 h-3" />
              {verdict.label}
            </span>

            <div className="flex items-baseline gap-2">
              <span className="font-display text-5xl sm:text-6xl font-black text-slate-950 tracking-tight tabular-nums leading-none">
                {formattedRating}
              </span>
              <span className="text-base font-bold text-slate-400">/ 5.0</span>
            </div>

            <FractionalStars rating={breakdown.averageRating} size="w-5 h-5" />

            <div className="pt-1 flex flex-wrap items-center justify-center lg:justify-start gap-2 text-xs font-semibold text-slate-600">
              <span className="inline-flex items-center gap-1 text-slate-800 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                {breakdown.totalRatings.toLocaleString('en-IN')} Verified {breakdown.totalRatings === 1 ? 'Rating' : 'Ratings'}
              </span>
              <span className="text-slate-300">•</span>
              <span>
                {breakdown.writtenCount} Written {breakdown.writtenCount === 1 ? 'Review' : 'Reviews'}
              </span>
            </div>

            {breakdown.totalRatings > 0 && (
              <div className="w-full max-w-xs lg:max-w-none pt-1">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 shadow-subtle text-[11px] font-bold text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    <strong className="text-slate-950">{breakdown.recommendPercent}%</strong> of buyers rated 4★ or higher
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Panel 2: Interactive Star Distribution Bars */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">
                Rating Breakdown
              </span>
              {selectedStarFilter !== null && (
                <button
                  type="button"
                  onClick={() => setSelectedStarFilter(null)}
                  className="text-[11px] font-bold text-rose-600 hover:underline"
                >
                  Clear {selectedStarFilter}★ filter
                </button>
              )}
            </div>

            <div className="space-y-2">
              {breakdown.distribution.map((row) => {
                const isActiveFilter = selectedStarFilter === row.stars;
                const barGradient =
                  row.stars >= 4
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : row.stars === 3
                    ? 'bg-amber-400'
                    : 'bg-rose-500';

                return (
                  <button
                    key={row.stars}
                    type="button"
                    onClick={() => {
                      if (reviewsList.length > 0) {
                        setSelectedStarFilter((prev) => (prev === row.stars ? null : row.stars));
                      }
                    }}
                    title={reviewsList.length > 0 ? `Filter by ${row.stars}-star reviews` : `${row.stars}-star rating share`}
                    className={`w-full flex items-center gap-3 px-2.5 py-1.5 rounded-xl transition-all text-left ${
                      reviewsList.length > 0 ? 'cursor-pointer hover:bg-white/90' : 'cursor-default'
                    } ${isActiveFilter ? 'bg-white ring-1 ring-rose-500 shadow-sm' : ''}`}
                  >
                    <span className="w-10 shrink-0 whitespace-nowrap inline-flex items-center justify-end gap-1 text-xs font-extrabold text-slate-700 tabular-nums">
                      <span>{row.stars}</span>
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    </span>

                    <div className="flex-1 h-2.5 bg-slate-200/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${barGradient}`}
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>

                    <span className="w-16 shrink-0 text-right text-xs font-bold text-slate-700 tabular-nums whitespace-nowrap">
                      {row.pct}%{' '}
                      <span className="text-[10px] font-semibold text-slate-400">({row.count})</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Panel 3: Dark Editorial Atelier Pulse */}
          <div className="lg:col-span-4">
            <div className="rounded-2xl bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-900 text-white p-5 sm:p-6 shadow-premium border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-400 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> ATELIER QUALITY PULSE
                </span>
                {breakdown.totalRatings > 0 && (
                  <span className="text-[11px] font-extrabold text-emerald-400 tabular-nums">
                    {breakdown.recommendPercent}% Positive
                  </span>
                )}
              </div>

              {/* Fit / Proportions Consensus Scale */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-zinc-300">{pulse.scaleTitle}</span>
                  <span className="font-extrabold text-white">{pulse.scaleLabels[1]}</span>
                </div>
                <div className="relative h-2 bg-white/10 rounded-full flex items-center">
                  <div className="absolute left-1/2 -translate-x-1/2 w-1/3 h-full bg-gradient-to-r from-rose-500/80 via-rose-500 to-rose-400/80 rounded-full" />
                  <div className="absolute left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-rose-500 shadow-md" />
                </div>
                <div className="flex items-center justify-between text-[10px] font-medium text-zinc-400">
                  <span>{pulse.scaleLabels[0]}</span>
                  <span>{pulse.scaleLabels[2]}</span>
                </div>
              </div>

              {/* Standout Category Craft Highlights */}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Signature Highlights
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {pulse.highlights.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/10 text-[11px] font-semibold text-zinc-100"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Written Reviews Area */}
      {reviewsList.length > 0 ? (
        <div className="space-y-5">
          {/* Filter & Sort Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 inline-flex items-center gap-1 mr-1">
                <SlidersHorizontal className="w-3.5 h-3.5" /> Filter:
              </span>
              <button
                type="button"
                onClick={() => setSelectedStarFilter(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  selectedStarFilter === null
                    ? 'bg-slate-950 text-white border-slate-950 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                All ({reviewsList.length})
              </button>
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = reviewsList.filter((r) => Math.round(Number(r.rating) || 0) === stars).length;
                if (count === 0) return null;
                return (
                  <button
                    key={stars}
                    type="button"
                    onClick={() => setSelectedStarFilter((prev) => (prev === stars ? null : stars))}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all inline-flex items-center gap-1 ${
                      selectedStarFilter === stars
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <span>{stars}</span>
                    <Star className={`w-3 h-3 ${selectedStarFilter === stars ? 'fill-white text-white' : 'fill-amber-400 text-amber-400'}`} />
                    <span className="opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs font-medium text-slate-500">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort written reviews"
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-600 cursor-pointer"
              >
                <option value="newest">Most Recent</option>
                <option value="highest">Highest Rated</option>
                <option value="lowest">Lowest Rated</option>
              </select>
            </div>
          </div>

          {filteredReviews.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
              <p className="text-sm font-bold text-slate-800">
                No {selectedStarFilter}-star written reviews yet.
              </p>
              <button
                type="button"
                onClick={() => setSelectedStarFilter(null)}
                className="px-4 py-2 rounded-xl bg-slate-950 text-white text-xs font-bold uppercase tracking-wider hover:bg-rose-600 transition-colors"
              >
                Show All Reviews
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredReviews.map((rev) => {
                const isHelpful = Boolean(helpfulVotes[rev.id]);
                const formattedDate = rev.createdAt
                  ? new Date(rev.createdAt).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Verified Purchase';

                return (
                  <article
                    key={rev.id}
                    className="p-6 rounded-2xl border border-slate-200/80 bg-white shadow-subtle hover:shadow-card transition-all duration-300 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      {/* Reviewer Meta */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-950 text-white text-xs font-extrabold flex items-center justify-center shrink-0 tracking-wide">
                            {getInitials(rev.userName)}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-slate-900">{rev.userName}</span>
                              {rev.isVerifiedBuyer !== false && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[10px] font-bold">
                                  <ShieldCheck className="w-3 h-3" />
                                  Verified Buyer
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                              {formattedDate}
                            </span>
                          </div>
                        </div>

                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 text-white text-xs font-extrabold shrink-0">
                          <span>{rev.rating}</span>
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        </div>
                      </div>

                      <FractionalStars rating={rev.rating} size="w-3.5 h-3.5" />

                      {rev.title && (
                        <h4 className="text-sm font-extrabold text-slate-900 leading-snug">{rev.title}</h4>
                      )}
                      {rev.comment && (
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{rev.comment}</p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => toggleHelpful(rev.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                          isHelpful
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : 'bg-slate-50 text-slate-600 border border-slate-200/80 hover:border-slate-300 hover:text-slate-900'
                        }`}
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${isHelpful ? 'fill-rose-600 text-rose-600' : ''}`} />
                        <span>{isHelpful ? 'Marked Helpful (1)' : 'Helpful'}</span>
                      </button>

                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        VOGNIX Verified
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Luxury Editorial Empty State for Written Reviews */
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-7 sm:p-10 shadow-subtle">
          <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full bg-rose-100/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-amber-100/40 blur-3xl" />

          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950 text-white text-[10px] font-extrabold uppercase tracking-widest">
                <PenLine className="w-3 h-3 text-rose-400" />
                Share Your Atelier Impression
              </div>

              <h4 className="font-display text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Be the first to write a detailed review
              </h4>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {breakdown.totalRatings > 0 ? (
                  <>
                    This piece holds a <strong className="text-slate-900">{formattedRating}★</strong> rating across{' '}
                    <strong className="text-slate-900">{breakdown.totalRatings}</strong> verified purchases. Add your written perspective on silhouette fit, fabric hand-feel, and finish to guide fellow VOGNIX shoppers.
                  </>
                ) : (
                  <>
                    Share how the silhouette drape, fabric quality, and sizing fit felt for you to help fellow VOGNIX connoisseurs choose with confidence.
                  </>
                )}
              </p>

              {/* Interactive Prompt Chips */}
              <div className="pt-1 space-y-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  Quick Review Prompts — Click to Start:
                </span>
                <div className="flex flex-wrap gap-2">
                  {pulse.prompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => onOpenReviewModal?.(prompt)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-xs font-bold text-slate-700 hover:text-rose-700 transition-all"
                    >
                      <span>{prompt}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Preview / CTA Card */}
            <div className="lg:w-72 shrink-0 p-5 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src={product?.images?.[0]?.imageUrl || FALLBACK_IMAGE}
                  alt={product?.title || 'Product thumbnail'}
                  onError={handleImageError}
                  className="w-12 h-14 rounded-xl object-cover object-top border border-slate-200 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-rose-600 truncate">
                    {product?.brandName || 'VOGNIX'}
                  </p>
                  <p className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                    {product?.title}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenReviewModal?.('')}
                className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-xs uppercase tracking-widest shadow-md hover:shadow-rose-600/25 transition-all flex items-center justify-center gap-2"
              >
                <MessageSquarePlus className="w-4 h-4" />
                Write First Review
              </button>

              <p className="text-[11px] text-center text-slate-500 font-medium flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                Verified buyer badge included
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
