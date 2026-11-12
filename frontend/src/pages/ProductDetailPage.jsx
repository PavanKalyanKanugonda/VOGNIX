import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { productAPI } from '../services/api';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { FALLBACK_IMAGE, handleImageError } from '../utils/imageFallback';
import { CustomerReviewsSection } from '../components/CustomerReviewsSection';
import { Star, Heart, ShoppingBag, Truck, RefreshCw, ShieldCheck, Check, Ruler, X, Sparkles, Lock } from 'lucide-react';

export const ProductDetailPage = () => {
  const { id, slug } = useParams();
  const lookupKey = id || slug;
  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState('');
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [pincode, setPincode] = useState('');
  const [deliveryResult, setDeliveryResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isSizeChartOpen, setIsSizeChartOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const loadProductData = useCallback(async () => {
    const isNumeric = /^\d+$/.test(String(lookupKey || ''));
    const res = isNumeric
      ? await productAPI.getProductById(lookupKey)
      : await productAPI.getProductBySlug(lookupKey);
    return res.data;
  }, [lookupKey]);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const data = await loadProductData();
        setProduct(data);
        if (data.images && data.images.length > 0) {
          setSelectedImage(data.images[0].imageUrl);
        }
        if (data.variants && data.variants.length > 0) {
          const firstInStock = data.variants.find((v) => v.inStock) || data.variants[0];
          setSelectedVariant(firstInStock);
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    };
    if (lookupKey) {
      fetchProduct();
    }
  }, [lookupKey, loadProductData, showToast]);

  const handlePincodeCheck = (e) => {
    e.preventDefault();
    if (pincode.length === 6) {
      setDeliveryResult({
        estimatedDate: 'Expected Delivery by 2-3 Business Days',
        codAvailable: true,
      });
    } else {
      showToast('Please enter a valid 6-digit Indian PIN code', 'error');
    }
  };

  const handleAddToBag = async () => {
    if (!selectedVariant) {
      showToast('Please select a size first', 'error');
      return;
    }
    if (!selectedVariant.inStock) {
      showToast('Selected variant is currently out of stock', 'error');
      return;
    }
    const unitPrice = Number(
      selectedVariant.priceOverride ?? product.discountedPrice ?? product.basePrice ?? 0
    );
    await addToCart(selectedVariant.id, 1, {
      productId: product.id,
      productTitle: product.title,
      productSlug: product.slug,
      brandName: product.brandName,
      imageUrl: selectedImage || product.images?.[0]?.imageUrl || '',
      size: selectedVariant.size,
      color: selectedVariant.color,
      unitPrice,
      originalPrice: Number(product.basePrice ?? unitPrice),
      discountPercent: Number(product.discountPercent ?? 0),
      availableStock: selectedVariant.stockQuantity,
      inStock: selectedVariant.inStock,
    });
  };

  const openReviewModal = (presetTopic = '') => {
    if (presetTopic) {
      const normalized = presetTopic.charAt(0).toUpperCase() + presetTopic.slice(1);
      setReviewTitle((prev) => prev || `${normalized} & refined finish`);
      setReviewComment((prev) =>
        prev || `Really impressed by the ${presetTopic.toLowerCase()} on this piece. `
      );
    }
    setIsReviewModalOpen(true);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      showToast('Please log in to submit a product review', 'info');
      navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    setSubmittingReview(true);
    try {
      await productAPI.addReview(product.id, {
        rating: reviewRating,
        title: reviewTitle,
        comment: reviewComment,
      });
      showToast('Thank you! Your verified review has been published.', 'success');
      setIsReviewModalOpen(false);
      setReviewTitle('');
      setReviewComment('');
      const refreshed = await loadProductData();
      setProduct(refreshed);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-rose-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold">Product not found</h2>
        <Link to="/products" className="text-rose-600 font-bold underline mt-2 inline-block">Return to Catalog</Link>
      </div>
    );
  }

  const wishlisted = isInWishlist(product.id);
  const formattedDiscountedPrice = Number(product.discountedPrice || product.basePrice).toLocaleString('en-IN');
  const formattedBasePrice = Number(product.basePrice).toLocaleString('en-IN');

  const uniqueColors = [];
  const seenColorSet = new Set();
  (product.variants || []).forEach((v) => {
    const label = v.color || 'Default';
    if (!seenColorSet.has(label)) {
      seenColorSet.add(label);
      uniqueColors.push({ color: label, colorCode: v.colorCode || '#111827' });
    }
  });

  const activeColor = selectedVariant?.color || uniqueColors[0]?.color || '';
  const visibleVariants = activeColor
    ? (product.variants || []).filter((v) => (v.color || 'Default') === activeColor)
    : product.variants || [];

  const handleColorSelect = (colorName) => {
    const matchingSameSize = product.variants.find(
      (v) => (v.color || 'Default') === colorName && v.size === selectedVariant?.size
    );
    const matchingInStock = product.variants.find(
      (v) => (v.color || 'Default') === colorName && v.inStock
    );
    const firstOfColor = product.variants.find((v) => (v.color || 'Default') === colorName);
    setSelectedVariant(matchingSameSize || matchingInStock || firstOfColor || null);
  };

  const brandQuerySlug =
    product.brandSlug || (product.brandName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const ratingLabels = {
    1: 'Needs Improvement',
    2: 'Fair',
    3: 'Good',
    4: 'Very Good',
    5: 'Exceptional — Atelier Grade',
  };
  const activeStarValue = hoveredStar || reviewRating;
  const quickReviewTags = ['True to size', 'Premium fabric', 'Great drape & fit', 'Immaculate stitching', 'Worth the price'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <Link to="/" className="hover:text-black">Home</Link>
        <span>/</span>
        <Link to="/products" className="hover:text-black">Catalog</Link>
        <span>/</span>
        <Link to={`/products?category=${product.categorySlug}`} className="hover:text-black">{product.categoryName}</Link>
        <span>/</span>
        <span className="text-slate-900 font-bold truncate max-w-xs">{product.title}</span>
      </div>

      {/* Main Product Showcase Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left Column: Image Gallery (Thumbnails + Main Image) */}
        <div className="lg:col-span-7 flex flex-col-reverse md:flex-row gap-4">
          
          {/* Thumbnails rail */}
          {product.images && product.images.length > 1 && (
            <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto max-h-[580px] shrink-0">
              {product.images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(img.imageUrl)}
                  className={`w-16 h-20 md:w-20 md:h-24 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                    selectedImage === img.imageUrl ? 'border-rose-600 shadow-md' : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <img src={img.imageUrl || FALLBACK_IMAGE} alt="thumbnail" onError={handleImageError} className="w-full h-full object-cover object-top" />
                </button>
              ))}
            </div>
          )}

          {/* Main Hero Image */}
          <div className="flex-1 aspect-[3/4] max-h-[620px] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm relative group">
            <img
              src={selectedImage || product.images?.[0]?.imageUrl || FALLBACK_IMAGE}
              alt={product.title}
              onError={handleImageError}
              className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
            />
            {product.discountPercent > 0 && (
              <span className="absolute top-4 left-4 bg-rose-600 text-white text-xs font-black tracking-wider uppercase px-3 py-1 rounded-md shadow-md">
                {product.discountPercent}% OFF
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Specifications & Purchasing Controls */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Brand & Title */}
          <div>
            <Link to={`/products?brand=${brandQuerySlug}`} className="text-sm font-extrabold tracking-widest uppercase text-slate-900 hover:text-rose-600 transition-colors">
              {product.brandName}
            </Link>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-1 leading-snug">
              {product.title}
            </h1>

            {/* Rating pill */}
            {product.rating > 0 && (
              <button
                type="button"
                onClick={() => document.getElementById('customer-reviews')?.scrollIntoView({ behavior: 'smooth' })}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-xs font-bold text-slate-800 border border-slate-200 transition-colors cursor-pointer"
              >
                <span>{Number(product.rating).toFixed(1)}</span>
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-slate-300">|</span>
                <span className="text-slate-600 font-semibold">{product.reviewCount} Ratings &amp; Verified Reviews</span>
              </button>
            )}
          </div>

          {/* Pricing Section */}
          <div className="border-t border-b border-slate-100 py-4 space-y-1">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-slate-900">₹{formattedDiscountedPrice}</span>
              {product.discountPercent > 0 && (
                <>
                  <span className="text-base text-slate-400 line-through">₹{formattedBasePrice}</span>
                  <span className="text-sm font-extrabold text-rose-600">({product.discountPercent}% OFF)</span>
                </>
              )}
            </div>
            <p className="text-[11px] font-bold text-emerald-600 tracking-wide uppercase">Inclusive of all taxes</p>
          </div>

          {/* Color & Size Selection */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-4">
              {uniqueColors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                      COLOUR: <span className="text-rose-600">{activeColor}</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {uniqueColors.map((c) => {
                      const isColorSelected = activeColor === c.color;
                      return (
                        <button
                          key={c.color}
                          type="button"
                          onClick={() => handleColorSelect(c.color)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                            isColorSelected
                              ? 'border-rose-600 bg-rose-50/70 text-rose-700 ring-1 ring-rose-600'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-slate-300"
                            style={{ backgroundColor: c.colorCode }}
                          />
                          <span>{c.color}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900">SELECT SIZE</span>
                <button
                  type="button"
                  className="text-xs font-bold text-rose-600 hover:underline inline-flex items-center gap-1"
                  onClick={() => setIsSizeChartOpen(true)}
                >
                  <Ruler className="w-3.5 h-3.5" /> Size Chart
                </button>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {visibleVariants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={!v.inStock}
                      onClick={() => setSelectedVariant(v)}
                      className={`min-w-[52px] h-12 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center ${
                        isSelected
                          ? 'border-rose-600 bg-rose-50/70 text-rose-600 shadow-sm ring-1 ring-rose-600'
                          : v.inStock
                          ? 'border-slate-200 text-slate-800 hover:border-slate-400 bg-white'
                          : 'border-slate-100 bg-slate-50 text-slate-300 line-through cursor-not-allowed'
                      }`}
                    >
                      <span>{v.size}</span>
                      {v.stockQuantity > 0 && v.stockQuantity <= 5 && (
                        <span className="text-[9px] text-rose-600 font-extrabold">{v.stockQuantity} left</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedVariant && selectedVariant.stockQuantity <= 5 && selectedVariant.inStock && (
                <p className="text-xs font-bold text-rose-600 animate-pulse">
                  Hurry, only {selectedVariant.stockQuantity} item(s) left in stock for {selectedVariant.color} / {selectedVariant.size}!
                </p>
              )}
            </div>
          )}

          {/* Action CTAs: Add to Bag & Wishlist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <button
              onClick={handleAddToBag}
              className="py-4 px-6 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-rose-600/30 flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              ADD TO BAG
            </button>

            <button
              onClick={() => toggleWishlist(product.id)}
              className={`py-4 px-6 rounded-xl border font-extrabold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                wishlisted
                  ? 'bg-rose-50 border-rose-600 text-rose-600'
                  : 'bg-white border-slate-300 hover:border-black text-slate-900'
              }`}
            >
              <Heart className={`w-4 h-4 ${wishlisted ? 'fill-rose-600 text-rose-600' : ''}`} />
              {wishlisted ? 'WISHLISTED' : 'WISHLIST'}
            </button>
          </div>

          {/* Delivery & Pincode Checker */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-rose-600" /> DELIVERY OPTIONS
            </h4>
            <form onSubmit={handlePincodeCheck} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter 6-digit delivery PIN"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                className="bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold flex-1 focus:outline-none focus:border-rose-600"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-slate-950 text-white text-xs font-bold uppercase rounded-xl hover:bg-slate-800 transition-colors"
              >
                Check
              </button>
            </form>

            {deliveryResult && (
              <div className="space-y-1 pt-1 text-xs text-slate-700">
                <p className="font-bold text-emerald-700 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" /> {deliveryResult.estimatedDate}
                </p>
                <p className="text-slate-500 text-[11px]">Pay on delivery available | Free return within 14 days</p>
              </div>
            )}
          </div>

          {/* Assurances Pill Badges */}
          <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 pt-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-rose-600" />
              <span>100% Genuine Atelier Stock</span>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-rose-600" />
              <span>14 Days Doorstep Return</span>
            </div>
          </div>

          {/* Description & Specs */}
          <div className="border-t border-slate-100 pt-5 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">PRODUCT DETAILS</h4>
            <p className="text-xs text-slate-600 leading-relaxed">{product.description}</p>
          </div>
        </div>
      </div>

      {/* Customer Ratings & Reviews Section */}
      <CustomerReviewsSection product={product} onOpenReviewModal={openReviewModal} />

      {/* Size Guide Modal */}
      {isSizeChartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display text-lg font-bold text-slate-900">VOGNIX Standard Size Guide</h3>
              <button onClick={() => setIsSizeChartOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <p className="text-xs text-slate-500">
              Standard international silhouette tailoring. Measurements below represent garment fit in inches.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase">
                    <th className="py-2 px-3">Size</th>
                    <th className="py-2 px-3">Chest (in)</th>
                    <th className="py-2 px-3">Waist (in)</th>
                    <th className="py-2 px-3">Shoulder (in)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  <tr><td className="py-2 px-3 font-bold">XS</td><td className="py-2 px-3">36</td><td className="py-2 px-3">30</td><td className="py-2 px-3">16.5</td></tr>
                  <tr><td className="py-2 px-3 font-bold">S</td><td className="py-2 px-3">38</td><td className="py-2 px-3">32</td><td className="py-2 px-3">17.0</td></tr>
                  <tr><td className="py-2 px-3 font-bold">M</td><td className="py-2 px-3">40</td><td className="py-2 px-3">34</td><td className="py-2 px-3">17.8</td></tr>
                  <tr><td className="py-2 px-3 font-bold">L</td><td className="py-2 px-3">42</td><td className="py-2 px-3">36</td><td className="py-2 px-3">18.5</td></tr>
                  <tr><td className="py-2 px-3 font-bold">XL</td><td className="py-2 px-3">44</td><td className="py-2 px-3">38</td><td className="py-2 px-3">19.2</td></tr>
                  <tr><td className="py-2 px-3 font-bold">XXL</td><td className="py-2 px-3">46</td><td className="py-2 px-3">40</td><td className="py-2 px-3">20.0</td></tr>
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsSizeChartOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-950 text-white text-xs font-bold uppercase tracking-wider"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Write a Review Modal */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl relative border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-600 inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> VOGNIX COMMUNITY
                </span>
                <h3 className="font-display text-xl font-black text-slate-900">Share Your Review</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                aria-label="Close review modal"
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            {/* Product Context Strip */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <img
                src={selectedImage || product.images?.[0]?.imageUrl || FALLBACK_IMAGE}
                alt={product.title}
                onError={handleImageError}
                className="w-12 h-14 rounded-xl object-cover object-top border border-slate-200 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">{product.brandName}</p>
                <p className="text-xs font-bold text-slate-900 truncate">{product.title}</p>
              </div>
            </div>

            {!isAuthenticated && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-amber-900 font-medium">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Sign in to publish your verified review.</span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`)}
                  className="px-3 py-1.5 rounded-lg bg-slate-950 text-white text-[11px] font-bold uppercase tracking-wider shrink-0 hover:bg-rose-600 transition-colors"
                >
                  Sign In
                </button>
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-900">Overall Rating</label>
                  <span className="text-[11px] font-bold text-rose-600">{ratingLabels[activeStarValue]}</span>
                </div>
                <div
                  className="inline-flex items-center gap-1.5 p-2 rounded-2xl bg-slate-50 border border-slate-200/80"
                  onMouseLeave={() => setHoveredStar(0)}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoveredStar(star)}
                      onClick={() => setReviewRating(star)}
                      aria-label={`Rate ${star} stars`}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-7 h-7 transition-colors ${
                          star <= activeStarValue ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Quick Highlights</span>
                <div className="flex flex-wrap gap-1.5">
                  {quickReviewTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setReviewTitle((prev) => (prev ? prev : tag));
                        setReviewComment((prev) =>
                          prev.includes(tag) ? prev : `${prev ? `${prev.trim()} ` : ''}${tag}. `
                        );
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200/80 hover:border-rose-200 text-[11px] font-bold transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-1">Review Headline</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Exceptional fabric quality and true-to-size fit!"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-rose-600 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-1">Your Detailed Feedback</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe comfort, silhouette drape, stitching, and washing experience..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-medium focus:outline-none focus:border-rose-600 focus:bg-white transition-colors"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-6 py-2.5 rounded-xl bg-slate-950 hover:bg-rose-600 text-white text-xs font-extrabold uppercase tracking-wider disabled:opacity-50 transition-colors shadow-md"
                >
                  {submittingReview ? 'Submitting...' : 'Post Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
