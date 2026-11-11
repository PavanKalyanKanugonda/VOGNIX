import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BannerCarousel } from '../components/BannerCarousel';
import { ProductCard } from '../components/ProductCard';
import { productAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { FALLBACK_IMAGE, handleImageError } from '../utils/imageFallback';
import { ArrowRight, TrendingUp, Tag, Zap } from 'lucide-react';

export const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [featRes, catRes] = await Promise.all([
          productAPI.getFeatured(),
          productAPI.getCategories(),
        ]);
        setFeaturedProducts(featRes.data || []);
        setCategories(catRes.data || []);
      } catch (err) {
        console.error('Failed to load homepage data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const promoCards = [
    {
      title: 'FIRST ORDER REWARD',
      discount: 'FLAT ₹500 OFF',
      code: 'FIRST500',
      desc: 'On orders above ₹2,999 for all newly registered connoisseurs.',
      bgColor: 'from-zinc-900 to-zinc-800',
    },
    {
      title: 'FESTIVE EDIT',
      discount: 'EXTRA 20% OFF',
      code: 'FESTIVE20',
      desc: 'Applicable on premium couture and tailoring above ₹4,999.',
      bgColor: 'from-rose-950 to-zinc-900',
    },
    {
      title: 'EVERYDAY PRIVILEGE',
      discount: '10% INSTANT',
      code: 'VOGNIX10',
      desc: 'Save on your complete cart across any category above ₹1,499.',
      bgColor: 'from-slate-900 to-zinc-950',
    },
  ];

  const brandShowcase = [
    { name: 'VOGNIX Luxe', slug: 'vognix-luxe', image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=80', desc: 'Sartorial Couture & Silk Wraps' },
    { name: 'Noir & Blanc', slug: 'noir-et-blanc', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80', desc: 'Monochromatic European Tailoring' },
    { name: 'Urban Thread', slug: 'urban-thread', image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=600&q=80', desc: 'Selvedge Denim & Heavyweight Fleece' },
    { name: 'SoleFlex', slug: 'soleflex', image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=600&q=80', desc: 'Cloud Foam Runners & Brogues' },
  ];

  return (
    <div className="space-y-16 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      
      {/* 1. Hero Animated Banner Carousel */}
      <BannerCarousel />

      {/* 2. Visual Category Discovery Strip */}
      <section className="space-y-6">
        <div className="flex items-end justify-between border-b border-slate-100 pb-4">
          <div>
            <span className="text-rose-600 font-extrabold text-[11px] tracking-widest uppercase">DISCOVER BY AISLE</span>
            <h2 className="font-display text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Shop by Category</h2>
          </div>
          <Link to="/products" className="text-xs font-bold text-slate-800 hover:text-rose-600 flex items-center gap-1 transition-colors">
            View All Categories <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/products?category=${cat.slug}`}
              className="group flex flex-col items-center text-center p-4 rounded-2xl border border-slate-100 hover:border-slate-300 hover:shadow-premium bg-white transition-all duration-300"
            >
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-slate-100 mb-3 group-hover:scale-105 transition-transform duration-500 shadow-inner">
                <img
                  src={cat.imageUrl || FALLBACK_IMAGE}
                  alt={cat.name}
                  onError={handleImageError}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-xs font-extrabold text-slate-900 group-hover:text-rose-600 transition-colors uppercase tracking-wider">
                {cat.name}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{cat.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Promotional Promo Vouchers */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {promoCards.map((promo, idx) => (
          <div
            key={idx}
            className={`p-6 rounded-2xl bg-gradient-to-br ${promo.bgColor} text-white shadow-card flex flex-col justify-between border border-white/10`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-rose-400" />
                  {promo.title}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(promo.code);
                    showToast(`Copied coupon ${promo.code}! Apply it in your Shopping Bag.`, 'success');
                  }}
                  title="Copy coupon code"
                  className="px-2.5 py-1 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg text-xs font-mono font-bold tracking-wider text-rose-300 border border-white/10 transition-colors cursor-pointer"
                >
                  {promo.code}
                </button>
              </div>
              <h3 className="font-display text-2xl font-black mt-3 tracking-tight">{promo.discount}</h3>
              <p className="text-xs text-zinc-300 mt-2 leading-relaxed">{promo.desc}</p>
            </div>
            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-bold">
              <span className="text-zinc-400 text-[11px]">Click code to copy & apply in bag</span>
              <Link to="/products" className="text-white hover:text-rose-400 flex items-center gap-1 transition-colors">
                Shop Now <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </section>

      {/* 4. Trending & Featured Collection */}
      <section className="space-y-6">
        <div className="flex items-end justify-between border-b border-slate-100 pb-4">
          <div>
            <span className="text-rose-600 font-extrabold text-[11px] tracking-widest uppercase flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> CURATED SELECTIONS
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Trending & Best Sellers</h2>
          </div>
          <Link to="/products?sortBy=popularity" className="text-xs font-bold text-slate-800 hover:text-rose-600 flex items-center gap-1 transition-colors">
            View All ({featuredProducts.length}+ styles) <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-slate-100 rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {featuredProducts.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 5. Brand Heritage Showcase */}
      <section className="space-y-6">
        <div className="flex items-end justify-between border-b border-slate-100 pb-4">
          <div>
            <span className="text-rose-600 font-extrabold text-[11px] tracking-widest uppercase">ATELIER DIRECT</span>
            <h2 className="font-display text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Our Designer Labels</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {brandShowcase.map((brand, i) => (
            <Link
              key={i}
              to={`/products?brand=${brand.slug}`}
              className="group relative rounded-2xl overflow-hidden aspect-[4/5] bg-zinc-900 text-white shadow-card block"
            >
              <img
                src={brand.image || FALLBACK_IMAGE}
                alt={brand.name}
                onError={handleImageError}
                className="w-full h-full object-cover filter brightness-[0.5] group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent p-6 flex flex-col justify-end">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-400">SIGNATURE BRAND</span>
                <h3 className="font-display text-xl font-bold mt-1 text-white group-hover:text-rose-300 transition-colors">{brand.name}</h3>
                <p className="text-xs text-zinc-300 mt-1">{brand.desc}</p>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-white group-hover:translate-x-1 transition-transform">
                  Shop Collection <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 6. VOGNIX Distinction Banner */}
      <section className="p-8 sm:p-12 rounded-3xl bg-slate-50 border border-slate-200 text-center space-y-4">
        <span className="text-rose-600 font-extrabold text-xs tracking-widest uppercase inline-flex items-center gap-1.5">
          <Zap className="w-4 h-4 fill-rose-600" /> THE VOGNIX STANDARD
        </span>
        <h2 className="font-display text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Where Contemporary Fashion Meets Uncompromised Quality
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Every piece in our catalog undergoes rigorous craftsmanship scrutiny. Enjoy authentic designer silhouettes, premium handpicked materials, verified size fittings, and lightning fast dispatch.
        </p>
        <div className="pt-2">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-8 py-4 bg-slate-950 hover:bg-slate-800 text-white text-xs font-extrabold uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95"
          >
            EXPLORE THE FULL CATALOG <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

    </div>
  );
};
