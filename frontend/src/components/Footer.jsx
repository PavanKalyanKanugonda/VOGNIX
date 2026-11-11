import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, RefreshCw, Truck, CreditCard, ArrowRight } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const Footer = () => {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    showToast(`Subscribed ${newsletterEmail.trim()} to VOGNIX Runway Dispatch!`, 'success');
    setNewsletterEmail('');
  };

  return (
    <footer className="bg-zinc-950 text-white pt-16 pb-12 border-t border-zinc-900 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Assurances Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-14 border-b border-zinc-800">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center shrink-0 border border-zinc-800 text-rose-500">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold tracking-wider uppercase text-white">100% Original</h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">Guaranteed authentic luxury fashion directly from official ateliers.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center shrink-0 border border-zinc-800 text-rose-500">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold tracking-wider uppercase text-white">14 Days Return</h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">Hassle-free return & doorstep exchange policy for all items.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center shrink-0 border border-zinc-800 text-rose-500">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold tracking-wider uppercase text-white">Fast Doorstep Delivery</h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">Free priority shipping on orders over ₹999 with real-time tracking.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center shrink-0 border border-zinc-800 text-rose-500">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold tracking-wider uppercase text-white">Secure Checkout</h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">Encrypted transactions via Simulated UPI, Cards, and Cash on Delivery.</p>
            </div>
          </div>
        </div>

        {/* Main Footer Links */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 py-12 border-b border-zinc-800">
          
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="inline-flex items-center gap-1.5">
              <span className="font-display font-extrabold text-3xl tracking-tight text-white">VOGNIX</span>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
            </Link>
            <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
              Fashion. Identity. Lifestyle. VOGNIX is an elevated multi-brand destination crafted for modern individuals who appreciate distinct tailoring, fine fabrics, and uncompromising design.
            </p>
            <div className="pt-2">
              <p className="text-[11px] font-bold tracking-wider uppercase text-zinc-300 mb-2">Subscribe to Runway Dispatch</p>
              <form onSubmit={handleSubscribe} className="flex max-w-sm">
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="bg-zinc-900 border border-zinc-800 text-xs px-4 py-2.5 rounded-l-xl flex-1 text-white placeholder:text-zinc-500 focus:outline-none focus:border-rose-500"
                />
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-r-xl transition-colors shrink-0 flex items-center"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Quick Categories */}
          <div>
            <h5 className="text-xs font-extrabold tracking-widest uppercase text-white mb-4">ONLINE SHOPPING</h5>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li><Link to="/products?gender=MEN" className="hover:text-white transition-colors">Men's Apparel</Link></li>
              <li><Link to="/products?gender=WOMEN" className="hover:text-white transition-colors">Women's Couture</Link></li>
              <li><Link to="/products?gender=KIDS" className="hover:text-white transition-colors">Kids Collection</Link></li>
              <li><Link to="/products?category=footwear" className="hover:text-white transition-colors">Footwear & Sneakers</Link></li>
              <li><Link to="/products?category=accessories-watches" className="hover:text-white transition-colors">Watches & Luxury Goods</Link></li>
              <li><Link to="/products?category=bags-luggage" className="hover:text-white transition-colors">Leather Bags & Duffles</Link></li>
            </ul>
          </div>

          {/* Customer Policies */}
          <div>
            <h5 className="text-xs font-extrabold tracking-widest uppercase text-white mb-4">CUSTOMER CARE</h5>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li><Link to="/orders" className="hover:text-white transition-colors">Track Orders</Link></li>
              <li><Link to="/profile" className="hover:text-white transition-colors">Manage Account</Link></li>
              <li><Link to="/cart" className="hover:text-white transition-colors">Shopping Bag</Link></li>
              <li><Link to="/wishlist" className="hover:text-white transition-colors">Saved Wishlist</Link></li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    showToast('Manage cancellations & returns directly inside My Orders.', 'info');
                    navigate('/orders');
                  }}
                  className="hover:text-white transition-colors text-left"
                >
                  Returns & Exchanges
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => showToast('Concierge Support: support@vognix.com (Mon–Sun 9AM–9PM IST)', 'info')}
                  className="hover:text-white transition-colors text-left"
                >
                  Contact Concierge
                </button>
              </li>
            </ul>
          </div>

          {/* Platform Info */}
          <div>
            <h5 className="text-xs font-extrabold tracking-widest uppercase text-white mb-4">EXPERIENCE & APIS</h5>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li><a href="/swagger-ui.html" target="_blank" rel="noreferrer" className="hover:text-rose-400 transition-colors">OpenAPI Swagger UI</a></li>
              <li><Link to="/admin/dashboard" className="hover:text-rose-400 transition-colors">Admin Console</Link></li>
              <li><Link to="/admin/login" className="hover:text-rose-400 transition-colors">Admin Sign In</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Customer Sign In</Link></li>
              <li><span className="text-zinc-500">Version 1.0.0 Production</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright & Badges */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
          <p>© 2026 VOGNIX Fashion Technologies Pvt Ltd. All rights reserved.</p>
          <div className="flex items-center gap-3 text-zinc-400 text-[11px]">
            <span>Simulated Payments Enabled</span>
            <span>•</span>
            <span>PCI-DSS Architecture Compliant</span>
            <span>•</span>
            <span>Made with React & Spring Boot</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
