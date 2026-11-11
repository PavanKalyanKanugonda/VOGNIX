import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { orderAPI, paymentAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { FALLBACK_IMAGE, handleImageError } from '../utils/imageFallback';
import { Package, Truck, ArrowRight, X } from 'lucide-react';

export const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [cancelReason, setCancelReason] = useState('Ordered wrong size or color');
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const { showToast } = useToast();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const [res, paymentResponse] = await Promise.all([
        orderAPI.getOrders({ page: 0, size: 20 }),
        paymentAPI.getHistory(),
      ]);
      setOrders(res.data?.content || []);
      setPayments(paymentResponse.data || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleCancelOrder = async (e) => {
    e.preventDefault();
    if (!cancellingOrderId) return;
    setSubmittingCancel(true);
    try {
      await orderAPI.cancelOrder(cancellingOrderId, cancelReason);
      showToast('Order cancelled successfully. Variant stock has been restored to inventory.', 'success');
      setCancellingOrderId(null);
      fetchOrders();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingCancel(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DELIVERED':
        return <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-extrabold text-[11px] rounded-full">DELIVERED</span>;
      case 'SHIPPED':
        return <span className="px-3 py-1 bg-sky-50 text-sky-700 font-extrabold text-[11px] rounded-full">SHIPPED</span>;
      case 'PACKED':
        return <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-extrabold text-[11px] rounded-full">PACKED</span>;
      case 'PAID':
        return <span className="px-3 py-1 bg-teal-50 text-teal-700 font-extrabold text-[11px] rounded-full">PAID / PROCESSING</span>;
      case 'PLACED':
        return <span className="px-3 py-1 bg-amber-50 text-amber-700 font-extrabold text-[11px] rounded-full">PLACED</span>;
      case 'PENDING_PAYMENT':
        return <span className="px-3 py-1 bg-amber-100 text-amber-800 font-extrabold text-[11px] rounded-full">PAYMENT PENDING</span>;
      case 'CANCELLED':
        return <span className="px-3 py-1 bg-rose-50 text-rose-700 font-extrabold text-[11px] rounded-full">CANCELLED</span>;
      case 'PAYMENT_FAILED':
        return <span className="px-3 py-1 bg-red-100 text-red-800 font-extrabold text-[11px] rounded-full">PAYMENT FAILED</span>;
      default:
        return <span className="px-3 py-1 bg-slate-100 text-slate-700 font-extrabold text-[11px] rounded-full">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-rose-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">My Orders & History</h1>
          <p className="text-xs text-slate-500 mt-1">Review live delivery status, receipts, and order management</p>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-bold text-slate-900">Payment History</h2>
        {payments.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500">Payments for your orders will appear here.</p>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {payments.map((payment) => (
              <div key={payment.paymentId} className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs">
                <div>
                  <p className="font-bold text-slate-900">{payment.orderNumber} · {payment.paymentMethod}</p>
                  <p className="mt-1 text-slate-500">{new Date(payment.createdAt).toLocaleString('en-IN')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900">₹{Number(payment.amount).toLocaleString('en-IN')}</span>
                  <span className={`rounded-full px-2.5 py-1 font-extrabold ${payment.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700' : payment.paymentStatus === 'FAILED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                    {payment.paymentStatus}
                  </span>
                  {payment.paymentStatus !== 'PAID' && (
                    <Link to={`/payments/${payment.paymentId}/status`} className="font-bold text-rose-600 hover:text-rose-700">
                      View status
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {orders.length === 0 ? (
        <div className="p-16 rounded-3xl bg-slate-50 border border-slate-200 text-center space-y-4">
          <Package className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="font-display text-xl font-bold text-slate-900">No orders placed yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You haven't placed any fashion orders yet. Explore our designer collections to begin!
          </p>
          <div>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-950 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-md"
            >
              BROWSE CATALOG <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className="p-6 rounded-3xl border border-slate-100 bg-white shadow-sm space-y-5 transition-all"
            >
              {/* Order Top Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <span className="text-xs font-mono font-bold text-slate-900">Ref: {order.orderNumber}</span>
                  <p className="text-[11px] text-slate-400">
                    Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(order.status)}
                  <span className="font-black text-sm text-slate-900">
                    ₹{Number(order.totalAmount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Items Previews */}
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      {item.productImage && (
                        <img src={item.productImage || FALLBACK_IMAGE} alt={item.productTitle} onError={handleImageError} className="w-10 h-14 object-cover rounded-lg bg-slate-100 shrink-0" />
                      )}
                      <div>
                        <span className="font-bold text-slate-900 uppercase text-[11px]">{item.brandName}</span>
                        <p className="text-slate-700 font-medium line-clamp-1">{item.productTitle}</p>
                        <p className="text-[11px] text-slate-400">Size: {item.size} • Color: {item.color} • Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <span className="font-bold text-slate-900">₹{Number(item.totalPrice).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>

              {/* Order Bottom Actions */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 font-medium truncate max-w-sm">
                  Deliver to: <strong className="text-slate-700">{order.shippingAddressSnapshot}</strong>
                </span>

                <div className="flex items-center gap-3">
                  {order.cancellable && (
                    <button
                      onClick={() => setCancellingOrderId(order.id)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-rose-600 hover:bg-rose-50 font-bold transition-colors"
                    >
                      Cancel Order
                    </button>
                  )}

                  {(order.status === 'PAYMENT_FAILED' || order.status === 'PENDING_PAYMENT') && order.paymentId && (
                    <Link
                      to={`/payments/${order.paymentId}/status`}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors"
                    >
                      {order.status === 'PAYMENT_FAILED' ? 'Retry Payment' : 'Complete Payment'}
                    </Link>
                  )}

                  <Link
                    to={`/orders/${order.id}`}
                    className="px-5 py-2.5 rounded-xl bg-slate-950 text-white font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Truck className="w-4 h-4" /> Track Order
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cancel Order Reason Modal */}
      {cancellingOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display text-lg font-bold text-slate-900">Cancel Order</h3>
              <button onClick={() => setCancellingOrderId(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel this order? Once cancelled, the reserved garments will be automatically restored to platform inventory.
            </p>

            <form onSubmit={handleCancelOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-900 mb-1">Reason for Cancellation</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium focus:outline-none focus:border-rose-600"
                >
                  <option value="Ordered wrong size or color">Ordered wrong size or color</option>
                  <option value="Delivery time is too long">Delivery time is too long</option>
                  <option value="Found a better price elsewhere">Found a better price elsewhere</option>
                  <option value="Change of mind">Change of mind</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setCancellingOrderId(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-700"
                >
                  Keep Order
                </button>
                <button
                  type="submit"
                  disabled={submittingCancel}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 text-white font-bold uppercase tracking-wider hover:bg-rose-700 disabled:opacity-50"
                >
                  {submittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
