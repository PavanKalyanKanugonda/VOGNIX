import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { FALLBACK_IMAGE, handleImageError } from '../utils/imageFallback';
import { Trash2, Heart, Tag, ArrowRight, ShoppingBag, Plus, Minus, CheckCircle2 } from 'lucide-react';

export const CartPage = () => {
  const { cart, loading, updateQuantity, removeFromCart, applyCoupon, removeCoupon } = useCart();
  const { toggleWishlist } = useWishlist();
  const [couponInput, setCouponInput] = useState('');
  const [couponSubmitting, setCouponSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleApplyCoupon = async (codeToApply) => {
    const code = codeToApply || couponInput;
    if (!code.trim()) return;
    setCouponSubmitting(true);
    await applyCoupon(code.trim().toUpperCase());
    setCouponInput('');
    setCouponSubmitting(false);
  };

  const handleMoveToWishlist = (item) => {
    toggleWishlist(item.productId);
    removeFromCart(item.id);
  };

  if (loading && !cart) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-rose-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center space-y-6">
        <div className="w-24 h-24 mx-auto rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
          <ShoppingBag className="w-12 h-12" />
        </div>
        <h2 className="font-display text-3xl font-black text-slate-900 tracking-tight">Your Shopping Bag is Empty</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
          There are no items currently added to your bag. Explore our newest atelier collections and upgrade your signature style.
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

  const freeShippingThreshold = 999;
  const subtotal = Number(cart.subtotal || 0);
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const freeShippingProgress = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));

  const availableVouchers = [
    { code: 'VOGNIX10', desc: '10% off entire bag above ₹1,499' },
    { code: 'FIRST500', desc: 'Flat ₹500 off on first purchase above ₹2,999' },
    { code: 'FESTIVE20', desc: 'Grand 20% off on couture above ₹4,999' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="border-b border-slate-100 pb-4">
        <h1 className="font-display text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Shopping Bag ({cart.totalItemsCount} {cart.totalItemsCount === 1 ? 'item' : 'items'})
        </h1>
      </div>

      {/* Free Shipping Progress Indicator */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          {remainingForFreeShipping > 0 ? (
            <span className="text-slate-800">
              Add <strong className="text-rose-600 font-extrabold">₹{remainingForFreeShipping.toLocaleString('en-IN')}</strong> more for <strong className="text-emerald-600 font-extrabold">FREE Priority Delivery</strong>!
            </span>
          ) : (
            <span className="text-emerald-700 font-extrabold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> You unlocked FREE Priority Doorstep Delivery!
            </span>
          )}
          <span className="text-[11px] text-slate-400 font-semibold">{freeShippingProgress}%</span>
        </div>
        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${freeShippingProgress}%` }}
          ></div>
        </div>
      </div>

      {/* Main Grid: Items List (Left) + Order Summary & Coupons (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left Column: Cart Items */}
        <div className="lg:col-span-8 space-y-4">
          {cart.items.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl border border-slate-100 bg-white shadow-sm flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between transition-all"
            >
              <div className="flex gap-4 items-center">
                <Link to={`/products/${item.productId}`} className="w-20 h-28 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                  <img
                    src={item.imageUrl || FALLBACK_IMAGE}
                    alt={item.productTitle}
                    onError={handleImageError}
                    className="w-full h-full object-cover object-top"
                  />
                </Link>

                <div className="space-y-1">
                  <span className="text-xs font-extrabold tracking-wider uppercase text-slate-900">{item.brandName}</span>
                  <Link to={`/products/${item.productId}`} className="block text-xs font-bold text-slate-700 hover:text-rose-600 line-clamp-1">
                    {item.productTitle}
                  </Link>

                  {/* Size and Color tags */}
                  <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
                    <span className="px-2 py-0.5 bg-slate-100 rounded-md font-bold text-slate-800">Size: {item.size}</span>
                    <span className="px-2 py-0.5 bg-slate-100 rounded-md font-bold text-slate-800">Color: {item.color}</span>
                  </div>

                  {/* Pricing line */}
                  <div className="pt-2 flex items-baseline gap-2">
                    <span className="text-sm font-black text-slate-900">₹{Number(item.unitPrice).toLocaleString('en-IN')}</span>
                    {item.discountPercent > 0 && (
                      <>
                        <span className="text-xs text-slate-400 line-through">₹{Number(item.originalPrice).toLocaleString('en-IN')}</span>
                        <span className="text-[11px] font-bold text-rose-600">({item.discountPercent}% OFF)</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Quantity Stepper & Actions */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                
                {/* Stepper */}
                <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="p-2 hover:bg-slate-200 text-slate-700 transition-colors"
                    title="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-3 text-xs font-black text-slate-900">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="p-2 hover:bg-slate-200 text-slate-700 transition-colors"
                    title="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Subtotal for line item */}
                <span className="text-sm font-black text-slate-900">
                  ₹{Number(item.totalPrice).toLocaleString('en-IN')}
                </span>

                {/* Secondary buttons */}
                <div className="flex items-center gap-3 text-xs">
                  <button
                    onClick={() => handleMoveToWishlist(item)}
                    className="text-slate-500 hover:text-rose-600 flex items-center gap-1 font-semibold transition-colors"
                  >
                    <Heart className="w-3.5 h-3.5" /> Wishlist
                  </button>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-slate-400 hover:text-rose-600 flex items-center gap-1 font-semibold transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Price Details & Coupon Engine */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Coupon Promo Box */}
          <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-rose-600" /> APPLY COUPON
            </h3>

            {cart.appliedCoupon ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-800">Coupon applied: {cart.appliedCoupon}</p>
                  <p className="text-[11px] text-emerald-600">You saved ₹{Number(cart.couponDiscount).toLocaleString('en-IN')}</p>
                </div>
                <button
                  type="button"
                  onClick={removeCoupon}
                  className="text-xs font-bold text-rose-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleApplyCoupon();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  placeholder="Enter promo coupon code"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-rose-600"
                />
                <button
                  type="submit"
                  disabled={couponSubmitting}
                  className="px-4 py-2.5 bg-slate-950 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {couponSubmitting ? '...' : 'Apply'}
                </button>
              </form>
            )}

            {/* Quick Suggestions */}
            {!cart.appliedCoupon && (
              <div className="pt-2 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Available Codes:</span>
                <div className="space-y-1.5">
                  {availableVouchers.map((v) => (
                    <div
                      key={v.code}
                      onClick={() => handleApplyCoupon(v.code)}
                      className="p-2.5 rounded-xl border border-dashed border-slate-200 hover:border-rose-500 bg-slate-50/50 hover:bg-rose-50/30 cursor-pointer flex items-center justify-between transition-all"
                    >
                      <div>
                        <span className="text-xs font-mono font-bold text-slate-900 text-rose-600">{v.code}</span>
                        <p className="text-[11px] text-slate-500">{v.desc}</p>
                      </div>
                      <span className="text-[11px] font-bold text-rose-600">TAP TO APPLY</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Price Breakdown Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
              PRICE DETAILS ({cart.totalItemsCount} items)
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total MRP Subtotal</span>
                <span className="font-bold text-slate-900">₹{Number(cart.subtotal).toLocaleString('en-IN')}</span>
              </div>

              {cart.couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Coupon Discount</span>
                  <span className="font-bold">- ₹{Number(cart.couponDiscount).toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Delivery Convenience Fee</span>
                {cart.shippingFee > 0 ? (
                  <span className="font-bold text-slate-900">₹{Number(cart.shippingFee).toLocaleString('en-IN')}</span>
                ) : (
                  <span className="font-bold text-emerald-600 uppercase">FREE</span>
                )}
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Estimated Apparel GST (5%)</span>
                <span className="font-bold text-slate-900">₹{Number(cart.taxAmount).toLocaleString('en-IN')}</span>
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-between text-sm font-black text-slate-900">
                <span>Total Amount</span>
                <span className="text-lg">₹{Number(cart.totalAmount).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="w-full py-4 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-rose-600/30 flex items-center justify-center gap-2 mt-4"
            >
              PROCEED TO CHECKOUT <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
