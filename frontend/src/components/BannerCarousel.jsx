import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import gsap from 'gsap';
import { handleImageError } from '../utils/imageFallback';

export const BannerCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideRef = useRef(null);

  const banners = [
    {
      id: 1,
      tagline: 'AUTUMN / WINTER 2026',
      headline: 'The Grand Runway Collection',
      subtext: 'Bespoke tailoring, fine Egyptian cottons, and pure silk wraps designed for uncompromising luxury.',
      ctaText: 'EXPLORE MEN & WOMEN',
      link: '/products',
      imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80',
      badge: 'NEW SEASON ARRIVALS',
    },
    {
      id: 2,
      tagline: 'METROPOLITAN ATHLEISURE',
      headline: 'Architectural Footwear & Street Layers',
      subtext: 'Engineered nitrogen cloud foam runners and 450 GSM French terry streetwear hoodies.',
      ctaText: 'DISCOVER SNEAKERS',
      link: '/products?category=footwear',
      imageUrl: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1600&q=80',
      badge: 'FLAT 25% OFF',
    },
    {
      id: 3,
      tagline: 'CURATED ACCESSORIES',
      headline: 'Precision Watches & Top-Grain Leather',
      subtext: 'Japanese sapphire automatic chronographs and handcrafted vegetable-tanned travel luggage.',
      ctaText: 'SHOP ACCESSORIES',
      link: '/products?category=accessories-watches',
      imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1600&q=80',
      badge: 'LIMITED EDITION',
    },
  ];

  // GSAP animation on slide change
  useEffect(() => {
    if (slideRef.current) {
      gsap.fromTo(
        slideRef.current.querySelectorAll('.animate-elem'),
        { opacity: 0, y: 25 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: 'power2.out' }
      );
    }
  }, [currentSlide]);

  // Auto advance slide every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const activeBanner = banners[currentSlide];

  return (
    <div className="relative w-full overflow-hidden bg-zinc-950 text-white rounded-3xl shadow-premium">
      <div ref={slideRef} className="relative h-[480px] sm:h-[540px] lg:h-[600px] flex items-center">
        {/* Background Image with Dark Vignette Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={activeBanner.imageUrl}
            alt={activeBanner.headline}
            onError={handleImageError}
            className="w-full h-full object-cover object-center filter brightness-[0.45] transition-all duration-1000 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/70 to-transparent"></div>
        </div>

        {/* Banner Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 w-full">
          <div className="max-w-2xl space-y-5">
            {/* Tagline & Badge */}
            <div className="animate-elem flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/90 text-white text-[11px] font-extrabold uppercase tracking-wider backdrop-blur-sm">
                <Sparkles className="w-3 h-3" />
                {activeBanner.badge}
              </span>
              <span className="text-xs font-bold tracking-widest text-zinc-300 uppercase">
                {activeBanner.tagline}
              </span>
            </div>

            {/* Headline */}
            <h1 className="animate-elem font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-white">
              {activeBanner.headline}
            </h1>

            {/* Subtext */}
            <p className="animate-elem text-sm sm:text-base text-zinc-300 font-normal leading-relaxed max-w-xl">
              {activeBanner.subtext}
            </p>

            {/* CTA Buttons */}
            <div className="animate-elem pt-3 flex flex-wrap items-center gap-4">
              <Link
                to={activeBanner.link}
                className="px-8 py-4 bg-white text-slate-950 hover:bg-rose-600 hover:text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all duration-300 shadow-xl hover:shadow-rose-600/30 active:scale-95"
              >
                {activeBanner.ctaText}
              </Link>
              <Link
                to="/products?sortBy=popularity"
                className="px-6 py-4 bg-zinc-900/80 hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-widest rounded-xl border border-zinc-700 backdrop-blur-sm transition-all"
              >
                VIEW TRENDING
              </Link>
            </div>
          </div>
        </div>

        {/* Carousel Arrow Controls */}
        <button
          onClick={() => setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length)}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all z-20 border border-white/10"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => setCurrentSlide((prev) => (prev + 1) % banners.length)}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all z-20 border border-white/10"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Indicator Dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {banners.map((b, idx) => (
            <button
              key={b.id}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentSlide ? 'w-8 bg-rose-600' : 'w-2 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
