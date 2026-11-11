import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productAPI } from '../services/api';
import { ProductCard } from '../components/ProductCard';
import { Filter, SlidersHorizontal, X, ChevronDown, RotateCcw } from 'lucide-react';

export const ProductListingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Active filter states from URL search params
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const brand = searchParams.get('brand') || '';
  const gender = searchParams.get('gender') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const sortBy = searchParams.get('sortBy') || 'newest';
  const page = parseInt(searchParams.get('page') || '0', 10);

  const availableSizesList = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'UK 8', 'UK 9', 'UK 10', 'Free Size'];
  const availableColorsList = [
    { name: 'Pure White', hex: '#FFFFFF' },
    { name: 'Jet Black', hex: '#09090B' },
    { name: 'Raw Indigo', hex: '#1E3A8A' },
    { name: 'Deep Navy', hex: '#0F172A' },
    { name: 'Tactical Olive', hex: '#3F4E2F' },
    { name: 'Burgundy Maroon', hex: '#881337' },
    { name: 'Sand Khaki', hex: '#D4B996' },
  ];

  const selectedSizes = searchParams.getAll('sizes');
  const selectedColors = searchParams.getAll('colors');

  const [minPriceInput, setMinPriceInput] = useState(minPrice);
  const [maxPriceInput, setMaxPriceInput] = useState(maxPrice);

  useEffect(() => {
    setMinPriceInput(minPrice);
    setMaxPriceInput(maxPrice);
  }, [minPrice, maxPrice]);

  const updateFilters = (newParams) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '') {
        nextParams.delete(key);
      } else if (Array.isArray(val)) {
        nextParams.delete(key);
        val.forEach((item) => nextParams.append(key, item));
      } else {
        nextParams.set(key, val);
      }
    });
    if (!Object.prototype.hasOwnProperty.call(newParams, 'page')) {
      nextParams.set('page', '0'); // reset to first page only on filter/sort change
    }
    setSearchParams(nextParams);
  };

  const applyPriceRange = (e) => {
    e?.preventDefault();
    updateFilters({
      minPrice: minPriceInput.trim(),
      maxPrice: maxPriceInput.trim(),
    });
  };

  const handleClearAll = () => {
    setSearchParams(new URLSearchParams());
  };

  const toggleSize = (size) => {
    const current = [...selectedSizes];
    const index = current.indexOf(size);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(size);
    }
    updateFilters({ sizes: current });
  };

  const toggleColor = (color) => {
    const current = [...selectedColors];
    const index = current.indexOf(color);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(color);
    }
    updateFilters({ colors: current });
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        search: search || undefined,
        category: category || undefined,
        brand: brand || undefined,
        gender: gender || undefined,
        minPrice: minPrice || undefined,
        maxPrice: maxPrice || undefined,
        sizes: selectedSizes.length > 0 ? selectedSizes : undefined,
        colors: selectedColors.length > 0 ? selectedColors : undefined,
        sortBy,
        page,
        size: 12,
      };

      const res = await productAPI.getProducts(params);
      const data = res.data;
      setProducts(data.content || []);
      setTotalPages(data.totalPages || 1);
      setTotalElements(data.totalElements || 0);
    } catch (err) {
      console.error('Error fetching catalog', err);
    } finally {
      setLoading(false);
    }
  }, [search, category, brand, gender, minPrice, maxPrice, selectedSizes.join(','), selectedColors.join(','), sortBy, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [catRes, brandRes] = await Promise.all([
          productAPI.getCategories(),
          productAPI.getBrands(),
        ]);
        setCategories(catRes.data || []);
        setBrands(brandRes.data || []);
      } catch (err) {
        console.error('Failed to load filter metadata', err);
      }
    };
    fetchMetadata();
  }, []);

  const activeFiltersCount =
    (category ? 1 : 0) +
    (brand ? 1 : 0) +
    (gender ? 1 : 0) +
    (minPrice || maxPrice ? 1 : 0) +
    selectedSizes.length +
    selectedColors.length +
    (search ? 1 : 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Breadcrumb & Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-1">
            <span>Home</span>
            <span>/</span>
            <span className="text-slate-900 font-bold">Catalog</span>
            {search && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold">
              Search: &ldquo;{search}&rdquo;
              <button onClick={() => updateFilters({ search: '' })}><X className="w-3.5 h-3.5" /></button>
            </span>
          )}
          {(minPrice || maxPrice) && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold">
              Price: ₹{minPrice || '0'} – {maxPrice ? `₹${maxPrice}` : 'Any'}
              <button onClick={() => updateFilters({ minPrice: '', maxPrice: '' })}><X className="w-3.5 h-3.5" /></button>
            </span>
          )}
          {category && (
              <>
                <span>/</span>
                <span className="text-rose-600 font-bold capitalize">{category.replace('-', ' ')}</span>
              </>
            )}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {search ? `Search results for "${search}"` : category ? `${category.replace('-', ' ').toUpperCase()} COLLECTION` : 'All Apparel & Footwear'}
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Showing <strong className="text-slate-900 font-bold">{totalElements}</strong> items matching your preferences
          </p>
        </div>

        {/* Top Right Controls: Sort & Mobile Filter Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white shadow-sm"
          >
            <Filter className="w-4 h-4 text-rose-600" />
            <span>Filters ({activeFiltersCount})</span>
          </button>

          {/* Sort By Dropdown */}
          <div className="relative flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => updateFilters({ sortBy: e.target.value })}
              className="bg-white border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-800 rounded-xl px-4 py-2.5 pr-8 focus:outline-none focus:border-rose-600 shadow-sm transition-colors cursor-pointer appearance-none"
            >
              <option value="newest">Newest Arrivals</option>
              <option value="popularity">Popularity / Best Selling</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Highest Customer Rating</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Active Filter Pills Bar */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Active:</span>
          {search && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold">
              Search: &ldquo;{search}&rdquo;
              <button onClick={() => updateFilters({ search: '' })}><X className="w-3.5 h-3.5" /></button>
            </span>
          )}
          {(minPrice || maxPrice) && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold">
              Price: ₹{minPrice || '0'} – {maxPrice ? `₹${maxPrice}` : 'Any'}
              <button onClick={() => updateFilters({ minPrice: '', maxPrice: '' })}><X className="w-3.5 h-3.5" /></button>
            </span>
          )}
          {category && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold">
              Category: {category}
              <button onClick={() => updateFilters({ category: '' })}><X className="w-3.5 h-3.5" /></button>
            </span>
          )}
          {brand && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold">
              Brand: {brand}
              <button onClick={() => updateFilters({ brand: '' })}><X className="w-3.5 h-3.5" /></button>
            </span>
          )}
          {gender && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold">
              Gender: {gender}
              <button onClick={() => updateFilters({ gender: '' })}><X className="w-3.5 h-3.5" /></button>
            </span>
          )}
          {selectedSizes.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold">
              Size: {s}
              <button onClick={() => toggleSize(s)}><X className="w-3.5 h-3.5" /></button>
            </span>
          ))}
          {selectedColors.map((c) => (
            <span key={c} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold">
              Color: {c}
              <button onClick={() => toggleColor(c)}><X className="w-3.5 h-3.5" /></button>
            </span>
          ))}
          <button
            onClick={handleClearAll}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 underline ml-2 flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Clear All Filters
          </button>
        </div>
      )}

      {/* Main Grid Layout: Left Rail Filters + Right Product Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Desktop Left-Rail Filters */}
        <aside className="hidden lg:block space-y-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-fit sticky top-28">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-display text-sm font-bold tracking-wider uppercase text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-rose-600" /> Filter Selection
            </h3>
            {activeFiltersCount > 0 && (
              <button onClick={handleClearAll} className="text-[11px] font-bold text-rose-600 hover:underline">
                Reset
              </button>
            )}
          </div>

          {/* Gender Filter */}
          <div className="space-y-2 border-b border-slate-100 pb-5">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">Gender</h4>
            <div className="space-y-1.5 text-xs font-medium text-slate-700">
              {['ALL', 'MEN', 'WOMEN', 'KIDS'].map((g) => (
                <label key={g} className="flex items-center gap-2.5 cursor-pointer hover:text-black">
                  <input
                    type="radio"
                    name="gender"
                    checked={(gender || 'ALL') === g}
                    onChange={() => updateFilters({ gender: g === 'ALL' ? '' : g })}
                    className="accent-rose-600 w-3.5 h-3.5"
                  />
                  <span>{g === 'ALL' ? 'All Genders' : g}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div className="space-y-2 border-b border-slate-100 pb-5">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">Categories</h4>
            <div className="space-y-1.5 text-xs font-medium text-slate-700 max-h-48 overflow-y-auto pr-2">
              <label className="flex items-center gap-2.5 cursor-pointer hover:text-black">
                <input
                  type="radio"
                  name="category"
                  checked={!category}
                  onChange={() => updateFilters({ category: '' })}
                  className="accent-rose-600 w-3.5 h-3.5"
                />
                <span>All Categories</span>
              </label>
              {categories.map((cat) => (
                <label key={cat.id} className="flex items-center gap-2.5 cursor-pointer hover:text-black">
                  <input
                    type="radio"
                    name="category"
                    checked={category === cat.slug}
                    onChange={() => updateFilters({ category: cat.slug })}
                    className="accent-rose-600 w-3.5 h-3.5"
                  />
                  <span>{cat.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Brand Filter */}
          <div className="space-y-2 border-b border-slate-100 pb-5">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">Brands</h4>
            <div className="space-y-1.5 text-xs font-medium text-slate-700 max-h-48 overflow-y-auto pr-2">
              <label className="flex items-center gap-2.5 cursor-pointer hover:text-black">
                <input
                  type="radio"
                  name="brand"
                  checked={!brand}
                  onChange={() => updateFilters({ brand: '' })}
                  className="accent-rose-600 w-3.5 h-3.5"
                />
                <span>All Brands</span>
              </label>
              {brands.map((b) => (
                <label key={b.id} className="flex items-center gap-2.5 cursor-pointer hover:text-black">
                  <input
                    type="radio"
                    name="brand"
                    checked={brand === b.slug}
                    onChange={() => updateFilters({ brand: b.slug })}
                    className="accent-rose-600 w-3.5 h-3.5"
                  />
                  <span>{b.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Size Filter Pills */}
          <div className="space-y-2 border-b border-slate-100 pb-5">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">Sizes</h4>
            <div className="flex flex-wrap gap-1.5">
              {availableSizesList.map((s) => {
                const isSelected = selectedSizes.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSize(s)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price Range Filter */}
          <div className="space-y-3 border-b border-slate-100 pb-5">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">Price Range (₹)</h4>
            <form onSubmit={applyPriceRange} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Min ₹"
                  value={minPriceInput}
                  onChange={(e) => setMinPriceInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-rose-600"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Max ₹"
                  value={maxPriceInput}
                  onChange={(e) => setMaxPriceInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-rose-600"
                />
              </div>
              <button
                type="submit"
                className="w-full py-1.5 bg-slate-950 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors"
              >
                Apply Price
              </button>
            </form>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { label: 'Under ₹2k', min: '', max: '2000' },
                { label: '₹2k–₹5k', min: '2000', max: '5000' },
                { label: 'Over ₹5k', min: '5000', max: '' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => updateFilters({ minPrice: preset.min, maxPrice: preset.max })}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-colors ${
                    minPrice === preset.min && maxPrice === preset.max
                      ? 'bg-rose-50 text-rose-700 border-rose-500'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color Filter Swatches */}
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">Colours</h4>
            <div className="space-y-2">
              {availableColorsList.map((c) => {
                const isSelected = selectedColors.includes(c.name);
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => toggleColor(c.name)}
                    className={`w-full flex items-center justify-between p-1.5 rounded-lg border text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-rose-600 bg-rose-50/50 font-bold text-rose-950'
                        : 'border-transparent hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-full border border-slate-300 shadow-inner"
                        style={{ backgroundColor: c.hex }}
                      ></span>
                      <span>{c.name}</span>
                    </div>
                    {isSelected && <span className="text-rose-600 text-xs">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Right Product Grid */}
        <div className="lg:col-span-3 space-y-8">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-slate-100 rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="py-20 text-center space-y-4 bg-slate-50 rounded-2xl border border-slate-200 p-8">
              <p className="text-slate-400 text-4xl">🔍</p>
              <h3 className="font-display text-xl font-bold text-slate-900">No matching apparel found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                We couldn't find items matching your active filter criteria. Try clearing some filters or searching with a different term.
              </p>
              <button
                onClick={handleClearAll}
                className="px-6 py-2.5 bg-slate-950 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-800 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-8 border-t border-slate-100">
                  <button
                    disabled={page === 0}
                    onClick={() => updateFilters({ page: (page - 1).toString() })}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    Previous
                  </button>

                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => updateFilters({ page: i.toString() })}
                      className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                        i === page
                          ? 'bg-slate-950 text-white shadow-md'
                          : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}

                  <button
                    disabled={page >= totalPages - 1}
                    onClick={() => updateFilters({ page: (page + 1).toString() })}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile Drawer Filter Dialog */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileFilterOpen(false)}></div>
          <div className="relative ml-auto w-full max-w-xs bg-white h-full p-6 overflow-y-auto space-y-6 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="font-display text-base font-bold text-slate-900">Filters</h3>
                <button onClick={() => setIsMobileFilterOpen(false)}><X className="w-5 h-5 text-slate-500" /></button>
              </div>

              {/* Mobile Filter Options */}
              <div className="pt-4 space-y-6">
                <div>
                  <h4 className="text-xs font-extrabold uppercase text-slate-900 mb-2">Gender</h4>
                  <select
                    value={gender}
                    onChange={(e) => updateFilters({ gender: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium"
                  >
                    <option value="">All Genders</option>
                    <option value="MEN">Men</option>
                    <option value="WOMEN">Women</option>
                    <option value="KIDS">Kids</option>
                  </select>
                </div>

                <div>
                  <h4 className="text-xs font-extrabold uppercase text-slate-900 mb-2">Category</h4>
                  <select
                    value={category}
                    onChange={(e) => updateFilters({ category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium"
                  >
                    <option value="">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <h4 className="text-xs font-extrabold uppercase text-slate-900 mb-2">Brand</h4>
                  <select
                    value={brand}
                    onChange={(e) => updateFilters({ brand: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium"
                  >
                    <option value="">All Brands</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.slug}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <h4 className="text-xs font-extrabold uppercase text-slate-900 mb-2">Price Range (₹)</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="0"
                      placeholder="Min ₹"
                      value={minPriceInput}
                      onChange={(e) => setMinPriceInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium"
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder="Max ₹"
                      value={maxPriceInput}
                      onChange={(e) => setMaxPriceInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium"
                    />
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-extrabold uppercase text-slate-900 mb-2">Sizes</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {availableSizesList.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSize(s)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                          selectedSizes.includes(s)
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                updateFilters({ minPrice: minPriceInput.trim(), maxPrice: maxPriceInput.trim() });
                setIsMobileFilterOpen(false);
              }}
              className="w-full py-3 bg-slate-950 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md"
            >
              Apply & Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
