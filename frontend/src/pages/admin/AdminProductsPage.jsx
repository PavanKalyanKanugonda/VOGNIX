import React, { useState, useEffect, useCallback } from 'react';
import { productAPI, adminAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { FALLBACK_IMAGE, handleImageError } from '../../utils/imageFallback';
import {
  Plus,
  Trash2,
  X,
  Search,
  Sparkles,
  Edit,
  Power,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

const DEFAULT_IMAGES = ['https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80'];
const DEFAULT_VARIANTS = [
  { size: 'M', color: 'Black', colorCode: '#111827', stockQuantity: 25 },
  { size: 'L', color: 'Black', colorCode: '#111827', stockQuantity: 20 },
  { size: 'XL', color: 'Black', colorCode: '#111827', stockQuantity: 15 },
];

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [loadingDetailId, setLoadingDetailId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { showToast } = useToast();

  const buildEmptyForm = useCallback(
    (brandList = brands, catList = categories) => ({
      title: '',
      description: '',
      brandId: brandList[0]?.id || '',
      categoryId: catList[0]?.id || '',
      gender: 'UNISEX',
      basePrice: '',
      discountPercent: 0,
      isActive: true,
      isFeatured: false,
      imageUrls: [...DEFAULT_IMAGES],
      variants: DEFAULT_VARIANTS.map((v) => ({ ...v })),
    }),
    [brands, categories]
  );

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    brandId: '',
    categoryId: '',
    gender: 'UNISEX',
    basePrice: '',
    discountPercent: 0,
    isActive: true,
    isFeatured: false,
    imageUrls: [...DEFAULT_IMAGES],
    variants: DEFAULT_VARIANTS.map((v) => ({ ...v })),
  });

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, brandRes] = await Promise.all([
        adminAPI.getProducts({ search: searchTerm || undefined, page, size: 10 }),
        adminAPI.getCategories(),
        adminAPI.getBrands(),
      ]);
      setProducts(prodRes.data?.content || []);
      setTotalPages(prodRes.data?.totalPages || 1);
      const cats = catRes.data || [];
      const brs = brandRes.data || [];
      setCategories(cats);
      setBrands(brs);
      setFormData((prev) => ({
        ...prev,
        brandId: prev.brandId || brs[0]?.id || '',
        categoryId: prev.categoryId || cats[0]?.id || '',
      }));
    } catch (err) {
      showToast(err.message || 'Failed to fetch catalog', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, showToast]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

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

  const handleOpenCreateModal = () => {
    setEditingProductId(null);
    setFormData(buildEmptyForm());
    setShowModal(true);
  };

  const handleOpenEditModal = async (product) => {
    setLoadingDetailId(product.id);
    try {
      const res = await productAPI.getProductById(product.id);
      const detail = res.data;
      setEditingProductId(detail.id);
      setFormData({
        title: detail.title || '',
        description: detail.description || '',
        brandId: detail.brandId || brands[0]?.id || '',
        categoryId: detail.categoryId || categories[0]?.id || '',
        gender: detail.gender || 'UNISEX',
        basePrice: detail.basePrice ?? '',
        discountPercent: detail.discountPercent ?? 0,
        isActive: detail.isActive !== false,
        isFeatured: Boolean(detail.isFeatured),
        imageUrls:
          detail.images?.length > 0
            ? detail.images.map((img) => img.imageUrl)
            : [...DEFAULT_IMAGES],
        variants:
          detail.variants?.length > 0
            ? detail.variants.map((v) => ({
                id: v.id,
                sku: v.sku,
                size: v.size,
                color: v.color,
                colorCode: v.colorCode || '#111827',
                stockQuantity: v.stockQuantity ?? 0,
              }))
            : [{ size: 'M', color: 'Black', colorCode: '#111827', stockQuantity: 10 }],
      });
      setShowModal(true);
    } catch (err) {
      showToast(err.message || 'Failed to load product details for editing', 'error');
    } finally {
      setLoadingDetailId(null);
    }
  };

  const handleToggleActive = async (product) => {
    if (product.isActive) {
      if (!window.confirm(`Are you sure you want to deactivate "${product.title}"?`)) return;
      try {
        await adminAPI.deleteProduct(product.id);
        showToast(`Product "${product.title}" deactivated successfully`, 'success');
        fetchCatalog();
      } catch (err) {
        showToast(err.message || 'Failed to deactivate product', 'error');
      }
      return;
    }

    try {
      const res = await productAPI.getProductById(product.id);
      const detail = res.data;
      await adminAPI.updateProduct(product.id, {
        title: detail.title,
        description: detail.description,
        brandId: Number(detail.brandId),
        categoryId: Number(detail.categoryId),
        gender: detail.gender || 'UNISEX',
        basePrice: Number(detail.basePrice),
        discountPercent: detail.discountPercent ?? 0,
        isActive: true,
        isFeatured: Boolean(detail.isFeatured),
        imageUrls: detail.images?.map((img) => img.imageUrl) || [...DEFAULT_IMAGES],
        variants:
          detail.variants?.map((v) => ({
            size: v.size,
            color: v.color,
            colorCode: v.colorCode || '#111827',
            stockQuantity: v.stockQuantity ?? 0,
          })) || [],
      });
      showToast(`Product "${product.title}" reactivated successfully`, 'success');
      fetchCatalog();
    } catch (err) {
      showToast(err.message || 'Failed to reactivate product', 'error');
    }
  };

  const handleAddVariant = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        { size: 'L', color: 'Navy Blue', colorCode: '#1e3a8a', stockQuantity: 20 },
      ],
    }));
  };

  const handleRemoveVariant = (index) => {
    if (formData.variants.length <= 1) {
      showToast('A product must have at least one variant', 'warning');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  const handleVariantChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.variants];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, variants: updated };
    });
  };

  const handleAddImage = () => {
    setFormData((prev) => ({
      ...prev,
      imageUrls: [...prev.imageUrls, ''],
    }));
  };

  const handleRemoveImage = (index) => {
    if (formData.imageUrls.length <= 1) {
      showToast('At least one product image URL is required', 'warning');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, i) => i !== index),
    }));
  };

  const handleImageChange = (index, value) => {
    setFormData((prev) => {
      const updated = [...prev.imageUrls];
      updated[index] = value;
      return { ...prev, imageUrls: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanedImages = formData.imageUrls.map((u) => u.trim()).filter(Boolean);
    if (!formData.title.trim() || !formData.description.trim() || !formData.brandId || !formData.categoryId || !formData.basePrice) {
      showToast('Please fill all required product details', 'warning');
      return;
    }
    if (cleanedImages.length === 0) {
      showToast('Please provide at least one valid product image URL', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        brandId: Number(formData.brandId),
        categoryId: Number(formData.categoryId),
        gender: formData.gender,
        basePrice: parseFloat(formData.basePrice),
        discountPercent: parseInt(formData.discountPercent, 10) || 0,
        isActive: Boolean(formData.isActive),
        isFeatured: Boolean(formData.isFeatured),
        imageUrls: cleanedImages,
        variants: formData.variants.map((v) => ({
          size: v.size.trim(),
          color: v.color.trim(),
          colorCode: v.colorCode || '#000000',
          stockQuantity: parseInt(v.stockQuantity, 10) || 0,
        })),
      };

      if (editingProductId) {
        await adminAPI.updateProduct(editingProductId, payload);
        showToast(`Product "${payload.title}" updated successfully!`, 'success');
      } else {
        await adminAPI.createProduct(payload);
        showToast('New product added to catalog successfully!', 'success');
      }

      setShowModal(false);
      setEditingProductId(null);
      setFormData(buildEmptyForm());
      fetchCatalog();
    } catch (err) {
      showToast(err.message || 'Failed to save product', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight font-serif">
            Products &amp; Catalog
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Manage fashion inventory, pricing, variants, images, and storefront visibility
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search title or brand..."
                className="pl-9 pr-8 py-2 bg-white border border-neutral-200 rounded-xl text-xs w-52 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-xl text-xs font-semibold text-neutral-800 cursor-pointer"
            >
              Find
            </button>
          </form>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={16} /> Add New Product
          </button>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50/70 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-6">Product</th>
                <th className="py-3 px-6">Brand / Category</th>
                <th className="py-3 px-6">Gender</th>
                <th className="py-3 px-6">Base / Sale Price</th>
                <th className="py-3 px-6">Discount</th>
                <th className="py-3 px-6">Visibility</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-neutral-400">
                    <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-neutral-400">
                    No products found. Click "Add New Product" to populate your catalog.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.primaryImageUrl || FALLBACK_IMAGE}
                          alt={product.title}
                          onError={handleImageError}
                          className="w-12 h-14 object-cover rounded-lg bg-neutral-100 border border-neutral-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-neutral-900 truncate max-w-xs">{product.title}</p>
                          <p className="text-[11px] text-neutral-400 font-mono">
                            ID: #{product.id}
                            {product.isFeatured && (
                              <span className="ml-2 inline-flex items-center gap-0.5 text-amber-600 font-sans font-semibold">
                                <Sparkles size={11} /> Featured
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-semibold text-neutral-800">{product.brandName}</p>
                      <p className="text-[11px] text-neutral-500">{product.categoryName}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-medium text-neutral-600">{product.gender}</span>
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-neutral-900">
                        ₹{Number(product.discountedPrice || product.basePrice || 0).toLocaleString('en-IN')}
                      </p>
                      {product.discountPercent > 0 && (
                        <p className="text-[11px] text-neutral-400 line-through">
                          ₹{Number(product.basePrice || 0).toLocaleString('en-IN')}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {product.discountPercent > 0 ? (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-600 font-bold rounded text-[11px]">
                          {product.discountPercent}% OFF
                        </span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {product.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 size={12} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-500 bg-neutral-100 px-2.5 py-0.5 rounded-full">
                          <XCircle size={12} /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(product)}
                          disabled={loadingDetailId === product.id}
                          title="Edit Product"
                          className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(product)}
                          title={product.isActive ? 'Deactivate Product' : 'Reactivate Product'}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            product.isActive
                              ? 'text-neutral-400 hover:text-red-600 hover:bg-red-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {product.isActive ? <Trash2 size={16} /> : <Power size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-neutral-900 font-serif">
                  {editingProductId ? 'Edit Product Details' : 'Add New Product'}
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Configure catalog details, variants, images, pricing, and storefront status
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-700 uppercase mb-1">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Italian Wool Double-Breasted Trench Coat"
                    className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl text-xs focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase mb-1">
                    Brand *
                  </label>
                  <select
                    required
                    value={formData.brandId}
                    onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                    className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl text-xs focus:ring-2 focus:ring-neutral-900 focus:outline-none bg-white"
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {!b.isActive ? '(Inactive)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl text-xs focus:ring-2 focus:ring-neutral-900 focus:outline-none bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {!c.isActive ? '(Inactive)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase mb-1">
                    Gender *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl text-xs focus:ring-2 focus:ring-neutral-900 focus:outline-none bg-white"
                  >
                    <option value="MEN">Men</option>
                    <option value="WOMEN">Women</option>
                    <option value="UNISEX">Unisex</option>
                    <option value="KIDS">Kids</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 uppercase mb-1">
                      Base Price (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      value={formData.basePrice}
                      onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                      placeholder="4999"
                      className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl text-xs focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 uppercase mb-1">
                      Discount %
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="90"
                      value={formData.discountPercent}
                      onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                      className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl text-xs focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-700 uppercase mb-1">
                    Description *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Crafted from premium sustainable fibres with precision tailoring..."
                    className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl text-xs focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2 flex flex-wrap items-center gap-6">
                  <label htmlFor="isFeatured" className="flex items-center gap-2 text-xs font-semibold text-neutral-800">
                    <input
                      type="checkbox"
                      id="isFeatured"
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                      className="w-4 h-4 text-neutral-900 rounded border-neutral-300"
                    />
                    Feature on homepage &amp; trending rows
                  </label>

                  {editingProductId && (
                    <label htmlFor="isActive" className="flex items-center gap-2 text-xs font-semibold text-neutral-800">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-4 h-4 text-neutral-900 rounded border-neutral-300"
                      />
                      Active &amp; visible in storefront catalog
                    </label>
                  )}
                </div>
              </div>

              {/* Images Section */}
              <div className="border-t border-neutral-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                    Product Images (Image URLs)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddImage}
                    className="text-xs text-rose-600 font-semibold hover:underline"
                  >
                    + Add Another Image URL
                  </button>
                </div>
                {formData.imageUrls.map((url, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      required={idx === 0}
                      value={url}
                      onChange={(e) => handleImageChange(idx, e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="flex-1 px-3.5 py-2 border border-neutral-300 rounded-xl text-xs focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                    />
                    {url && (
                      <img
                        src={url}
                        alt="Preview"
                        onError={handleImageError}
                        className="w-8 h-8 rounded object-cover border border-neutral-200 shrink-0"
                      />
                    )}
                    {formData.imageUrls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="p-1 text-neutral-400 hover:text-red-500"
                        title="Remove image"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Variants Section */}
              <div className="border-t border-neutral-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                    Size &amp; Color Variants
                  </label>
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="text-xs text-rose-600 font-semibold hover:underline"
                  >
                    + Add Variant
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.variants.map((v, idx) => (
                    <div
                      key={v.id || idx}
                      className="grid grid-cols-12 gap-2 items-center bg-neutral-50 p-2.5 rounded-xl border border-neutral-200"
                    >
                      <div className="col-span-3">
                        <input
                          type="text"
                          placeholder="Size (e.g. M)"
                          required
                          value={v.size}
                          onChange={(e) => handleVariantChange(idx, 'size', e.target.value)}
                          className="w-full px-2 py-1.5 border border-neutral-300 rounded-lg text-xs"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          placeholder="Color (e.g. Black)"
                          required
                          value={v.color}
                          onChange={(e) => handleVariantChange(idx, 'color', e.target.value)}
                          className="w-full px-2 py-1.5 border border-neutral-300 rounded-lg text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="color"
                          value={v.colorCode}
                          onChange={(e) => handleVariantChange(idx, 'colorCode', e.target.value)}
                          className="w-full h-8 p-0.5 border border-neutral-300 rounded-lg cursor-pointer"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          placeholder="Stock"
                          min="0"
                          required
                          value={v.stockQuantity}
                          onChange={(e) =>
                            handleVariantChange(idx, 'stockQuantity', e.target.value)
                          }
                          className="w-full px-2 py-1.5 border border-neutral-300 rounded-lg text-xs"
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(idx)}
                          className="text-neutral-400 hover:text-red-500"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  {submitting
                    ? editingProductId
                      ? 'Updating Product...'
                      : 'Creating Product...'
                    : editingProductId
                    ? 'Save Changes'
                    : 'Save & Publish Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
