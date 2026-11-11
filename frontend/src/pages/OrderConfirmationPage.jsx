import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderAPI } from '../services/api';
import { FALLBACK_IMAGE, handleImageError } from '../utils/imageFallback';
import { CheckCircle2, Package, MapPin, CreditCard, ArrowRight, ShoppingBag } from 'lucide-react';

export const OrderConfirmationPage = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await orderAPI.getOrderById(id);
        setOrder(res.data);
      } catch (err) {
        console.error('Failed to load order', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-rose-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold">Order not found</h2>
        <Link to="/" className="text-rose-600 underline text-xs mt-2 inline-block">Return to Homepage</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      
      {/* Success Hero Card */}
      <div className="p-8 sm:p-12 rounded-3xl bg-slate-950 text-white text-center space-y-4 shadow-xl">
        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <span className="text-rose-400 font-extrabold text-xs tracking-widest uppercase block">ORDER CONFIRMED</span>
        <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight text-white">
          Thank you, {order.customerName}!
        </h1>
        <p className="text-xs sm:text-sm text-zinc-300 max-w-md mx-auto leading-relaxed">
          Your order has been placed and sent to our atelier for careful inspection and priority dispatch.
        </p>
        <div className="pt-2">
          <span className="inline-block px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono font-bold text-rose-300">
            Order Ref: {order.orderNumber}
          </span>
        </div>
      </div>

      {/* Order Details & Summary Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-rose-600" /> Purchased Garments ({order.items.length})
          </h3>
          <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full">
            {order.status}
          </span>
        </div>

        {/* Items List */}
        <div className="space-y-4">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-xs py-2 border-b border-slate-50 last:border-0">
              <div className="flex items-center gap-3">
                {item.productImage && (
                  <img src={item.productImage || FALLBACK_IMAGE} alt={item.productTitle} onError={handleImageError} className="w-12 h-16 object-cover rounded-lg bg-slate-100 shrink-0" />
                )}
                <div>
                  <p className="font-extrabold uppercase text-slate-900">{item.brandName}</p>
                  <p className="font-medium text-slate-700">{item.productTitle}</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">Size: {item.size} • Color: {item.color} • Qty: {item.quantity}</p>
                </div>
              </div>
              <span className="font-bold text-slate-900">₹{Number(item.totalPrice).toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>

        {/* Delivery Address & Payment Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
            <span className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-600" /> SHIPPING ADDRESS
            </span>
            <p className="text-slate-800 font-medium leading-relaxed">{order.shippingAddressSnapshot}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
            <span className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-rose-600" /> PAYMENT METHOD
            </span>
            <p className="text-slate-800 font-bold">{order.paymentMethod || 'Simulated Payment'}</p>
            <p className="text-slate-600 font-bold text-[11px]">Payment status: {order.paymentStatus || 'PENDING'}</p>
            {order.transactionId && <p className="text-emerald-700 font-bold text-[11px]">Transaction ID: {order.transactionId}</p>}
            <p className="text-slate-900 font-extrabold pt-1">Order total: ₹{Number(order.totalAmount).toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="pt-4 flex flex-col sm:flex-row gap-4">
          <Link
            to={`/orders/${order.id}`}
            className="flex-1 py-4 rounded-xl bg-slate-950 text-white font-extrabold text-xs uppercase tracking-widest hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-md"
          >
            TRACK YOUR ORDER <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/products"
            className="flex-1 py-4 rounded-xl border border-slate-300 text-slate-800 font-extrabold text-xs uppercase tracking-widest hover:border-black transition-colors flex items-center justify-center gap-2"
          >
            CONTINUE SHOPPING <ShoppingBag className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
