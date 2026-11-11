import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  Tag,
  Plus,
  Percent,
  Calendar,
  CheckCircle2,
  XCircle,
  X,
  Copy,
  Clock,
} from 'lucide-react';

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const initialCoupon = {
    code: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    minOrderAmount: '',
    maxDiscountAmount: '',
    daysValid: 30,
    usageLimit: 500,
    isActive: true,
  };

  const [formData, setFormData] = useState(initialCoupon);
  const { showToast } = useToast();

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getCoupons();
      setCoupons(res.data || []);
    } catch (err) {
      showToast(err.message || 'Failed to fetch coupons', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    showToast(`Coupon code ${code} copied to clipboard!`, 'info');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code || !formData.discountValue) {
      showToast('Please fill coupon code and discount value', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        code: formData.code.toUpperCase().trim(),
        description: formData.description,
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue),
        minOrderAmount: formData.minOrderAmount ? parseFloat(formData.minOrderAmount) : 0,
        maxDiscountAmount: formData.maxDiscountAmount ? parseFloat(formData.maxDiscountAmount) : null,
        daysValid: parseInt(formData.daysValid, 10) || 30,
        usageLimit: parseInt(formData.usageLimit, 10) || 1000,
        isActive: Boolean(formData.isActive),
      };

      await adminAPI.createCoupon(payload);
      showToast(`Coupon ${payload.code} created successfully!`, 'success');
      setShowModal(false);
      setFormData(initialCoupon);
      fetchCoupons();
    } catch (err) {
      showToast(err.message || 'Failed to create coupon', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight font-serif">
            Promotional Coupons
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Create discount vouchers, tiered checkout promotions, and seasonal campaigns
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus size={16} /> Create New Coupon
        </button>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50/70 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-6">Coupon Code</th>
                <th className="py-3 px-6">Description</th>
                <th className="py-3 px-6">Discount</th>
                <th className="py-3 px-6">Min Order</th>
                <th className="py-3 px-6">Max Cap</th>
                <th className="py-3 px-6">Usage</th>
                <th className="py-3 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-neutral-400">
                    <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading coupons...
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-neutral-400">
                    No active discount coupons found. Click "Create New Coupon" to add one.
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-neutral-900 text-xs px-2.5 py-1 bg-neutral-100 border border-neutral-300 rounded-md">
                          {coupon.code}
                        </span>
                        <button
                          onClick={() => handleCopy(coupon.code)}
                          title="Copy Code"
                          className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-medium text-neutral-800 max-w-xs truncate">
                        {coupon.description}
                      </p>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-bold text-rose-600">
                        {coupon.discountType === 'PERCENTAGE'
                          ? `${coupon.discountValue}% OFF`
                          : `₹${coupon.discountValue} FLAT`}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-medium text-neutral-700">
                      ₹{(coupon.minOrderAmount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 px-6 font-medium text-neutral-700">
                      {coupon.maxDiscountAmount
                        ? `₹${coupon.maxDiscountAmount.toLocaleString('en-IN')}`
                        : 'No limit'}
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-neutral-600 font-medium">
                        {coupon.usedCount || 0} / {coupon.usageLimit || '∞'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {coupon.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 size={12} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-500 bg-neutral-100 px-2.5 py-0.5 rounded-full">
                          <XCircle size={12} /> Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Coupon Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-neutral-900 font-serif">Create Promo Coupon</h2>
                <p className="text-xs text-neutral-500 mt-0.5">Define code, discount rules, and validation</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 uppercase mb-1">
                  Coupon Code *
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. FESTIVE30"
                  className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl font-mono uppercase font-bold focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 uppercase mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. 30% off on all orders above ₹2,999"
                  className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 uppercase mb-1">
                    Discount Type
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                    className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl bg-white focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 uppercase mb-1">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    placeholder="20"
                    className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 uppercase mb-1">
                    Min Order Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                    placeholder="1999"
                    className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 uppercase mb-1">
                    Max Discount Cap (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxDiscountAmount}
                    onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                    placeholder="1000"
                    className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 uppercase mb-1">
                    Validity (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.daysValid}
                    onChange={(e) => setFormData({ ...formData, daysValid: e.target.value })}
                    placeholder="30"
                    className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 uppercase mb-1">
                    Total Usage Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    placeholder="500"
                    className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-xl font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Creating Coupon...' : 'Save & Activate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
