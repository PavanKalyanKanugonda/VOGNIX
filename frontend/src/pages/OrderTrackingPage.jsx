import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { orderAPI, paymentAPI } from '../services/api';
import { openRazorpayCheckout } from '../services/razorpay';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { FALLBACK_IMAGE, handleImageError } from '../utils/imageFallback';
import SandboxPaymentModal from '../components/SandboxPaymentModal';
import { Truck, CheckCircle2, ArrowLeft, AlertCircle, RefreshCw, Clock3 } from 'lucide-react';

export const OrderTrackingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retryingPayment, setRetryingPayment] = useState(false);
  const [sandboxPayment, setSandboxPayment] = useState(null);
  const { clearCart } = useCart();
  const { showToast } = useToast();

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    try {
      const res = await orderAPI.getOrderById(id);
      setOrder(res.data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleRetryPayment = async () => {
    if (!order?.paymentId) {
      showToast('No payment attempt linked to this order.', 'error');
      return;
    }
    setRetryingPayment(true);
    try {
      const res = await paymentAPI.retry(order.paymentId);
      const attempt = res.data;
      if (attempt.gatewayMode === 'SANDBOX' || !attempt.keyId) {
        setSandboxPayment(attempt);
      } else {
        await openRazorpayCheckout({
          payment: attempt,
          selectedMethod: attempt.paymentMethod,
          prefill: {
            name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
            email: user?.email,
            contact: user?.phone,
          },
          onSuccess: async (result) => {
            try {
              const verified = await paymentAPI.verify({
                razorpayOrderId: result.razorpay_order_id,
                razorpayPaymentId: result.razorpay_payment_id,
                razorpaySignature: result.razorpay_signature,
              });
              if (verified.data?.paymentStatus === 'PAID') {
                clearCart();
                showToast('Payment confirmed! Your order is now paid and queued for dispatch.', 'success');
                fetchOrder();
              } else {
                navigate(`/payments/${attempt.paymentId}/status`);
              }
            } catch (verifyErr) {
              showToast(verifyErr.message || 'Verification pending.', 'error');
              navigate(`/payments/${attempt.paymentId}/status`);
            }
          },
          onFailure: async (event) => {
            const razorpayPaymentId = event.error?.metadata?.payment_id;
            if (razorpayPaymentId) {
              try {
                await paymentAPI.recordFailure({ paymentId: attempt.paymentId, razorpayPaymentId });
              } catch {
                // Ignore if Razorpay hasn't finalized failure record yet
              }
            }
            navigate(`/payments/${attempt.paymentId}/status?checkout=failed`);
          },
          onDismiss: () => navigate(`/payments/${attempt.paymentId}/status?checkout=closed`),
        });
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setRetryingPayment(false);
    }
  };

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
        <Link to="/orders" className="text-rose-600 underline text-xs mt-2 inline-block">Return to My Orders</Link>
      </div>
    );
  }

  // Order lifecycle states
  const lifecycle = ['PLACED', 'PAID', 'PACKED', 'SHIPPED', 'DELIVERED'];
  const currentIndex = lifecycle.indexOf(order.status);
  const isCancelled = order.status === 'CANCELLED';
  const isFailed = order.status === 'PAYMENT_FAILED';
  const isPendingPayment = order.status === 'PENDING_PAYMENT';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back link */}
      <div>
        <Link to="/orders" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-black">
          <ArrowLeft className="w-4 h-4" /> Back to Orders History
        </Link>
      </div>

      {/* Header */}
      <div className="border-b border-slate-100 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-rose-600">LIVE SHIPMENT TRACKER</span>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Order #{order.orderNumber}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Placed on{' '}
            {new Date(order.createdAt).toLocaleDateString('en-IN', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        <div>
          <span
            className={`px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider ${
              isCancelled
                ? 'bg-rose-100 text-rose-700'
                : isFailed
                ? 'bg-red-100 text-red-700'
                : isPendingPayment
                ? 'bg-amber-100 text-amber-800'
                : order.status === 'DELIVERED'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-900 text-white'
            }`}
          >
            Status: {order.status}
          </span>
        </div>
      </div>

      {/* Pending Online Payment Alert */}
      {isPendingPayment && (
        <div className="p-6 rounded-3xl bg-amber-50 border border-amber-200 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <Clock3 className="w-5 h-5 text-amber-600" /> Payment Authorization Pending
            </h4>
            <p className="text-xs text-amber-800 leading-relaxed">
              Your items are temporarily reserved while we await online payment completion. Complete your payment below to confirm dispatch.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRetryPayment}
              disabled={retryingPayment}
              className="px-6 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-extrabold uppercase tracking-wider transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
            >
              {retryingPayment ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Complete Payment Now'}
            </button>
          </div>
        </div>
      )}

      {/* Payment Failure Alert & Retry Button */}
      {isFailed && (
        <div className="p-6 rounded-3xl bg-red-50 border border-red-200 text-red-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" /> Payment Transaction Unsuccessful
            </h4>
            <p className="text-xs text-red-700 leading-relaxed">
              The previous payment attempt failed or was declined. Retry payment below to lock inventory and dispatch your order.
            </p>
          </div>
          <button
            onClick={handleRetryPayment}
            disabled={retryingPayment}
            className="px-6 py-3 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-extrabold uppercase tracking-wider transition-all shadow-md shrink-0 disabled:opacity-50 flex items-center gap-2"
          >
            {retryingPayment ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Retry Payment Now'}
          </button>
        </div>
      )}

      {/* Cancellation Notice */}
      {isCancelled && (
        <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-rose-950 space-y-1">
          <h4 className="font-bold text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600" /> Order Cancelled
          </h4>
          <p className="text-xs text-rose-700 leading-relaxed">
            Reason: {order.cancellationReason || 'Requested by customer'}. Associated item units have been safely restored to stock.
          </p>
        </div>
      )}

      {/* Visual Tracking Stepper Progress Bar */}
      {!isCancelled && !isFailed && !isPendingPayment && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <h3 className="font-display text-sm font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Truck className="w-4 h-4 text-rose-600" /> Courier Timeline
          </h3>

          <div className="relative py-4">
            {/* Step icons & lines */}
            <div className="grid grid-cols-5 relative z-10 text-center">
              {lifecycle.map((step, idx) => {
                const isPassed = idx <= currentIndex;
                const isCurrent = idx === currentIndex;

                return (
                  <div key={step} className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-sm ${
                        isCurrent
                          ? 'bg-rose-600 text-white ring-4 ring-rose-100 scale-110'
                          : isPassed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isPassed && !isCurrent ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                    </div>
                    <span
                      className={`text-[11px] font-extrabold uppercase tracking-wider mt-2.5 ${
                        isCurrent ? 'text-rose-600' : isPassed ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Connecting Bar */}
            <div className="absolute top-9 left-10 right-10 h-1 bg-slate-100 -z-0">
              <div
                className="h-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${Math.max(0, (currentIndex / (lifecycle.length - 1)) * 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900">Carrier: VOGNIX Express Air</span>
              <p className="text-[11px] text-slate-400">Tracking AWB: #{order.orderNumber}-EXP</p>
            </div>
            <span className="font-bold text-emerald-700">
              {order.status === 'DELIVERED' ? 'Delivered' : 'Doorstep Delivery in Progress'}
            </span>
          </div>
        </div>
      )}

      {/* Order Item List & Address Snapshot */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <h3 className="font-display text-sm font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
          Package Contents ({order.items.length} items)
        </h3>

        <div className="space-y-4">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-xs py-2 border-b border-slate-50 last:border-0">
              <div className="flex items-center gap-3">
                {item.productImage && (
                  <img
                    src={item.productImage || FALLBACK_IMAGE}
                    alt={item.productTitle}
                    onError={handleImageError}
                    className="w-12 h-16 object-cover rounded-lg bg-slate-100 shrink-0"
                  />
                )}
                <div>
                  <p className="font-extrabold uppercase text-slate-900">{item.brandName}</p>
                  <p className="font-bold text-slate-700">{item.productTitle}</p>
                  <p className="text-slate-400 text-[11px]">Size: {item.size} • Color: {item.color} • Qty: {item.quantity}</p>
                </div>
              </div>
              <span className="font-black text-slate-900">₹{Number(item.totalPrice).toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>

        {/* Financial Breakdown */}
        <div className="border-t border-slate-100 pt-4 space-y-2 text-xs text-slate-600 max-w-xs ml-auto">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-bold text-slate-900">₹{Number(order.subtotal).toLocaleString('en-IN')}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Coupon Discount</span>
              <span className="font-bold">- ₹{Number(order.discountAmount).toLocaleString('en-IN')}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>{order.shippingFee > 0 ? `₹${order.shippingFee}` : 'FREE'}</span>
          </div>
          <div className="flex justify-between">
            <span>GST Taxes</span>
            <span className="font-bold text-slate-900">₹{Number(order.taxAmount).toLocaleString('en-IN')}</span>
          </div>
          <div className="border-t border-slate-100 pt-2 flex justify-between text-sm font-black text-slate-900">
            <span>Total</span>
            <span className="text-base text-rose-600">₹{Number(order.totalAmount).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      <SandboxPaymentModal
        isOpen={Boolean(sandboxPayment)}
        payment={sandboxPayment}
        onSuccess={() => {
          clearCart();
          setSandboxPayment(null);
          showToast('Payment confirmed! Your order is now paid and queued for dispatch.', 'success');
          fetchOrder();
        }}
        onFailure={(updated) => {
          setSandboxPayment(null);
          showToast(updated.failureReason || 'Simulated bank declined this attempt.', 'error');
          fetchOrder();
        }}
        onPending={() => {
          setSandboxPayment(null);
          fetchOrder();
        }}
        onClose={() => {
          setSandboxPayment(null);
          fetchOrder();
        }}
      />
    </div>
  );
};
