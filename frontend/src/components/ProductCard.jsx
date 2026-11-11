import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Star } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { FALLBACK_IMAGE, handleImageError } from '../utils/imageFallback';

export const ProductCard = ({ product }) => {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const wishlisted = isInWishlist(product.id);

  const handleWishlistClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  const formattedDiscountedPrice = Number(product.discountedPrice || product.basePrice).toLocaleString('en-IN');
  const formattedBasePrice = Number(product.basePrice).toLocaleString('en-IN');

  return (
    <div className="group relative bg-white rounded-xl overflow-hidden border border-slate-100 hover:shadow-premium transition-all duration-300 flex flex-col">
      {/* Product Image Container */}
      <Link to={`/products/${product.id}`} className="relative aspect-[3/4] overflow-hidden bg-slate-100 block">
        <img
          src={product.primaryImageUrl || FALLBACK_IMAGE}
          alt={product.title}
          loading="lazy"
          onError={handleImageError}
          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700 ease-out"
        />

        {/* Wishlist Floating Button */}
        <button
          onClick={handleWishlistClick}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 active:scale-95 transition-all z-10"
          title={wishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              wishlisted ? 'fill-rose-600 text-rose-600' : 'text-slate-600 hover:text-rose-600'
            }`}
          />
        </button>

        {/* Rating Pill */}
        {product.rating > 0 && (
          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm flex items-center gap-1 text-[11px] font-bold text-slate-800">
            <span>{product.rating}</span>
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-slate-400 font-normal">|</span>
            <span className="text-slate-500 font-semibold">{product.reviewCount}</span>
          </div>
        )}

        {/* Discount Badge */}
        {product.discountPercent > 0 && (
          <div className="absolute top-3 left-3 bg-rose-600 text-white text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded shadow-sm">
            {product.discountPercent}% OFF
          </div>
        )}
      </Link>

      {/* Product Details */}
      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          {/* Brand */}
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-900 truncate">
            {product.brandName}
          </p>

          {/* Title */}
          <Link to={`/products/${product.id}`} className="block mt-1 group-hover:text-rose-600 transition-colors">
            <h3 className="text-xs text-slate-600 line-clamp-1 font-medium leading-relaxed" title={product.title}>
              {product.title}
            </h3>
          </Link>
        </div>

        {/* Price Section */}
        <div className="mt-3 pt-2 border-t border-slate-50 flex items-baseline gap-2">
          <span className="text-sm font-extrabold text-slate-900">
            ₹{formattedDiscountedPrice}
          </span>
          {product.discountPercent > 0 && (
            <>
              <span className="text-xs text-slate-400 line-through">
                ₹{formattedBasePrice}
              </span>
              <span className="text-[11px] font-bold text-rose-600">
                ({product.discountPercent}% OFF)
              </span>
            </>
          )}
        </div>

        {/* Available Sizes Hint */}
        {product.availableSizes && product.availableSizes.length > 0 && (
          <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
            <span>Sizes:</span>
            <span className="font-semibold text-slate-600">{product.availableSizes.slice(0, 4).join(', ')}{product.availableSizes.length > 4 ? '...' : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
};
