import React, { useEffect, useState } from 'react';
import { paymentAPI } from '../services/api';
import { ShieldCheck, CreditCard, Smartphone, Landmark, Wallet, CheckCircle2, XCircle, Clock3, X, RefreshCw } from 'lucide-react';

const METHOD_OPTIONS = [
  { id: 'UPI', label: 'UPI', icon: Smartphone },
  { id: 'CARD', label: 'Card', icon: CreditCard },
  { id: 'NETBANKING', label: 'NetBanking', icon: Landmark },
  { id: 'WALLET', label: 'Wallet', icon: Wallet },
];

export default function SandboxPaymentModal({
  isOpen,
  payment,
  onSuccess,
  onFailure,
  onPending,
  onClose,
}) {
  const [method, setMethod] = useState('UPI');
  const [upiId, setUpiId] = useState('customer@vognixupi');
  const [cardNumber, setCardNumber] = useState('4111 •••• •••• 1111');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [bankName, setBankName] = useState('HDFC Bank');
  const [walletProvider, setWalletProvider] = useState('VognixPay Wallet');
  const [failureReason, setFailureReason] = useState('Declined by simulated issuing bank (test failure)');
  const [processingAction, setProcessingAction] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (payment?.paymentMethod && payment.paymentMethod !== 'COD') {
      setMethod(payment.paymentMethod.toUpperCase());
    }
    setErrorMsg('');
    setProcessingAction(null);
  }, [payment, isOpen]);

  if (!isOpen || !payment) return null;

  const buildDetailsJson = () =>
    JSON.stringify({
      gateway: 'VOGNIX_SANDBOX',
      method,
      instrument:
        method === 'UPI'
          ? { vpa: upiId }
          : method === 'CARD'
          ? { maskedCard: cardNumber, expiry: cardExpiry }
          : method === 'NETBANKING'
          ? { bank: bankName }
          : { wallet: walletProvider },
    });

  const handleConfirmOutcome = async (outcome) => {
    setProcessingAction(outcome);
    setErrorMsg('');
    try {
      const response = await paymentAPI.confirm({
        paymentId: payment.paymentId,
        paymentStatus: outcome,
        paymentMethod: method,
        failureReason: outcome === 'FAILED' ? failureReason : undefined,
        paymentDetailsJson: buildDetailsJson(),
      });
      const updated = response.data;
      if (outcome === 'PAID') {
        onSuccess?.(updated);
      } else if (outcome === 'FAILED') {
        onFailure?.(updated);
      } else {
        onPending?.(updated);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Unable to process simulated payment outcome.');
    } finally {
      setProcessingAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
        {/* Top Bar */}
        <div className="bg-zinc-950 text-white px-6 py-5 flex items-center justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-rose-400">
              <ShieldCheck className="w-3.5 h-3.5" /> VOGNIX SANDBOX GATEWAY
            </span>
            <h3 className="font-serif text-xl font-black mt-0.5">Simulated Payment Checkout</h3>
          </div>
          <button
            type="button"
            disabled={!!processingAction}
            onClick={() => onClose?.()}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Close gateway"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs">
          {/* Order Summary Strip */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Order Reference</p>
              <p className="font-mono font-black text-slate-900 text-sm">{payment.orderNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Amount Payable</p>
              <p className="font-black text-rose-600 text-lg">
                ₹{Number(payment.amount || 0).toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* Method Tabs */}
          <div className="space-y-2">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Payment Instrument
            </label>
            <div className="grid grid-cols-4 gap-2">
              {METHOD_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = method === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMethod(opt.id)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 font-bold transition-all ${
                      active
                        ? 'border-rose-600 bg-rose-50 text-rose-700 ring-1 ring-rose-600'
                        : 'border-slate-200 text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px]">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sandbox Instrument Input */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
            {method === 'UPI' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Simulated UPI VPA</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 font-mono focus:outline-none focus:border-rose-600"
                />
              </div>
            )}

            {method === 'CARD' && (
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Test Card Number</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 font-mono focus:outline-none focus:border-rose-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expiry</label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 font-mono focus:outline-none focus:border-rose-600"
                  />
                </div>
              </div>
            )}

            {method === 'NETBANKING' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Simulated Bank</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 font-semibold focus:outline-none focus:border-rose-600"
                >
                  <option value="HDFC Bank">HDFC Bank</option>
                  <option value="ICICI Bank">ICICI Bank</option>
                  <option value="State Bank of India">State Bank of India</option>
                  <option value="Axis Bank">Axis Bank</option>
                </select>
              </div>
            )}

            {method === 'WALLET' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Simulated Wallet</label>
                <select
                  value={walletProvider}
                  onChange={(e) => setWalletProvider(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 font-semibold focus:outline-none focus:border-rose-600"
                >
                  <option value="VognixPay Wallet">VognixPay Wallet</option>
                  <option value="Paytm Sandbox">Paytm Sandbox</option>
                  <option value="Amazon Pay Sandbox">Amazon Pay Sandbox</option>
                </select>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-500 mb-1 text-[11px]">
                Decline Reason (used only if simulating failure)
              </label>
              <input
                type="text"
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] text-slate-700 focus:outline-none focus:border-rose-600"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
              {errorMsg}
            </div>
          )}

          {/* Action Outcomes */}
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              disabled={!!processingAction}
              onClick={() => handleConfirmOutcome('PAID')}
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {processingAction === 'PAID' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Authorize & Pay ₹{Number(payment.amount || 0).toLocaleString('en-IN')}
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={!!processingAction}
                onClick={() => handleConfirmOutcome('FAILED')}
                className="py-2.5 px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {processingAction === 'FAILED' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                Simulate Decline
              </button>

              <button
                type="button"
                disabled={!!processingAction}
                onClick={() => handleConfirmOutcome('PENDING')}
                className="py-2.5 px-3 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {processingAction === 'PENDING' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Clock3 className="w-3.5 h-3.5" />
                )}
                Keep Pending
              </button>
            </div>
          </div>

          <p className="text-[11px] text-center text-slate-400">
            Sandbox Mode active: no real funds are debited; stock locks & order lifecycles execute against the real database.
          </p>
        </div>
      </div>
    </div>
  );
}
