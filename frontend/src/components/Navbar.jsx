import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Heart, ShoppingBag, User as UserIcon, ShieldAlert, LogOut, Package, MapPin, ChevronDown, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

export const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsMobileMenuOpen(false);
    }
  };

  const navCategories = [
    { name: 'MEN', slug: 'men-fashion', gender: 'MEN' },
    { name: 'WOMEN', slug: 'women-fashion', gender: 'WOMEN' },
    { name: 'KIDS', slug: 'kids-wear', gender: 'KIDS' },
    { name: 'FOOTWEAR', slug: 'footwear' },
    { name: 'ACCESSORIES', slug: 'accessories-watches' },
    { name: 'SALE', isSale: true },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm transition-all">
      {/* Top micro banner */}
      <div className="bg-zinc-950 text-white text-[11px] font-medium tracking-wider uppercase py-1.5 px-4 text-center">
        <span>Free Priority Doorstep Delivery on orders above ₹999 | Code: <strong className="text-rose-400 font-bold">VOGNIX10</strong> for 10% Off</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Mobile menu trigger */}
          <div className="flex items-center lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 -ml-2 text-slate-700 hover:text-black focus:outline-none"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-1 group">
              <span className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight text-slate-900 group-hover:text-rose-600 transition-colors">
                VOGNIX
              </span>
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-7 text-xs font-bold tracking-widest text-slate-800">
              {navCategories.map((item) => (
                <Link
                  key={item.name}
                  to={item.isSale ? '/products?sortBy=price_asc' : item.gender ? `/products?gender=${item.gender}` : `/products?category=${item.slug}`}
                  className={`hover-underline-animation py-2 transition-colors ${
                    item.isSale ? 'text-rose-600 font-extrabold' : 'hover:text-black'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <form onSubmit={handleSearch} className="w-full relative">
              <input
                type="text"
                placeholder="Search for products, brands and more..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white pl-11 pr-4 py-2.5 rounded-full text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-inner"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5 pointer-events-none" />
            </form>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center space-x-2 sm:space-x-5">
            {/* Search Icon for Mobile */}
            <button
              onClick={() => navigate('/products')}
              className="md:hidden p-2 text-slate-700 hover:text-black"
              title="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-1.5 p-2 text-slate-700 hover:text-black transition-colors rounded-full hover:bg-slate-50"
              >
                <UserIcon className="w-5 h-5" />
                <span className="hidden xl:inline text-xs font-bold tracking-wider">
                  {isAuthenticated ? user.firstName : 'PROFILE'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isProfileOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsProfileOpen(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-premium border border-slate-100 py-3 z-50 text-xs">
                    {isAuthenticated ? (
                      <div>
                        <div className="px-5 py-3 border-b border-slate-100">
                          <p className="font-bold text-slate-900 text-sm">{user.firstName} {user.lastName}</p>
                          <p className="text-slate-500 text-[11px] truncate">{user.email}</p>
                          {isAdmin && (
                            <span className="inline-block mt-1.5 px-2 py-0.5 bg-rose-100 text-rose-700 font-bold text-[10px] rounded-full">
                              Platform Administrator
                            </span>
                          )}
                        </div>

                        {isAdmin && (
                          <Link
                            to="/admin"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center gap-3 px-5 py-2.5 hover:bg-rose-50 text-rose-700 font-bold transition-colors"
                          >
                            <ShieldAlert className="w-4 h-4 text-rose-600" />
                            Admin Dashboard
                          </Link>
                        )}

                        <Link
                          to="/orders"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 text-slate-700 font-medium transition-colors"
                        >
                          <Package className="w-4 h-4 text-slate-400" />
                          Orders & Tracking
                        </Link>

                        <Link
                          to="/profile"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 text-slate-700 font-medium transition-colors"
                        >
                          <MapPin className="w-4 h-4 text-slate-400" />
                          Saved Addresses
                        </Link>

                        <div className="border-t border-slate-100 mt-2 pt-2">
                          <button
                            onClick={() => {
                              logout();
                              setIsProfileOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 text-rose-600 font-bold text-left transition-colors"
                          >
                            <LogOut className="w-4 h-4 text-rose-500" />
                            Log Out
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 text-center">
                        <p className="text-slate-600 mb-3 font-medium">To access wishlist & manage orders</p>
                        <Link
                          to="/login"
                          onClick={() => setIsProfileOpen(false)}
                          className="block w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md mb-2"
                        >
                          Login / Sign Up
                        </Link>
                        <Link
                          to="/admin/login"
                          onClick={() => setIsProfileOpen(false)}
                          className="text-[11px] text-slate-500 hover:text-slate-800 underline"
                        >
                          Are you an Admin?
                        </Link>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Wishlist Icon */}
            <Link
              to="/wishlist"
              className="relative p-2 text-slate-700 hover:text-rose-600 transition-colors rounded-full hover:bg-slate-50 flex items-center gap-1.5"
              title="Wishlist"
            >
              <Heart className="w-5 h-5" />
              <span className="hidden xl:inline text-xs font-bold tracking-wider">WISHLIST</span>
              {wishlistCount > 0 && (
                <span className="absolute top-1 right-1 xl:top-0 xl:right-auto xl:left-5 min-w-[18px] h-[18px] flex items-center justify-center bg-rose-600 text-white text-[10px] font-extrabold rounded-full px-1">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart / Bag Icon */}
            <Link
              to="/cart"
              className="relative p-2 text-slate-700 hover:text-black transition-colors rounded-full hover:bg-slate-50 flex items-center gap-1.5"
              title="Shopping Bag"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="hidden xl:inline text-xs font-bold tracking-wider">BAG</span>
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 xl:top-0 xl:right-auto xl:left-4 min-w-[18px] h-[18px] flex items-center justify-center bg-slate-950 text-white text-[10px] font-extrabold rounded-full px-1">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white px-4 pt-3 pb-6 space-y-3">
          <form onSubmit={handleSearch} className="relative mb-4">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 rounded-xl text-xs"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </form>

          <div className="flex flex-col space-y-2">
            {navCategories.map((item) => (
              <Link
                key={item.name}
                to={item.isSale ? '/products?sortBy=price_asc' : item.gender ? `/products?gender=${item.gender}` : `/products?category=${item.slug}`}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`py-2 px-3 rounded-lg text-xs font-bold tracking-wider ${
                  item.isSale ? 'text-rose-600 bg-rose-50' : 'text-slate-800 hover:bg-slate-50'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
