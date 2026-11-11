import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  BarChart3,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  XCircle,
  Users,
  Shirt,
  CreditCard,
  RefreshCw,
} from 'lucide-react';

export default function AdminReportsPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getReports();
      setReport(res.data);
    } catch (err) {
      showToast(err.message || 'Failed to load sales report', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  if (loading && !report) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-neutral-500">Generating sales and order analytics...</p>
      </div>
    );
  }

  const totalOrders = Number(report?.totalOrders || 0);

  const summaryCards = [
    {
      label: 'Confirmed Revenue',
      value: `₹${Number(report?.totalRevenue || 0).toLocaleString('en-IN')}`,
      sub: 'Non-cancelled fulfilled volume',
      icon: DollarSign,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      label: 'Average Order Value',
      value: `₹${Number(report?.averageOrderValue || 0).toLocaleString('en-IN')}`,
      sub: `Across ${report?.successfulOrders || 0} active orders`,
      icon: TrendingUp,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      label: 'Successful Orders',
      value: report?.successfulOrders || 0,
      sub: `Out of ${totalOrders} total orders`,
      icon: ShoppingBag,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    {
      label: 'Cancelled Orders',
      value: report?.cancelledOrders || 0,
      sub: 'Inventory automatically restored',
      icon: XCircle,
      color: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    {
      label: 'Registered Users',
      value: report?.totalCustomers || 0,
      sub: 'Customer & staff accounts',
      icon: Users,
      color: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    {
      label: 'Catalog SKUs',
      value: report?.totalProducts || 0,
      sub: 'Total listed products',
      icon: Shirt,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight font-serif">
            Sales &amp; Order Reports
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Live database analytics for revenue performance, payment methods, and top merchandise
          </p>
        </div>

        <button
          onClick={fetchReport}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-800 shadow-xs cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Report
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">{card.label}</p>
                <p className="text-2xl font-black text-neutral-900 mt-1">{card.value}</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">{card.sub}</p>
              </div>
              <div className={`p-3 rounded-xl border ${card.color}`}>
                <Icon size={20} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Status + Payment Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by Status */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-neutral-100 flex items-center gap-2">
            <BarChart3 size={18} className="text-rose-500" />
            <h2 className="text-base font-bold text-neutral-900">Orders by Lifecycle Status</h2>
          </div>

          <div className="p-5 space-y-4 text-xs">
            {(!report?.ordersByStatus || report.ordersByStatus.length === 0) ? (
              <p className="text-neutral-400 py-8 text-center">No order metrics recorded yet.</p>
            ) : (
              report.ordersByStatus.map((row) => {
                const share = totalOrders > 0 ? Math.round((row.count / totalOrders) * 100) : 0;
                return (
                  <div key={row.status} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900">{row.status}</span>
                      <span className="text-neutral-600 font-semibold">
                        {row.count} orders ({share}%) · ₹{Number(row.revenue || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          row.status === 'DELIVERED'
                            ? 'bg-emerald-500'
                            : row.status === 'CANCELLED' || row.status === 'PAYMENT_FAILED'
                            ? 'bg-rose-500'
                            : 'bg-neutral-900'
                        }`}
                        style={{ width: `${Math.max(share, row.count > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Payment Method Breakdown */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-neutral-100 flex items-center gap-2">
            <CreditCard size={18} className="text-rose-500" />
            <h2 className="text-base font-bold text-neutral-900">Payment Method &amp; Status Breakdown</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100 text-neutral-500 uppercase tracking-wider">
                  <th className="py-3 px-5">Method</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Txns</th>
                  <th className="py-3 px-5 text-right">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {(!report?.paymentBreakdown || report.paymentBreakdown.length === 0) ? (
                  <tr>
                    <td colSpan="4" className="py-10 text-center text-neutral-400">
                      No payment records found.
                    </td>
                  </tr>
                ) : (
                  report.paymentBreakdown.map((item, idx) => (
                    <tr key={`${item.paymentMethod}-${item.paymentStatus}-${idx}`} className="hover:bg-neutral-50/50">
                      <td className="py-3 px-5 font-bold text-neutral-900">{item.paymentMethod}</td>
                      <td className="py-3 px-5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.paymentStatus === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700'
                              : item.paymentStatus === 'FAILED'
                              ? 'bg-red-50 text-red-700'
                              : item.paymentStatus === 'CANCELLED'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {item.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right font-semibold text-neutral-700">{item.count}</td>
                      <td className="py-3 px-5 text-right font-bold text-neutral-900">
                        ₹{Number(item.totalAmount || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Top Selling Products */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-neutral-100">
          <h2 className="text-base font-bold text-neutral-900">Top Performing Merchandise</h2>
          <p className="text-xs text-neutral-500 mt-0.5">Ranked by units sold across non-cancelled orders</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-100 text-neutral-500 uppercase tracking-wider">
                <th className="py-3 px-6">Rank</th>
                <th className="py-3 px-6">Product Title</th>
                <th className="py-3 px-6">Brand</th>
                <th className="py-3 px-6 text-right">Units Sold</th>
                <th className="py-3 px-6 text-right">Gross Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {(!report?.topProducts || report.topProducts.length === 0) ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-neutral-400">
                    No product sales recorded yet.
                  </td>
                </tr>
              ) : (
                report.topProducts.map((prod, idx) => (
                  <tr key={`${prod.productTitle}-${idx}`} className="hover:bg-neutral-50/50">
                    <td className="py-3.5 px-6 font-mono font-bold text-neutral-500">#{idx + 1}</td>
                    <td className="py-3.5 px-6 font-bold text-neutral-900">{prod.productTitle}</td>
                    <td className="py-3.5 px-6 text-neutral-600 uppercase font-semibold">{prod.brandName}</td>
                    <td className="py-3.5 px-6 text-right font-bold text-neutral-900">{prod.unitsSold}</td>
                    <td className="py-3.5 px-6 text-right font-bold text-emerald-700">
                      ₹{Number(prod.totalRevenue || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
