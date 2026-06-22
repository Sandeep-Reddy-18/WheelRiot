import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ShoppingCart, Search, Menu, Heart, ChevronDown, X } from 'lucide-react';
import useCartStore from '../store/cartStore';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Navbar = () => {
  const { user } = useAuth();
  const { items, toggleCart } = useCartStore();
  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isShopPage = location.pathname === '/shop';

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [meta, setMeta] = useState({ manufacturers: [], scales: [] });

  const { fetchCart, setUserId, clearCart } = useCartStore();

  useEffect(() => {
    // Fetch Top Brands and Scales
    axios.get('/api/products/meta')
        .then(res => setMeta(res.data))
        .catch(err => console.error("MegaMenu Meta Error:", err));

    const query = searchParams.get('search');
    if (query) {
        setSearchTerm(query);
        setSearchOpen(true);
    }
  }, [searchParams]);

  const { fetchCart: fetchRemoteCart } = useCartStore();
  useEffect(() => {
    if (user?._id) {
        fetchRemoteCart(user._id);
    }
  }, [location.pathname, user?._id, fetchRemoteCart]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchTerm)}`);
    }
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className={`flex items-center transition-all duration-300 ${searchOpen && 'md:opacity-100 max-md:fixed max-md:inset-0 max-md:bg-background max-md:z-[60] max-md:px-4 max-md:flex max-md:items-center'}`}>
            <div className={`flex items-center transition-opacity duration-300 ${searchOpen ? 'max-md:hidden' : 'opacity-100'}`}>
              <Link to="/" className="flex items-center">
                <img src="/wheelriot_full-logo.png" alt="WHEEL RIOT" className="h-8 md:h-10 w-auto object-contain" />
              </Link>
            </div>
            
            {searchOpen && (
              <form onSubmit={handleSearch} className="flex-1 md:ml-4 flex items-center gap-2 max-md:w-full">
                <div className="relative flex-1">
                  <input 
                    autoFocus
                    placeholder="Search premium models..." 
                    className="w-full bg-white/5 border border-white/10 rounded-full py-2 px-4 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button 
                      type="button" 
                      onClick={() => setSearchTerm('')} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button 
                  type="button" 
                  onClick={() => { setSearchOpen(false); if(searchTerm === '') navigate('/shop'); }} 
                  className="text-sm font-bold text-gray-400 hover:text-white px-2"
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
          
          <div className="hidden md:block">
            <div className={`ml-10 flex items-baseline space-x-8 transition-opacity duration-300 ${searchOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              {/* Mega Menu */}
              <div className="group relative py-4">
                  <Link to="/shop" className="hover:text-primary transition-colors duration-200">Shop <ChevronDown size={14} className="inline ml-1 mb-1" /></Link>
                  <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 absolute left-0 top-full mt-0 w-[600px] bg-background border border-white/10 rounded-xl shadow-2xl p-6 z-50 pointer-events-none group-hover:pointer-events-auto">
                      <div className="grid grid-cols-3 gap-6">
                          <div>
                              <h3 className="font-bold text-primary mb-3">By Scale</h3>
                              <ul className="space-y-2">
                                  {meta.scales && meta.scales.slice(0, 5).map(scale => (
                                      <li key={scale}>
                                          <Link to={`/shop?scale=${encodeURIComponent(scale)}`} className="text-sm text-gray-300 hover:text-white transition">{scale}</Link>
                                      </li>
                                  ))}
                              </ul>
                          </div>
                          <div>
                              <h3 className="font-bold text-primary mb-3">Top Brands</h3>
                              <ul className="space-y-2">
                                  {meta.manufacturers && meta.manufacturers.slice(0, 5).map(brand => (
                                      <li key={brand}>
                                          <Link to={`/shop?manufacturer=${encodeURIComponent(brand)}`} className="text-sm text-gray-300 hover:text-white transition">{brand}</Link>
                                      </li>
                                  ))}
                              </ul>
                          </div>
                          <div className="bg-white/5 rounded-lg p-4 flex flex-col justify-center items-center text-center">
                              <h3 className="font-bold text-white mb-2">Explore the Collection</h3>
                              <p className="text-xs text-gray-400 mb-4">Discover our entire collection of premium diecast models.</p>
                              <Link to="/shop" className="bg-primary text-white text-xs font-bold py-2 px-4 rounded-full hover:bg-red-700 transition">View All Models</Link>
                          </div>
                      </div>
                  </div>
              </div>
              
              <Link to="/brands" className="hidden hover:text-primary transition-colors duration-200">Brands</Link>
              <Link to="/about" className="hover:text-primary transition-colors duration-200">About</Link>
              
              {user ? (
                 <Link to="/profile" className="text-white hover:text-primary transition-colors duration-200">Account</Link>
              ) : (
                 <Link to="/login" className="text-white hover:text-primary transition-colors duration-200">Login</Link>
              )}
            </div>
          </div>

          <div className={`flex items-center gap-2 md:gap-4 transition-opacity duration-300 ${searchOpen ? 'max-md:opacity-0 max-md:pointer-events-none' : 'opacity-100'}`}>
             {!isShopPage && !searchOpen && (
                <button onClick={() => setSearchOpen(true)} className="p-2 hover:bg-white/5 rounded-full"><Search size={20} /></button>
             )}

            <Link to="/favorites" className="p-2 hover:bg-white/5 rounded-full text-white hover:text-primary transition-colors">
                <Heart size={20} />
            </Link>

            <button 
              onClick={() => {
                if (user?._id) fetchRemoteCart(user._id);
                toggleCart();
              }} 
              className="p-2 hover:bg-white/5 rounded-full relative"
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 hover:bg-white/5 rounded-full">
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={`md:hidden absolute top-16 left-0 w-full bg-background border-b border-white/10 shadow-2xl transition-all duration-300 ${mobileMenuOpen ? 'opacity-100 visible h-auto pb-4' : 'opacity-0 invisible h-0 overflow-hidden'}`}>
          <div className="px-4 py-2 space-y-2 flex flex-col items-center">
              <Link to="/shop" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 w-full text-center hover:bg-white/5 rounded font-bold">Shop</Link>
              <Link to="/brands" onClick={() => setMobileMenuOpen(false)} className="hidden py-3 px-4 w-full text-center hover:bg-white/5 rounded font-bold">Brands</Link>
              <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 w-full text-center hover:bg-white/5 rounded font-bold">About</Link>
              {user ? (
                 <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 w-full text-center hover:bg-white/5 rounded font-bold text-primary">Account</Link>
              ) : (
                 <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-4 w-full text-center hover:bg-white/5 rounded font-bold text-primary">Login</Link>
              )}
          </div>
      </div>

    </nav>
  );
};

export default Navbar;
