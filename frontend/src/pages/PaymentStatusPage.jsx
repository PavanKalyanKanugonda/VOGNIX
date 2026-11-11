import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { paymentAPI } from '../services/api';
import { openRazorpayCheckout } from '../services/razorpay';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import SandboxPaymentModal from '../components/SandboxPaymentModal';
import { CheckCircle2, CircleAlert, Clock3, RefreshCw, ShieldCheck, CreditCard } from 'lucide-react';

export default function PaymentStatusPage() {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { clearCart } = useCart();
  const { showToast } = useToast();

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [sandboxPayment, setSandboxPayment] = useState(null);
  const [error, setError] = useState('');
  const wasClosed = searchParams.get('checkout') === 'closed';

  const refreshStatus = useCallback(
    async (targetPaymentId = paymentId, sync = false) => {
      try {
        const response = await paymentAPI.getStatus(targetPaymentId, sync);
        setPayment(response.data);
        setError('');
        if (response.data?.paymentStatus === 'PAID') {
          clearCart();
        }
      } catch (requestError) {
        setError(requestError.message || 'Unable to retrieve payment status.');
      } finally {
        setLoading(false);
      }
    },
    [paymentId, clearCart]
  );

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (payment?.paymentStatus === 'PAID') return;
    const timer = window.setInterval(() => refreshStatus(), 4000);
    return () => window.clearInterval(timer);
  }, [payment?.paymentStatus, refreshStatus]);

  const startCheckout = async (attempt) => {
    navigate(`/payments/${attempt.paymentId}/status`, { replace: true });

    if (attempt.gatewayMode === 'SANDBOX' || !attempt.keyId) {
      setSandboxPayment(attempt);
      return;
    }

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
          setPayment(verified.data);
          if (verified.data?.paymentStatus === 'PAID') {
            clearCart();
            showToast('Payment completed successfully!', 'success');
          } else {
            refreshStatus(attempt.paymentId, true);
          }
        } catch (verificationError) {
          setError(`Payment verification is pending: ${verificationError.message}`);
          refreshStatus(attempt.paymentId, true);
        }
      },
      onFailure: async (event) => {
        const razorpayPaymentId = event.error?.metadata?.payment_id;
        if (razorpayPaymentId) {
          try {
            await paymentAPI.recordFailure({ paymentId: attempt.paymentId, razorpayPaymentId });
          } catch (requestError) {
            setError(`Razorpay is confirming the failed attempt: ${requestError.message}`);
          }
        }
        refreshStatus(attempt.paymentId);
      },
      onDismiss: () => refreshStatus(attempt.paymentId),
    });
  };

  const handleRetry = async () => {
    setRetrying(true);
    setError('');
    try {
      const response = await paymentAPI.retry(paymentId);
      setPayment(response.data);
      await startCheckout(response.data);
    } catch (retryError) {
      setError(retryError.message || 'Unable to launch payment attempt.');
    } finally {
      setRetrying(false);
    }
  };

  const status = payment?.paymentStatus;
  const paid = status === 'PAID';
  const failed = status === 'FAILED';
  const cancelled = status === 'CANCELLED' || (wasClosed && status === 'PENDING');
  const pending = status === 'PENDING';
  const isSandbox = payment?.gatewayMode === 'SANDBOX';
  const gatewayName = isSandbox ? 'VOGNIX Sandbox Gateway' : 'Razorpay';

  const heading = paid
    ? 'Payment successful'
    : failed
    ? 'Payment failed'
    : cancelled
    ? 'Checkout paused / closed'
    : 'Payment pending';
  const Icon = paid ? CheckCircle2 : failed || cancelled ? CircleAlert : Clock3;
  const iconClass = paid ? 'text-emerald-500' : failed || cancelled ? 'text-rose-500' : 'text-amber-500';

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
        <Icon className={`mx-auto h-14 w-14 ${iconClass}`} />
        <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-rose-600">
          {isSandbox ? 'VOGNIX SANDBOX GATEWAY' : 'VOGNIX SECURE CHECKOUT'}
        </p>
        <h1 className="mt-2 font-serif text-3xl font-black text-slate-900">
          {loading ? 'Checking payment…' : heading}
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">
          {paid
            ? `${gatewayName} confirmed your payment. Your order is now confirmed and prepared for fulfillment.`
            : failed
            ? payment?.failureReason ||
              `${gatewayName} declined this payment attempt. You can retry securely below.`
            : cancelled
            ? `Checkout was closed before authorization. Resume payment below or refresh verified status.`
            : `This payment attempt is currently awaiting confirmation from ${gatewayName}. You can complete authorization below or refresh status.`}
        </p>

        {payment && (
          <div className="mt-7 space-y-2 rounded-2xl bg-slate-50 p-4 text-left text-sm">
            <p className="flex justify-between gap-4">
              <span className="text-slate-500">Order</span>
              <strong>{payment.orderNumber}</strong>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-slate-500">Method</span>
              <strong>{payment.paymentMethod}</strong>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-slate-500">Amount</span>
              <strong>₹{Number(payment.amount).toLocaleString('en-IN')}</strong>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-slate-500">Status</span>
              <strong>{payment.paymentStatus}</strong>
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-rose-700">
            {error}
          </p>
        )}

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          {!paid && (failed || cancelled || pending) && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-6 py-3 text-xs font-extrabold uppercase tracking-wider text-white disabled:opacity-50"
            >
              {retrying ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              {retrying
                ? 'Preparing attempt…'
                : failed || cancelled
                ? 'Retry Payment'
                : 'Complete Payment Now'}
            </button>
          )}

          {!paid && (
            <button
              type="button"
              onClick={() => refreshStatus(paymentId, true)}
              disabled={retrying || loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-900 disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              Refresh Status
            </button>
          )}

          {paid && (
            <Link
              to={`/order-confirmation/${payment.orderId}`}
              className="inline-flex rounded-xl bg-slate-950 hover:bg-slate-800 px-6 py-3 text-xs font-extrabold uppercase tracking-wider text-white"
            >
              View Order Confirmation
            </Link>
          )}

          {payment && (
            <Link
              to={`/orders/${payment.orderId}`}
              className="inline-flex rounded-xl border border-slate-200 hover:border-slate-400 px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-700"
            >
              Track Order
            </Link>
          )}
        </div>
      </section>

      <SandboxPaymentModal
        isOpen={Boolean(sandboxPayment)}
        payment={sandboxPayment}
        onSuccess={(updated) => {
          clearCart();
          setSandboxPayment(null);
          setPayment(updated);
          showToast('Payment completed successfully!', 'success');
        }}
        onFailure={(updated) => {
          setSandboxPayment(null);
          setPayment(updated);
          showToast(updated.failureReason || 'Payment declined.', 'error');
        }}
        onPending={(updated) => {
          setSandboxPayment(null);
          setPayment(updated);
        }}
        onClose={() => {
          setSandboxPayment(null);
          refreshStatus(sandboxPayment?.paymentId);
        }}
      />
    </div>
  );
}
