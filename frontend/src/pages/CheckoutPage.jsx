import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { addressAPI, orderAPI, paymentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { MapPin, CreditCard, AlertCircle, Plus, ShieldCheck, ArrowRight, X, Home, Briefcase, RefreshCw } from 'lucide-react';
import { loadRazorpay, openRazorpayCheckout } from '../services/razorpay';
import SandboxPaymentModal from '../components/SandboxPaymentModal';

const createIdempotencyKey = () =>
  `checkout-${window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;

export const CheckoutPage = () => {
  const { user } = useAuth();
  const { cart, clearCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Addresses
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [isAddAddressModalOpen, setIsAddAddressModalOpen] = useState(false);
  const [addressLoading, setAddressLoading] = useState(true);

  // New address form state
  const [newAddress, setNewAddress] = useState({
    fullName: '',
    phone: '',
    streetAddress: '',
    locality: '',
    city: '',
    state: '',
    postalCode: '',
    addressType: 'HOME',
    isDefault: false,
  });

  // Payment Method & Gateway Mode
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [gatewayMode, setGatewayMode] = useState(null);
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey);

  // Checkout submission states
  const [submitting, setSubmitting] = useState(false);
  const [validationIssues, setValidationIssues] = useState([]);
  const [sandboxPayment, setSandboxPayment] = useState(null);

  const resetIdempotencyKey = useCallback(() => {
    setIdempotencyKey(createIdempotencyKey());
  }, []);

  useEffect(() => {
    resetIdempotencyKey();
  }, [selectedAddressId, paymentMethod, cart?.appliedCoupon, cart?.totalAmount, resetIdempotencyKey]);

  // Detect active payment gateway mode and preload Razorpay Checkout script when configured
  useEffect(() => {
    let active = true;
    const loadGatewayConfig = async () => {
      try {
        const res = await paymentAPI.getConfig();
        const mode = res.data?.gatewayMode || 'SANDBOX';
        if (active) {
          setGatewayMode(mode);
        }
        if (mode === 'RAZORPAY') {
          loadRazorpay().catch(() => {});
        }
      } catch {
        // Fallback silently; createOrder response determines authoritative mode
      }
    };
    loadGatewayConfig();
    return () => {
      active = false;
    };
  }, []);

  // Load addresses on mount
  useEffect(() => {
    const loadAddresses = async () => {
      setAddressLoading(true);
      try {
        const res = await addressAPI.getAddresses();
        const list = res.data || [];
        setAddresses(list);
        if (list.length > 0) {
          const defaultAddr = list.find((a) => a.isDefault) || list[0];
          setSelectedAddressId(defaultAddr.id);
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setAddressLoading(false);
      }
    };
    loadAddresses();
  }, [showToast]);

  // Handle adding new address
  const handleCreateAddress = async (e) => {
    e.preventDefault();
    try {
      const res = await addressAPI.addAddress(newAddress);
      const created = res.data;
      setAddresses((prev) => [created, ...prev]);
      setSelectedAddressId(created.id);
      setIsAddAddressModalOpen(false);
      showToast('Delivery address saved successfully!', 'success');
      setNewAddress({
        fullName: '',
        phone: '',
        streetAddress: '',
        locality: '',
        city: '',
        state: '',
        postalCode: '',
        addressType: 'HOME',
        isDefault: false,
      });
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Backend calculates totals from the authenticated customer's database cart.
  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      showToast('Please select or add a delivery address', 'error');
      return;
    }
    if (!cart || !cart.items || cart.items.length === 0) {
      showToast('Your shopping bag is empty', 'error');
      navigate('/cart');
      return;
    }

    setSubmitting(true);
    setValidationIssues([]);
    let checkoutOpened = false;

    try {
      // Revalidate stock before reserving it for the payment attempt.
      const validateRes = await orderAPI.validateCheckout({
        addressId: selectedAddressId,
        couponCode: cart.appliedCoupon || undefined,
      });

      if (!validateRes.data?.valid) {
        setValidationIssues(validateRes.data?.issues || ['Some items are out of stock']);
        showToast('Please review stock issues before completing order', 'error');
        setSubmitting(false);
        return;
      }

      const createResponse = await paymentAPI.createOrder({
        addressId: selectedAddressId,
        paymentMethod,
        couponCode: cart.appliedCoupon || undefined,
      }, idempotencyKey);
      const payment = createResponse.data;

      if (paymentMethod === 'COD') {
        clearCart();
        navigate(`/order-confirmation/${payment.orderId}`);
        return;
      }

      if (payment.gatewayMode === 'SANDBOX' || !payment.keyId) {
        setSandboxPayment(payment);
        setSubmitting(false);
        return;
      }

      const selectedAddr = addresses.find((address) => address.id === selectedAddressId);
      await openRazorpayCheckout({
        payment,
        selectedMethod: paymentMethod,
        prefill: {
          name: selectedAddr?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          email: user?.email,
          contact: selectedAddr?.phone || user?.phone,
        },
        onSuccess: async (result) => {
          try {
            const verified = await paymentAPI.verify({
              razorpayOrderId: result.razorpay_order_id,
              razorpayPaymentId: result.razorpay_payment_id,
              razorpaySignature: result.razorpay_signature,
            });
            if (verified.data.paymentStatus === 'PAID') {
              clearCart();
              showToast('Payment verified! Order confirmed.', 'success');
              navigate(`/order-confirmation/${payment.orderId}`);
            } else {
              navigate(`/payments/${payment.paymentId}/status`);
            }
          } catch (error) {
            showToast(error.message || 'Payment verification is pending. Check payment status before retrying.', 'error');
            navigate(`/payments/${payment.paymentId}/status`);
          }
        },
        onFailure: async (event) => {
          const razorpayPaymentId = event.error?.metadata?.payment_id;
          if (razorpayPaymentId) {
            try {
              await paymentAPI.recordFailure({ paymentId: payment.paymentId, razorpayPaymentId });
            } catch (error) {
              showToast(`Failure status is still being confirmed by Razorpay: ${error.message}`, 'error');
            }
          }
          navigate(`/payments/${payment.paymentId}/status?checkout=failed`);
        },
        onDismiss: () => navigate(`/payments/${payment.paymentId}/status?checkout=closed`),
      });
      checkoutOpened = true;
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      if (!checkoutOpened) setSubmitting(false);
    }
  };

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold">No items to checkout</h2>
        <Link to="/products" className="text-rose-600 font-bold underline">Browse Catalog</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Checkout Stepper Header */}
      <div className="border-b border-slate-100 pb-5 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-rose-600">SAFE & ENCRYPTED CHECKOUT</span>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Complete Your Order</h1>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-400">
          <span className="text-slate-900">1. Bag</span>
          <span>→</span>
          <span className="text-rose-600">2. Address & Payment</span>
          <span>→</span>
          <span>3. Confirmation</span>
        </div>
      </div>

      {/* Validation Issue Alert Banner */}
      {validationIssues.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>Stock Availability Notice</span>
          </div>
          <ul className="list-disc list-inside text-xs space-y-1 text-rose-700">
            {validationIssues.map((issue, idx) => (
              <li key={idx}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Grid: Left Steps + Right Order Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left Column: Delivery Address & Payment Method */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* STEP 1: DELIVERY ADDRESS */}
          <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-rose-600" />
                1. Select Delivery Address
              </h3>
              <button
                type="button"
                onClick={() => setIsAddAddressModalOpen(true)}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add New Address
              </button>
            </div>

            {addressLoading ? (
              <div className="py-6 flex justify-center">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-rose-600 rounded-full animate-spin"></div>
              </div>
            ) : addresses.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
                <p className="text-xs text-slate-500 font-medium">No saved delivery addresses found.</p>
                <button
                  type="button"
                  onClick={() => setIsAddAddressModalOpen(true)}
                  className="px-5 py-2.5 bg-slate-950 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md"
                >
                  Add Delivery Address
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {addresses.map((addr) => {
                  const isSelected = selectedAddressId === addr.id;
                  return (
                    <div
                      key={addr.id}
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all relative ${
                        isSelected
                          ? 'border-rose-600 bg-rose-50/40 shadow-sm ring-1 ring-rose-600'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          {addr.addressType === 'HOME' ? <Home className="w-3.5 h-3.5 text-slate-400" /> : <Briefcase className="w-3.5 h-3.5 text-slate-400" />}
                          {addr.fullName}
                        </span>
                        {addr.isDefault && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">DEFAULT</span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {addr.streetAddress}, {addr.locality && `${addr.locality}, `}
                        {addr.city}, {addr.state} - {addr.postalCode}
                      </p>
                      <p className="text-xs font-semibold text-slate-500 mt-2">Mobile: {addr.phone}</p>

                      <div className="absolute top-4 right-4">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-rose-600 bg-rose-600' : 'border-slate-300'
                        }`}>
                          {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* STEP 2: PAYMENT METHOD SELECTION */}
          <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-rose-600" />
                  2. Choose Payment Method
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {gatewayMode === 'RAZORPAY'
                    ? 'Razorpay Checkout enabled — select your method and click Pay Now to complete payment.'
                    : 'Supports VOGNIX Simulated Sandbox Gateway & Razorpay Checkout.'}
                </p>
              </div>
              {gatewayMode === 'RAZORPAY' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-extrabold uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" /> Razorpay Active
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { id: 'UPI', label: 'UPI', badge: gatewayMode === 'RAZORPAY' ? 'RAZORPAY UPI' : 'INSTANT SIM / RAZORPAY' },
                { id: 'CARD', label: 'Credit / Debit Card', badge: 'VISA / MC / RUPAY' },
                { id: 'NETBANKING', label: 'Net Banking', badge: 'ONLINE BANK' },
                { id: 'WALLET', label: 'Wallets', badge: 'DIGITAL WALLET' },
                { id: 'COD', label: 'Cash on Delivery', badge: 'NO PREPAY' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    paymentMethod === m.id
                      ? 'border-rose-600 bg-rose-50/50 shadow-sm ring-1 ring-rose-600'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 block">{m.badge}</span>
                  <span className="text-xs font-extrabold text-slate-900 block mt-1">{m.label}</span>
                </button>
              ))}
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              {paymentMethod === 'COD' ? (
                <>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Cash on Delivery</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">Your order is confirmed without an online payment. Pay the courier when it arrives.</p>
                </>
              ) : gatewayMode === 'RAZORPAY' ? (
                <>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Razorpay Secure Checkout ({paymentMethod})</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Clicking <strong>Pay Now</strong> opens the Razorpay payment gateway with <strong>{paymentMethod}</strong> prioritized. Supports UPI, credit &amp; debit cards, net banking, and digital wallets with server-side signature verification.
                  </p>
                </>
              ) : (
                <>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Secure Online Checkout</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Supports UPI, credit &amp; debit cards, net banking, and digital wallets. In local Sandbox mode, you can test payment success, failure, pending status, and retry workflows interactively.
                  </p>
                </>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Order Summary & Place Order CTA */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-5 sticky top-28">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
              ORDER SUMMARY ({cart.totalItemsCount} items)
            </h3>

            {/* Item snapshots */}
            <div className="space-y-3 max-h-56 overflow-y-auto pr-2">
              {cart.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="font-bold text-slate-500">{item.quantity}x</span>
                    <span className="font-medium text-slate-800 truncate">{item.productTitle}</span>
                  </div>
                  <span className="font-bold text-slate-900 shrink-0">₹{Number(item.totalPrice).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>

            {/* Price lines */}
            <div className="border-t border-slate-100 pt-3 space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-slate-900">₹{Number(cart.subtotal).toLocaleString('en-IN')}</span>
              </div>
              {cart.couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Coupon ({cart.appliedCoupon})</span>
                  <span className="font-bold">- ₹{Number(cart.couponDiscount).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping Fee</span>
                {cart.shippingFee > 0 ? (
                  <span className="font-bold text-slate-900">₹{Number(cart.shippingFee).toLocaleString('en-IN')}</span>
                ) : (
                  <span className="font-bold text-emerald-600 uppercase">FREE</span>
                )}
              </div>
              <div className="flex justify-between">
                <span>Apparel GST (5%)</span>
                <span className="font-bold text-slate-900">₹{Number(cart.taxAmount).toLocaleString('en-IN')}</span>
              </div>
              <div className="border-t border-slate-100 pt-3 flex justify-between text-base font-black text-slate-900">
                <span>Total Payable</span>
                <span className="text-rose-600 text-xl">₹{Number(cart.totalAmount).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Place Order CTA */}
            <button
              onClick={handlePlaceOrder}
              disabled={submitting || !selectedAddressId}
              className="w-full py-4 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-rose-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Processing Order...
                </>
              ) : (
                <>
                  {paymentMethod === 'COD' ? 'PLACE COD ORDER' : 'PAY NOW'} (₹{Number(cart.totalAmount).toLocaleString('en-IN')}) <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="pt-2 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Idempotency-protected checkout</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add New Address Modal */}
      {isAddAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-display text-lg font-bold text-slate-900">Add Delivery Address</h3>
              <button onClick={() => setIsAddAddressModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleCreateAddress} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[11px]">Contact Name</label>
                <input
                  type="text"
                  required
                  placeholder="Full recipient name"
                  value={newAddress.fullName}
                  onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-medium focus:outline-none focus:border-rose-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[11px]">Mobile Phone</label>
                <input
                  type="tel"
                  required
                  placeholder="10-digit mobile number"
                  value={newAddress.phone}
                  onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-medium focus:outline-none focus:border-rose-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[11px]">Street Address</label>
                <input
                  type="text"
                  required
                  placeholder="Flat, House no., Building, Apartment"
                  value={newAddress.streetAddress}
                  onChange={(e) => setNewAddress({ ...newAddress, streetAddress: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-medium focus:outline-none focus:border-rose-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[11px]">Locality / Area</label>
                  <input
                    type="text"
                    placeholder="Street, Landmark"
                    value={newAddress.locality}
                    onChange={(e) => setNewAddress({ ...newAddress, locality: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-medium focus:outline-none focus:border-rose-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[11px]">PIN Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="6-digit PIN"
                    value={newAddress.postalCode}
                    onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-medium focus:outline-none focus:border-rose-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[11px]">City</label>
                  <input
                    type="text"
                    required
                    placeholder="City / District"
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-medium focus:outline-none focus:border-rose-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[11px]">State</label>
                  <input
                    type="text"
                    required
                    placeholder="State"
                    value={newAddress.state}
                    onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-medium focus:outline-none focus:border-rose-600"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input
                    type="radio"
                    name="addressType"
                    checked={newAddress.addressType === 'HOME'}
                    onChange={() => setNewAddress({ ...newAddress, addressType: 'HOME' })}
                    className="accent-rose-600"
                  />
                  <span>Home</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input
                    type="radio"
                    name="addressType"
                    checked={newAddress.addressType === 'WORK'}
                    onChange={() => setNewAddress({ ...newAddress, addressType: 'WORK' })}
                    className="accent-rose-600"
                  />
                  <span>Work / Office</span>
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddAddressModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-slate-950 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-800"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive VOGNIX Sandbox Gateway Modal */}
      <SandboxPaymentModal
        isOpen={Boolean(sandboxPayment)}
        payment={sandboxPayment}
        onSuccess={(updated) => {
          clearCart();
          setSandboxPayment(null);
          showToast('Payment authorized successfully!', 'success');
          navigate(`/order-confirmation/${updated.orderId}`);
        }}
        onFailure={(updated) => {
          setSandboxPayment(null);
          showToast(updated.failureReason || 'Simulated payment was declined.', 'error');
          navigate(`/payments/${updated.paymentId}/status?checkout=failed`);
        }}
        onPending={(updated) => {
          setSandboxPayment(null);
          navigate(`/payments/${updated.paymentId}/status?checkout=pending`);
        }}
        onClose={() => {
          const targetId = sandboxPayment?.paymentId;
          setSandboxPayment(null);
          if (targetId) {
            navigate(`/payments/${targetId}/status?checkout=closed`);
          }
        }}
      />

    </div>
  );
};
