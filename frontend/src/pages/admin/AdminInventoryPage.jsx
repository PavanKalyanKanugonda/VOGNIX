import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI, productAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { FALLBACK_IMAGE, handleImageError } from '../../utils/imageFallback';
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Save,
  ArrowRight,
} from 'lucide-react';

export default function AdminInventoryPage() {
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedProductDetail, setSelectedProductDetail] = useState(null);
  const [variantStocks, setVariantStocks] = useState({});
  const [savingVariantId, setSavingVariantId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  const { showToast } = useToast();

  const fetchDetail = useCallback(async (productId) => {
    if (!productId) return;
    setDetailLoading(true);
    try {
      const res = await productAPI.getProductById(productId);
      setSelectedProductDetail(res.data);
      const map = {};
      res.data?.variants?.forEach((v) => {
        map[v.id] = v.stockQuantity;
      });
      setVariantStocks(map);
    } catch (err) {
      showToast('Failed to load product variants', 'error');
    } finally {
      setDetailLoading(false);
    }
  }, [showToast]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, prodRes] = await Promise.all([
        adminAPI.getDashboardStats(),
        adminAPI.getProducts({ page: 0, size: 100 }),
      ]);
      setStats(statsRes.data);
      const items = prodRes.data?.content || [];
      setProducts(items);
      if (items.length > 0 && !selectedProductId) {
        setSelectedProductId(String(items[0].id));
      }
    } catch (err) {
      showToast(err.message || 'Failed to load inventory data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    fetchDetail(selectedProductId);
  }, [selectedProductId, fetchDetail]);

  const handleStockChange = (variantId, val) => {
    const qty = parseInt(val, 10);
    setVariantStocks((prev) => ({
      ...prev,
      [variantId]: isNaN(qty) ? '' : Math.max(0, qty),
    }));
  };

  const handleSaveStock = async (variantId) => {
    const qty = variantStocks[variantId];
    if (qty === undefined || qty === '') {
      showToast('Please enter a valid stock quantity', 'warning');
      return;
    }
    setSavingVariantId(variantId);
    try {
      await adminAPI.updateStock(variantId, qty);
      showToast('Inventory stock updated successfully!', 'success');
      const [statsRes] = await Promise.all([
        adminAPI.getDashboardStats(),
        fetchDetail(selectedProductId),
      ]);
      setStats(statsRes.data);
    } catch (err) {
      showToast(err.message || 'Failed to update stock', 'error');
    } finally {
      setSavingVariantId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight font-serif">
          Inventory & Stock Management
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Monitor variant quantities, replenish safety buffers, and manage fulfillment warehouse levels
        </p>
      </div>

      {/* Critical Low-Stock Alerts */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-rose-500" />
            <h2 className="text-base font-bold text-neutral-900">
              Low Stock Alerts (Buffer &le; 5 units)
            </h2>
          </div>
          <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 rounded-full text-xs font-bold">
            {stats?.lowStockCount || 0} Critical
          </span>
        </div>

        {stats?.lowStockItems?.length === 0 ? (
          <div className="py-6 text-center text-emerald-600 text-xs font-semibold flex items-center justify-center gap-2 bg-emerald-50/50 rounded-xl border border-emerald-100">
            <CheckCircle2 size={18} />
            <span>All catalog variants currently have healthy inventory stocks.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats?.lowStockItems?.map((item) => (
              <div
                key={item.variantId}
                className="p-4 bg-rose-50/60 border border-rose-200 rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-neutral-900 truncate max-w-[180px]">
                    {item.productTitle}
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    SKU: <span className="font-mono text-neutral-700">{item.sku}</span>
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    Size: <span className="font-bold text-neutral-800">{item.size}</span> | Color:{' '}
                    <span className="font-bold text-neutral-800">{item.color}</span>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-bold rounded-lg text-xs">
                    {item.currentStock} in stock
                  </span>
                  <button
                    onClick={() => setSelectedProductId(String(item.productId))}
                    className="text-[11px] font-semibold text-neutral-900 hover:text-rose-600 flex items-center gap-0.5 cursor-pointer"
                  >
                    Manage <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Product Variant Quick Stock Adjustment */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 font-serif">
              Catalog Stock Adjustment
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Select any product to adjust stock quantities for every size and color variant
            </p>
          </div>

          <div className="w-full sm:w-72">
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-neutral-900 focus:outline-none bg-white"
            >
              {products.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.title} (₹{p.discountedPrice || p.basePrice}) {!p.isActive ? '[Inactive]' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {detailLoading ? (
          <div className="py-12 text-center text-neutral-400">
            <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading variant details...
          </div>
        ) : selectedProductDetail ? (
          <div>
            <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-xl border border-neutral-200 mb-4">
              <img
                src={selectedProductDetail.images?.[0]?.imageUrl || FALLBACK_IMAGE}
                alt={selectedProductDetail.title}
                onError={handleImageError}
                className="w-14 h-18 object-cover rounded-lg bg-neutral-200 border border-neutral-200 shrink-0"
              />
              <div>
                <h3 className="font-bold text-sm text-neutral-900">
                  {selectedProductDetail.title}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Brand: <span className="font-semibold text-neutral-700">{selectedProductDetail.brandName || selectedProductDetail.brand?.name || '—'}</span> | Category:{' '}
                  <span className="font-semibold text-neutral-700">{selectedProductDetail.categoryName || selectedProductDetail.category?.name || '—'}</span>
                </p>
                <p className="text-xs font-bold text-neutral-900 mt-1">
                  Base Price: ₹{Number(selectedProductDetail.basePrice || 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Variant ID / SKU</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Color</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Update Quantity</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {selectedProductDetail.variants?.map((v) => {
                    const isSaving = savingVariantId === v.id;
                    const curQty = variantStocks[v.id] ?? v.stockQuantity;
                    return (
                      <tr key={v.id} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="py-3 px-4 font-mono">
                          <p className="font-bold text-neutral-900">#{v.id}</p>
                          <p className="text-[11px] text-neutral-400">{v.sku}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-neutral-800 px-2 py-0.5 bg-neutral-100 rounded">
                            {v.size}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-neutral-300"
                              style={{ backgroundColor: v.colorCode || '#000000' }}
                            />
                            <span className="font-medium text-neutral-800">{v.color}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {curQty <= 5 ? (
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 font-bold rounded text-[10px] uppercase">
                              Low Stock ({curQty})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold rounded text-[10px] uppercase">
                              In Stock ({curQty})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            min="0"
                            value={curQty}
                            onChange={(e) => handleStockChange(v.id, e.target.value)}
                            className="w-24 px-3 py-1.5 border border-neutral-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                          />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleSaveStock(v.id)}
                            disabled={isSaving}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            {isSaving ? (
                              <RefreshCw size={13} className="animate-spin" />
                            ) : (
                              <Save size={13} />
                            )}
                            <span>Save</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
