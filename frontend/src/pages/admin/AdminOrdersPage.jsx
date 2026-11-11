import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { FALLBACK_IMAGE, handleImageError } from '../../utils/imageFallback';
import {
  ChevronDown,
  ChevronUp,
  Edit,
  MapPin,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';

const ALLOWED_ORDER_TRANSITIONS = {
  PENDING_PAYMENT: ['PAID', 'PAYMENT_FAILED'],
  PAYMENT_FAILED: ['PAID', 'CANCELLED'],
  PLACED: ['PAID', 'PACKED', 'SHIPPED', 'CANCELLED'],
  PAID: ['PACKED', 'SHIPPED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export default function AdminOrdersPage() {
  const [searchParams] = useSearchParams();
  const initialExpandParam = searchParams.get('expand');
  const initialExpandId = initialExpandParam && !Number.isNaN(Number(initialExpandParam))
    ? Number(initialExpandParam)
    : null;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedOrderId, setExpandedOrderId] = useState(initialExpandId);

  // Status Update Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    const paramId = searchParams.get('expand');
    if (paramId && !Number.isNaN(Number(paramId))) {
      setExpandedOrderId(Number(paramId));
    }
  }, [searchParams]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getAllOrders({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: searchTerm || undefined,
        page,
        size: 10,
      });
      setOrders(res.data?.content || []);
      setTotalPages(res.data?.totalPages || 1);
    } catch (err) {
      showToast(err.message || 'Failed to fetch orders', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm, page, showToast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    setSearchTerm(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setPage(0);
    setSearchTerm('');
  };

  const handleOpenStatusModal = (order) => {
    const allowed = ALLOWED_ORDER_TRANSITIONS[order.status] || [];
    setSelectedOrder(order);
    setNewStatus(allowed[0] || order.status);
    setRemarks('');
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!newStatus || newStatus === selectedOrder?.status) return;
    setSubmitting(true);
    try {
      await adminAPI.updateOrderStatus(selectedOrder.id, {
        status: newStatus,
        remarks: remarks || `Order status updated to ${newStatus} by admin`,
      });
      showToast(`Order #${selectedOrder.orderNumber} updated to ${newStatus}`, 'success');
      setSelectedOrder(null);
      fetchOrders();
    } catch (err) {
      showToast(err.message || 'Failed to update order status', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCodCollected = async (paymentId) => {
    try {
      await adminAPI.markCodPaymentCollected(paymentId);
      showToast('COD payment marked as collected', 'success');
      fetchOrders();
    } catch (err) {
      showToast(err.message || 'Failed to update COD payment', 'error');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'SHIPPED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PACKED':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'PAID':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'PLACED':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'CANCELLED':
      case 'PAYMENT_FAILED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  const statusOptions = [
    'PENDING_PAYMENT',
    'PLACED',
    'PAID',
    'PACKED',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
    'PAYMENT_FAILED',
  ];

  const availableTransitions = selectedOrder
    ? ALLOWED_ORDER_TRANSITIONS[selectedOrder.status] || []
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight font-serif">
              Orders Lifecycle
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Fulfill customer orders, inspect required products and variants, and manage delivery transitions
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search order #, customer, or product..."
                  className="pl-9 pr-8 py-2 bg-white border border-neutral-200 rounded-xl text-xs w-64 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Search
              </button>
            </form>

            <button
              type="button"
              onClick={fetchOrders}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-xl text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-xl border border-neutral-200 shadow-xs text-xs w-fit">
          {['ALL', ...statusOptions].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => {
                setStatusFilter(st);
                setPage(0);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50/70 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-5">Order Details</th>
                <th className="py-3 px-5">Customer</th>
                <th className="py-3 px-5">Products Ordered</th>
                <th className="py-3 px-5">Amount &amp; Payment</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-neutral-400">
                    <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-neutral-400">
                    No orders matching filter "{statusFilter}"{searchTerm ? ` and "${searchTerm}"` : ''}.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const isExpanded = expandedOrderId === order.id;
                  const items = order.items || [];
                  const totalUnits = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
                  return (
                    <React.Fragment key={order.id}>
                      <tr className={`hover:bg-neutral-50/50 transition-colors align-top ${isExpanded ? 'bg-rose-50/20' : ''}`}>
                        <td className="py-4 px-5 whitespace-nowrap">
                          <p className="font-mono font-bold text-neutral-900">{order.orderNumber}</p>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            {new Date(order.createdAt).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </p>
                          <p className="text-[11px] text-neutral-500 font-medium mt-1">
                            {items.length} item(s) · {totalUnits} unit(s)
                          </p>
                        </td>
                        <td className="py-4 px-5 max-w-[220px]">
                          <p className="font-semibold text-neutral-900">{order.customerName}</p>
                          <p className="text-[11px] text-neutral-500">{order.customerEmail}</p>
                          {order.shippingAddressSnapshot && (
                            <p
                              className="text-[11px] text-neutral-400 mt-1.5 flex items-start gap-1 line-clamp-2"
                              title={order.shippingAddressSnapshot}
                            >
                              <MapPin size={12} className="shrink-0 mt-0.5 text-neutral-400" />
                              <span>{order.shippingAddressSnapshot}</span>
                            </p>
                          )}
                        </td>
                        <td className="py-4 px-5 min-w-[260px]">
                          {items.length === 0 ? (
                            <span className="text-neutral-400 italic">No product items recorded</span>
                          ) : (
                            <div className="space-y-2.5">
                              {items.map((item, idx) => (
                                <div
                                  key={item.id || `${order.id}-${idx}`}
                                  className="flex items-start gap-3"
                                >
                                  <img
                                    src={item.productImage || FALLBACK_IMAGE}
                                    alt={item.productTitle}
                                    onError={handleImageError}
                                    className="w-10 h-12 object-cover rounded-lg bg-neutral-100 border border-neutral-200 shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    {item.brandName && (
                                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                                        {item.brandName}
                                      </p>
                                    )}
                                    <p className="font-bold text-neutral-900 leading-snug">
                                      {item.productTitle}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-neutral-600">
                                      <span>
                                        Size: <strong className="text-neutral-900">{item.size}</strong>
                                      </span>
                                      <span className="text-neutral-300">•</span>
                                      <span>
                                        Color: <strong className="text-neutral-900">{item.color}</strong>
                                      </span>
                                      <span className="px-1.5 py-0.5 bg-neutral-900 text-white rounded text-[10px] font-bold">
                                        Qty: {item.quantity}
                                      </span>
                                      {item.sku && (
                                        <span className="font-mono text-[10px] text-neutral-400">
                                          SKU: {item.sku}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-5 whitespace-nowrap">
                          <p className="font-bold text-neutral-900">
                            ₹{(order.totalAmount || 0).toLocaleString('en-IN')}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="font-medium text-neutral-700">
                              {order.paymentMethod?.replace('SIMULATED_', '')}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                order.paymentStatus === 'PAID'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : order.paymentStatus === 'FAILED' || order.paymentStatus === 'CANCELLED'
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {order.paymentStatus}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(
                              order.status
                            )}`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {order.paymentMethod === 'COD' && order.paymentStatus === 'PENDING' && order.paymentId && (
                              <button
                                type="button"
                                onClick={() => handleCodCollected(order.paymentId)}
                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded-lg text-xs transition-colors"
                              >
                                Mark COD collected
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenStatusModal(order)}
                              className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1"
                            >
                              <Edit size={13} /> Update Status
                            </button>
                            <button
                              type="button"
                              aria-expanded={isExpanded}
                              aria-label={isExpanded ? 'Hide order details' : 'Show order details'}
                              onClick={() =>
                                setExpandedOrderId(isExpanded ? null : order.id)
                              }
                              className="px-2.5 py-1.5 text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 hover:bg-neutral-100 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                            >
                              <span>{isExpanded ? 'Hide' : 'Details'}</span>
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Order Details Row */}
                      {isExpanded && (
                        <tr className="bg-neutral-50">
                          <td colSpan="6" className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                              {/* Items list */}
                              <div>
                                <h4 className="font-bold text-neutral-900 uppercase tracking-wider mb-3">
                                  Purchased Items ({items.length})
                                </h4>
                                <div className="space-y-2">
                                  {items.map((item, idx) => (
                                    <div
                                      key={item.id || `${order.id}-detail-${idx}`}
                                      className="flex items-center justify-between bg-white p-3 rounded-xl border border-neutral-200"
                                    >
                                      <div className="flex items-center gap-3">
                                        <img
                                          src={item.productImage || FALLBACK_IMAGE}
                                          alt={item.productTitle}
                                          onError={handleImageError}
                                          className="w-11 h-14 object-cover rounded bg-neutral-100 shrink-0"
                                        />
                                        <div>
                                          {item.brandName && (
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                                              {item.brandName}
                                            </p>
                                          )}
                                          <p className="font-bold text-neutral-900">
                                            {item.productTitle}
                                          </p>
                                          <p className="text-[11px] text-neutral-500 mt-0.5">
                                            Size: {item.size} | Color: {item.color} | Qty:{' '}
                                            {item.quantity}
                                            {item.sku ? ` | SKU: ${item.sku}` : ''}
                                          </p>
                                          <p className="text-[11px] text-neutral-400">
                                            Unit Price: ₹{(item.unitPrice || 0).toLocaleString('en-IN')}
                                          </p>
                                        </div>
                                      </div>
                                      <p className="font-bold text-neutral-900">
                                        ₹{(item.totalPrice || 0).toLocaleString('en-IN')}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Shipping & Payment Summary */}
                              <div className="bg-white p-4 rounded-xl border border-neutral-200 space-y-3">
                                <div>
                                  <h4 className="font-bold text-neutral-900 uppercase tracking-wider">
                                    Delivery Address
                                  </h4>
                                  <p className="text-neutral-600 mt-1 whitespace-pre-line leading-relaxed">
                                    {order.shippingAddressSnapshot}
                                  </p>
                                </div>
                                <div className="border-t border-neutral-100 pt-2 grid grid-cols-2 gap-2 text-[11px]">
                                  <div>
                                    <span className="text-neutral-400">Coupon Used:</span>{' '}
                                    <span className="font-semibold text-neutral-800">
                                      {order.couponCode || 'None'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-neutral-400">Transaction ID:</span>{' '}
                                    <span className="font-mono text-neutral-800">
                                      {order.transactionId || 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-neutral-400">Subtotal:</span>{' '}
                                    <span className="font-semibold text-neutral-800">
                                      ₹{(order.subtotal || 0).toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-neutral-400">Shipping:</span>{' '}
                                    <span className="font-semibold text-neutral-800">
                                      {order.shippingFee > 0
                                        ? `₹${order.shippingFee.toLocaleString('en-IN')}`
                                        : 'FREE'}
                                    </span>
                                  </div>
                                  {order.discountAmount > 0 && (
                                    <div>
                                      <span className="text-neutral-400">Discount:</span>{' '}
                                      <span className="font-semibold text-emerald-700">
                                        -₹{order.discountAmount.toLocaleString('en-IN')}
                                      </span>
                                    </div>
                                  )}
                                  <div>
                                    <span className="text-neutral-400">Included GST:</span>{' '}
                                    <span className="font-semibold text-neutral-800">
                                      ₹{(order.taxAmount || 0).toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                </div>
                                {order.cancellationReason && (
                                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700">
                                    <span className="font-bold">Cancellation Reason:</span>{' '}
                                    {order.cancellationReason}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 bg-neutral-50/50 border-t border-neutral-200 flex items-center justify-between text-xs">
            <span className="text-neutral-500">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 bg-white border border-neutral-200 rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 bg-white border border-neutral-200 rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Update Order Status Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-neutral-900 font-serif">
                Update Order Status: #{selectedOrder.orderNumber}
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                Current state:{' '}
                <span className="font-bold text-neutral-900">{selectedOrder.status}</span>
              </p>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
              {availableTransitions.length === 0 ? (
                <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-600 leading-relaxed">
                  Orders in status <strong>{selectedOrder.status}</strong> are terminal and cannot transition further.
                </div>
              ) : (
                <>
                  <div>
                    <label className="block font-semibold text-neutral-700 uppercase mb-1">
                      Next Valid Lifecycle Status
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl bg-white text-xs font-semibold focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                    >
                      {availableTransitions.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-700 uppercase mb-1">
                      Audit Remarks / Notes
                    </label>
                    <textarea
                      rows={3}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="e.g. Package verified at fulfillment hub, dispatched with courier AWB"
                      className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl text-xs focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 border border-neutral-300 rounded-xl font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                {availableTransitions.length > 0 && (
                  <button
                    type="submit"
                    disabled={submitting || !newStatus || newStatus === selectedOrder.status}
                    className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-semibold disabled:opacity-50"
                  >
                    {submitting ? 'Updating...' : 'Save Status'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
