import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { FALLBACK_IMAGE, handleImageError } from '../../utils/imageFallback';
import {
  DollarSign,
  ShoppingBag,
  Users,
  Shirt,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await adminAPI.getDashboardStats();
      setStats(res.data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(false);
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-neutral-500">Loading administrative metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700">
        <h3 className="font-bold">Error Loading Dashboard</h3>
        <p className="text-sm mt-1">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  const kpis = [
    {
      label: 'Total Revenue',
      value: `₹${(stats?.totalRevenue || 0).toLocaleString('en-IN')}`,
      icon: DollarSign,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    },
    {
      label: 'Total Orders',
      value: stats?.totalOrders || 0,
      sub: `${stats?.pendingOrders || 0} pending`,
      icon: ShoppingBag,
      color: 'bg-blue-50 text-blue-600 border-blue-100',
    },
    {
      label: 'Delivered Orders',
      value: stats?.deliveredOrders || 0,
      icon: CheckCircle2,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    },
    {
      label: 'Active Customers',
      value: stats?.totalCustomers || 0,
      icon: Users,
      color: 'bg-purple-50 text-purple-600 border-purple-100',
    },
    {
      label: 'Catalog Products',
      value: stats?.totalProducts || 0,
      icon: Shirt,
      color: 'bg-amber-50 text-amber-600 border-amber-100',
    },
    {
      label: 'Low Stock Alerts',
      value: stats?.lowStockCount || 0,
      sub: 'Needs restocking',
      icon: AlertTriangle,
      color: stats?.lowStockCount > 0 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-neutral-50 text-neutral-600 border-neutral-100',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight font-serif">
            Executive Dashboard
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Real-time metrics, order fulfillments, and inventory levels
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <Link
            to="/admin/products"
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            + Add Product
          </Link>
          <Link
            to="/admin/coupons"
            className="px-4 py-2 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            + New Promo
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  {kpi.label}
                </span>
                <div className={`p-2 rounded-xl border ${kpi.color}`}>
                  <Icon size={16} />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-neutral-900 tracking-tight">{kpi.value}</p>
                {kpi.sub && (
                  <p className="text-[11px] text-neutral-400 font-medium mt-0.5">{kpi.sub}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Recent Customer Orders</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Latest customer orders with required products, variants, and quantities
              </p>
            </div>
            <Link
              to="/admin/orders"
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
            >
              View All <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50/50 border-b border-neutral-100 text-neutral-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Products Ordered</th>
                  <th className="py-3 px-4">Total &amp; Pay</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {stats?.recentOrders?.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-neutral-400">
                      No orders placed yet.
                    </td>
                  </tr>
                ) : (
                  stats?.recentOrders?.slice(0, 5).map((order) => {
                    const items = order.items || [];
                    return (
                      <tr key={order.id} className="hover:bg-neutral-50/50 transition-colors align-top">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Link
                            to={`/admin/orders?expand=${order.id}`}
                            className="font-mono font-bold text-neutral-900 hover:text-rose-600 underline-offset-2 hover:underline block"
                          >
                            {order.orderNumber}
                          </Link>
                          {order.createdAt && (
                            <p className="text-[11px] text-neutral-400 mt-0.5">
                              {new Date(order.createdAt).toLocaleString('en-IN', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-neutral-900">{order.customerName}</p>
                          <p className="text-[11px] text-neutral-400">{order.customerEmail}</p>
                        </td>
                        <td className="py-3.5 px-4 min-w-[230px]">
                          {items.length === 0 ? (
                            <span className="text-neutral-400 italic">No product items</span>
                          ) : (
                            <div className="space-y-2">
                              {items.map((item, itemIdx) => (
                                <div key={item.id || `${order.id}-${itemIdx}`} className="flex items-start gap-2.5">
                                  <img
                                    src={item.productImage || FALLBACK_IMAGE}
                                    alt={item.productTitle}
                                    onError={handleImageError}
                                    className="w-9 h-11 object-cover rounded-lg bg-neutral-100 border border-neutral-200 shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <p className="font-bold text-neutral-900 leading-snug">
                                      {item.productTitle}
                                    </p>
                                    <p className="text-[11px] text-neutral-500 mt-0.5">
                                      {item.brandName ? `${item.brandName} · ` : ''}
                                      Size: <span className="font-semibold text-neutral-800">{item.size}</span> · Color:{' '}
                                      <span className="font-semibold text-neutral-800">{item.color}</span>
                                    </p>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                      <span className="px-1.5 py-0.5 bg-neutral-900 text-white rounded text-[10px] font-bold">
                                        Qty: {item.quantity}
                                      </span>
                                      {item.sku && (
                                        <span className="font-mono text-[10px] text-neutral-400">
                                          {item.sku}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <p className="font-bold text-neutral-900">
                            ₹{(order.totalAmount || 0).toLocaleString('en-IN')}
                          </p>
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            {order.paymentMethod?.replace('SIMULATED_', '')}
                            {order.paymentStatus ? ` · ${order.paymentStatus}` : ''}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              order.status === 'DELIVERED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.status === 'CANCELLED' || order.status === 'PAYMENT_FAILED'
                                ? 'bg-red-100 text-red-800'
                                : order.status === 'SHIPPED'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts (1 Column) */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-neutral-900">Inventory Watch</h2>
                <p className="text-xs text-neutral-500 mt-0.5">Critical stock warnings (≤ 5 units)</p>
              </div>
              <Link
                to="/admin/inventory"
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
              >
                Stock Control <ArrowUpRight size={14} />
              </Link>
            </div>

            <div className="p-4 space-y-3">
              {stats?.lowStockItems?.length === 0 ? (
                <div className="py-8 text-center text-emerald-600 text-xs font-semibold flex flex-col items-center gap-1.5">
                  <CheckCircle2 size={24} />
                  <span>All variants are sufficiently stocked!</span>
                </div>
              ) : (
                stats?.lowStockItems?.slice(0, 5).map((item) => (
                  <div
                    key={item.variantId}
                    className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-neutral-900 truncate max-w-[180px]">
                        {item.productTitle}
                      </p>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        Size: <span className="font-semibold text-neutral-800">{item.size}</span> | Color:{' '}
                        <span className="font-semibold text-neutral-800">{item.color}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2.5 py-1 bg-rose-100 text-rose-800 font-bold rounded-lg text-xs">
                        {item.currentStock} left
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-4 bg-neutral-50 border-t border-neutral-100">
            <Link
              to="/admin/inventory"
              className="block text-center py-2 px-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-medium transition-colors"
            >
              Manage & Restock All Variants
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
