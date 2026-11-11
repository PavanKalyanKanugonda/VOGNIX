import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { FALLBACK_IMAGE, handleImageError } from '../../utils/imageFallback';
import {
  FolderTree,
  Award,
  Plus,
  Edit,
  Power,
  CheckCircle2,
  XCircle,
  X,
} from 'lucide-react';

export default function AdminCategoriesPage() {
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'brands'
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  // Category Modal State
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [catForm, setCatForm] = useState({
    name: '',
    slug: '',
    description: '',
    imageUrl: '',
    parentId: '',
    isActive: true,
  });

  // Brand Modal State
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [editingBrandId, setEditingBrandId] = useState(null);
  const [brandForm, setBrandForm] = useState({
    name: '',
    slug: '',
    logoUrl: '',
    description: '',
    isActive: true,
  });

  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes, brandRes] = await Promise.all([
        adminAPI.getCategories(),
        adminAPI.getBrands(),
      ]);
      setCategories(catRes.data || []);
      setBrands(brandRes.data || []);
    } catch (err) {
      showToast(err.message || 'Failed to load categories and brands', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const categoryNameById = categories.reduce((acc, c) => {
    acc[c.id] = c.name;
    return acc;
  }, {});

  // Category Handlers
  const openCreateCategory = () => {
    setEditingCatId(null);
    setCatForm({
      name: '',
      slug: '',
      description: '',
      imageUrl: '',
      parentId: '',
      isActive: true,
    });
    setShowCatModal(true);
  };

  const openEditCategory = (cat) => {
    setEditingCatId(cat.id);
    setCatForm({
      name: cat.name || '',
      slug: cat.slug || '',
      description: cat.description || '',
      imageUrl: cat.imageUrl || '',
      parentId: cat.parentId ? String(cat.parentId) : '',
      isActive: cat.isActive !== false,
    });
    setShowCatModal(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!catForm.name.trim()) {
      showToast('Category name is required', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: catForm.name.trim(),
        slug: catForm.slug.trim() || undefined,
        description: catForm.description.trim() || undefined,
        imageUrl: catForm.imageUrl.trim() || undefined,
        parentId: catForm.parentId ? Number(catForm.parentId) : null,
        isActive: Boolean(catForm.isActive),
      };
      if (editingCatId) {
        await adminAPI.updateCategory(editingCatId, payload);
        showToast(`Category "${payload.name}" updated successfully`, 'success');
      } else {
        await adminAPI.createCategory(payload);
        showToast(`Category "${payload.name}" created successfully`, 'success');
      }
      setShowCatModal(false);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to save category', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleCategory = async (cat) => {
    try {
      if (cat.isActive) {
        await adminAPI.deleteCategory(cat.id);
        showToast(`Category "${cat.name}" deactivated`, 'info');
      } else {
        await adminAPI.updateCategory(cat.id, {
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          imageUrl: cat.imageUrl,
          parentId: cat.parentId || null,
          isActive: true,
        });
        showToast(`Category "${cat.name}" reactivated`, 'success');
      }
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to update category status', 'error');
    }
  };

  // Brand Handlers
  const openCreateBrand = () => {
    setEditingBrandId(null);
    setBrandForm({
      name: '',
      slug: '',
      logoUrl: '',
      description: '',
      isActive: true,
    });
    setShowBrandModal(true);
  };

  const openEditBrand = (brand) => {
    setEditingBrandId(brand.id);
    setBrandForm({
      name: brand.name || '',
      slug: brand.slug || '',
      logoUrl: brand.logoUrl || '',
      description: brand.description || '',
      isActive: brand.isActive !== false,
    });
    setShowBrandModal(true);
  };

  const handleSaveBrand = async (e) => {
    e.preventDefault();
    if (!brandForm.name.trim()) {
      showToast('Brand name is required', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: brandForm.name.trim(),
        slug: brandForm.slug.trim() || undefined,
        logoUrl: brandForm.logoUrl.trim() || undefined,
        description: brandForm.description.trim() || undefined,
        isActive: Boolean(brandForm.isActive),
      };
      if (editingBrandId) {
        await adminAPI.updateBrand(editingBrandId, payload);
        showToast(`Brand "${payload.name}" updated successfully`, 'success');
      } else {
        await adminAPI.createBrand(payload);
        showToast(`Brand "${payload.name}" created successfully`, 'success');
      }
      setShowBrandModal(false);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to save brand', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleBrand = async (brand) => {
    try {
      await adminAPI.updateBrand(brand.id, {
        name: brand.name,
        slug: brand.slug,
        logoUrl: brand.logoUrl,
        description: brand.description,
        isActive: !brand.isActive,
      });
      showToast(
        `Brand "${brand.name}" ${brand.isActive ? 'deactivated' : 'activated'}`,
        'success'
      );
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to update brand status', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight font-serif">
            Categories &amp; Brands
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Organize storefront taxonomy hierarchies and official designer labels
          </p>
        </div>

        <button
          onClick={activeTab === 'categories' ? openCreateCategory : openCreateBrand}
          className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus size={16} />
          {activeTab === 'categories' ? 'Add Category' : 'Add Brand'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-neutral-200 w-fit text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          <FolderTree size={15} />
          Categories ({categories.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('brands')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all cursor-pointer ${
            activeTab === 'brands'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          <Award size={15} />
          Brands ({brands.length})
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
        {activeTab === 'categories' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50/70 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-6">Category</th>
                  <th className="py-3 px-6">Slug</th>
                  <th className="py-3 px-6">Parent Category</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-neutral-400">
                      <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Loading categories...
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-neutral-400">
                      No categories configured yet.
                    </td>
                  </tr>
                ) : (
                  categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <img
                            src={cat.imageUrl || FALLBACK_IMAGE}
                            alt={cat.name}
                            onError={handleImageError}
                            className="w-10 h-10 object-cover rounded-lg border border-neutral-200 bg-neutral-100 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-neutral-900">{cat.name}</p>
                            <p className="text-[11px] text-neutral-500 truncate max-w-xs">
                              {cat.description || '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-6 font-mono text-neutral-600">{cat.slug}</td>
                      <td className="py-3.5 px-6 text-neutral-700">
                        {cat.parentId ? categoryNameById[cat.parentId] || `#${cat.parentId}` : 'Top Level'}
                      </td>
                      <td className="py-3.5 px-6">
                        {cat.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 size={12} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-500 bg-neutral-100 px-2.5 py-0.5 rounded-full">
                            <XCircle size={12} /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditCategory(cat)}
                            title="Edit Category"
                            className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            onClick={() => handleToggleCategory(cat)}
                            title={cat.isActive ? 'Deactivate Category' : 'Activate Category'}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              cat.isActive
                                ? 'text-neutral-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            <Power size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50/70 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-6">Brand</th>
                  <th className="py-3 px-6">Slug</th>
                  <th className="py-3 px-6">Description</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-neutral-400">
                      <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Loading brands...
                    </td>
                  </tr>
                ) : brands.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-neutral-400">
                      No brands configured yet.
                    </td>
                  </tr>
                ) : (
                  brands.map((brand) => (
                    <tr key={brand.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          {brand.logoUrl ? (
                            <img
                              src={brand.logoUrl}
                              alt={brand.name}
                              onError={handleImageError}
                              className="w-9 h-9 object-contain rounded-lg border border-neutral-200 bg-white p-1 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-neutral-900 text-white font-serif font-bold flex items-center justify-center shrink-0">
                              {brand.name?.[0] || 'B'}
                            </div>
                          )}
                          <span className="font-bold text-neutral-900">{brand.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-6 font-mono text-neutral-600">{brand.slug}</td>
                      <td className="py-3.5 px-6 text-neutral-600 max-w-sm truncate">
                        {brand.description || '—'}
                      </td>
                      <td className="py-3.5 px-6">
                        {brand.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 size={12} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-500 bg-neutral-100 px-2.5 py-0.5 rounded-full">
                            <XCircle size={12} /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditBrand(brand)}
                            title="Edit Brand"
                            className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            onClick={() => handleToggleBrand(brand)}
                            title={brand.isActive ? 'Deactivate Brand' : 'Activate Brand'}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              brand.isActive
                                ? 'text-neutral-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            <Power size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Category Modal */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h2 className="text-lg font-bold text-neutral-900 font-serif">
                {editingCatId ? 'Edit Category' : 'Add New Category'}
              </h2>
              <button onClick={() => setShowCatModal(false)} className="text-neutral-400 hover:text-neutral-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 uppercase mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  placeholder="e.g. Designer Outerwear"
                  className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 uppercase mb-1">
                    URL Slug (Optional)
                  </label>
                  <input
                    type="text"
                    value={catForm.slug}
                    onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })}
                    placeholder="auto-generated if blank"
                    className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl font-mono focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 uppercase mb-1">
                    Parent Category
                  </label>
                  <select
                    value={catForm.parentId}
                    onChange={(e) => setCatForm({ ...catForm, parentId: e.target.value })}
                    className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl bg-white focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                  >
                    <option value="">None (Top Level)</option>
                    {categories
                      .filter((c) => c.id !== editingCatId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 uppercase mb-1">
                  Banner Image URL
                </label>
                <input
                  type="text"
                  value={catForm.imageUrl}
                  onChange={(e) => setCatForm({ ...catForm, imageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={catForm.description}
                  onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                  placeholder="Curated jackets, blazers, and luxury seasonal layers"
                  className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 font-semibold text-neutral-800">
                <input
                  type="checkbox"
                  checked={catForm.isActive}
                  onChange={(e) => setCatForm({ ...catForm, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-neutral-300"
                />
                Category visible on storefront
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-xl font-semibold text-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Brand Modal */}
      {showBrandModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h2 className="text-lg font-bold text-neutral-900 font-serif">
                {editingBrandId ? 'Edit Brand' : 'Add New Brand'}
              </h2>
              <button onClick={() => setShowBrandModal(false)} className="text-neutral-400 hover:text-neutral-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveBrand} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 uppercase mb-1">
                    Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={brandForm.name}
                    onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                    placeholder="e.g. VOGNIX ATELIER"
                    className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 uppercase mb-1">
                    URL Slug (Optional)
                  </label>
                  <input
                    type="text"
                    value={brandForm.slug}
                    onChange={(e) => setBrandForm({ ...brandForm, slug: e.target.value })}
                    placeholder="auto-generated if blank"
                    className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl font-mono focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 uppercase mb-1">
                  Logo URL
                </label>
                <input
                  type="text"
                  value={brandForm.logoUrl}
                  onChange={(e) => setBrandForm({ ...brandForm, logoUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={brandForm.description}
                  onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })}
                  placeholder="Contemporary luxury tailoring and artisanal collections"
                  className="w-full px-3.5 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 font-semibold text-neutral-800">
                <input
                  type="checkbox"
                  checked={brandForm.isActive}
                  onChange={(e) => setBrandForm({ ...brandForm, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-neutral-300"
                />
                Brand active on storefront
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowBrandModal(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-xl font-semibold text-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Brand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
