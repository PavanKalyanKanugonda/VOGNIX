import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import { FALLBACK_IMAGE, handleImageError } from '../utils/imageFallback';
import { Heart, ShoppingBag, X, ArrowRight } from 'lucide-react';

export const WishlistPage = () => {
  const { wishlist, loading, removeFromWishlist, moveToCart } = useWishlist();
  const [selectedVariants, setSelectedVariants] = useState({});
  const [movingId, setMovingId] = useState(null);

  useEffect(() => {
    if (!wishlist?.items) return;
    setSelectedVariants((prev) => {
      const next = { ...prev };
      wishlist.items.forEach((item) => {
        if (!next[item.productId] && item.variants?.length > 0) {
          const defaultVar = item.variants.find((v) => v.inStock) || item.variants[0];
          next[item.productId] = defaultVar.id;
        }
      });
      return next;
    });
  }, [wishlist]);

  const handleMoveToBag = async (item) => {
    const chosenVariantId =
      selectedVariants[item.productId] ||
      item.variants?.find((v) => v.inStock)?.id ||
      item.variants?.[0]?.id;

    setMovingId(item.productId);
    try {
      await moveToCart(item.productId, chosenVariantId);
    } finally {
      setMovingId(null);
    }
  };

  if (loading && !wishlist) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-rose-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!wishlist || !wishlist.items || wishlist.items.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-6">
        <div className="w-24 h-24 mx-auto rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
          <Heart className="w-12 h-12" />
        </div>
        <h2 className="font-display text-3xl font-black text-slate-900 tracking-tight">Your Wishlist is Empty</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Explore our runway collections and save your favorite garments and footwear to review anytime.
        </p>
        <div>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-slate-950 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-md"
          >
            START SHOPPING <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4">
        <h1 className="font-display text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          My Saved Wishlist ({wishlist.totalCount} {wishlist.totalCount === 1 ? 'item' : 'items'})
        </h1>
      </div>

      {/* Wishlist Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {wishlist.items.map((item) => {
          const formattedDiscountedPrice = Number(item.discountedPrice || item.basePrice).toLocaleString('en-IN');
          const formattedBasePrice = Number(item.basePrice).toLocaleString('en-IN');
          const variants = item.variants || [];
          const selectedVariantId = selectedVariants[item.productId] || '';
          const activeVariant = variants.find((v) => String(v.id) === String(selectedVariantId));
          const canMove = item.inStock && (variants.length === 0 || !activeVariant || activeVariant.inStock);

          return (
            <div
              key={item.id}
              className="group relative bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-premium transition-all duration-300 flex flex-col justify-between"
            >
              <div className="relative aspect-[3/4] bg-slate-100 overflow-hidden">
                <Link to={`/products/${item.productId}`}>
                  <img
                    src={item.imageUrl || FALLBACK_IMAGE}
                    alt={item.productTitle}
                    onError={handleImageError}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                </Link>

                {/* Remove button */}
                <button
                  onClick={() => removeFromWishlist(item.productId)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-slate-400 hover:text-rose-600 shadow-sm transition-colors"
                  title="Remove from wishlist"
                >
                  <X className="w-4 h-4" />
                </button>

                {item.discountPercent > 0 && (
                  <span className="absolute top-3 left-3 bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-sm">
                    {item.discountPercent}% OFF
                  </span>
                )}
              </div>

              {/* Item Info */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-900">
                    {item.brandName}
                  </span>
                  <Link
                    to={`/products/${item.productId}`}
                    className="block text-xs font-bold text-slate-700 hover:text-rose-600 line-clamp-1 mt-0.5"
                  >
                    {item.productTitle}
                  </Link>

                  <div className="pt-2 flex items-baseline gap-2">
                    <span className="text-sm font-black text-slate-900">₹{formattedDiscountedPrice}</span>
                    {item.discountPercent > 0 && (
                      <span className="text-xs text-slate-400 line-through">₹{formattedBasePrice}</span>
                    )}
                  </div>
                </div>

                {/* Variant Selector + Direct Move to Bag */}
                <div className="space-y-2 pt-1">
                  {variants.length > 0 && (
                    <select
                      aria-label={`Select size for ${item.productTitle}`}
                      value={selectedVariantId}
                      onChange={(e) =>
                        setSelectedVariants((prev) => ({
                          ...prev,
                          [item.productId]: Number(e.target.value),
                        }))
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-rose-600"
                    >
                      {variants.map((v) => (
                        <option key={v.id} value={v.id} disabled={!v.inStock}>
                          {v.size} · {v.color} {!v.inStock ? '(Out of stock)' : ''}
                        </option>
                      ))}
                    </select>
                  )}

                  <button
                    type="button"
                    disabled={!canMove || movingId === item.productId}
                    onClick={() => handleMoveToBag(item)}
                    className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-rose-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    {movingId === item.productId
                      ? 'Moving...'
                      : !canMove
                      ? 'Out of Stock'
                      : 'Move to Bag'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
