import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { Filter, X, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Shop = () => {
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ manufacturers: [], scales: [], minPrice: 0, maxPrice: 10000 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // Filters & State
  const [filters, setFilters] = useState({
    manufacturer: '',
    scale: '',
    minPrice: '',
    maxPrice: '',
    sort: 'newest',
    search: ''
  });
  
  const searchTimeoutRef = React.useRef(null);
  const abortControllerRef = React.useRef(null);

  // Settings
  useEffect(() => {
    fetchMeta();
  }, []);

  useEffect(() => {
    const currentParams = Object.fromEntries([...searchParams]);
    setFilters(prev => ({ ...prev, ...currentParams }));
    
    fetchProducts(currentParams, 1, true);
  }, [searchParams]);

  const fetchMeta = async () => {
    try {
      const res = await axios.get('/api/products/meta');
      setMeta(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = async (params = filters, pageNum = 1, reset = false) => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);
    try {
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== '')
      );
      
      cleanParams.status = 'Active';
      cleanParams.page = pageNum;
      cleanParams.limit = 24; 

      const res = await axios.get('/api/products', { 
          params: cleanParams,
          signal: abortControllerRef.current.signal
      });
      
      const { products: newProducts, total, pages } = res.data;

      if (reset) {
          setProducts(newProducts);
          setPage(1);
      } else {
          setProducts(prev => [...prev, ...newProducts]);
          setPage(pageNum);
      }
      
      setTotalPages(pages);
      setTotalProducts(total);
    } catch (err) {
      if (axios.isCancel(err)) {
          console.log('Request canceled', err.message);
          return;
      }
      console.error(err);
      setError('Connection Error. Please check your internet and try again.');
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
          setLoading(false);
      }
    }
  };

  const loadMore = () => {
      const nextPage = page + 1;
      fetchProducts(filters, nextPage, false);
  };

  const updateFilters = (newFilters) => {
    setSearchParams(Object.fromEntries(
        Object.entries(newFilters).filter(([_, v]) => v !== '')
    ));
  };
  
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    updateFilters(newFilters);
  };

  const handleCheckboxChange = (key, value) => {
    let current = filters[key] ? filters[key].split(',') : [];
    if (current.includes(value)) {
      current = current.filter(item => item !== value);
    } else {
      current.push(value);
    }
    const newVal = current.join(',');
    handleFilterChange(key, newVal);
  };

  const clearFilters = () => {
     setSearchTerm(''); 
     const reset = { manufacturer: '', scale: '', minPrice: '', maxPrice: '', search: '' };
     setFilters(reset);
     setSearchParams({});
  };

  // Search Logic
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
     const q = searchParams.get('search') || '';
     setSearchTerm(q);
  }, [searchParams]);

  const handleSearchInput = (e) => {
      const val = e.target.value;
      setSearchTerm(val);
      
      if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
      }
      
      searchTimeoutRef.current = setTimeout(() => {
          handleFilterChange('search', val);
      }, 500);
  };

  return (
    <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto flex flex-col md:flex-row gap-8 min-h-screen">
      
      {/* Mobile-Only Search Bar (Extracted from Filters) */}
      <div className="md:hidden w-full mb-2">
           <input 
               type="text" 
               placeholder="Search models..." 
               className="w-full bg-surface border border-white/10 rounded-lg p-3 text-sm text-white focus:border-primary outline-none shadow-lg"
               value={searchTerm}
               onChange={handleSearchInput}
           />
      </div>

      {/* Mobile Filter Toggle */}
      <button 
        onClick={() => setShowFilters(!showFilters)}
        className="md:hidden flex items-center justify-center gap-2 bg-surface border border-white/10 p-3 rounded-lg mb-4"
      >
        <Filter size={20} />
        <span>Filters</span>
      </button>

      {/* Sidebar Filters */}
      <aside className={`md:w-64 space-y-8 ${showFilters ? 'block' : 'hidden md:block'}`}>
        <div>
          <h2 className="text-xl font-bold mb-4 flex justify-between items-center">
             Filters
             {(filters.manufacturer || filters.scale || filters.minPrice || filters.maxPrice || filters.search) && (
                <button onClick={clearFilters} className="text-xs text-primary hover:underline">Clear All</button>
             )}
          </h2>
          
          
          {/* Search Filter (Desktop Only) */}
          <div className="mb-6 hidden md:block">
            <h3 className="font-bold text-sm text-gray-400 mb-2 uppercase tracking-wide">Search Models</h3>
            <input 
                 type="text" 
                 placeholder="Search by name..." 
                 className="w-full bg-black/30 border border-white/10 rounded p-2 text-sm text-white focus:border-primary outline-none"
                 value={searchTerm}
                 onChange={handleSearchInput}
            />
          </div>

          {/* Price Range */}
          <div className="mb-6">
            <h3 className="font-bold text-sm text-gray-400 mb-2 uppercase tracking-wide flex justify-between">
               Price Range
               <span className="text-xs text-white">₹{filters.minPrice !== undefined && filters.minPrice !== '' ? filters.minPrice : (meta.minPrice || 0)} - ₹{filters.maxPrice !== undefined && filters.maxPrice !== '' ? filters.maxPrice : (meta.maxPrice || 10000)}</span>
            </h3>

            <div className="flex gap-2">
                <input 
                   type="number" 
                   min={meta.minPrice || 0}
                   max={meta.maxPrice || 10000}
                   placeholder="Min ₹" 
                   className="w-full bg-black/30 border border-white/10 rounded p-2 text-sm text-white focus:border-primary outline-none"
                   value={filters.minPrice !== undefined ? filters.minPrice : ''}
                   onChange={(e) => {
                      if (e.target.value === '') {
                          handleFilterChange('minPrice', '');
                          return;
                      }
                      let val = Number(e.target.value);
                      if (val < 0) val = 0;
                      handleFilterChange('minPrice', val);
                   }}
                />
                <input 
                   type="number" 
                   min={meta.minPrice || 0}
                   max={meta.maxPrice || 10000}
                   placeholder="Max ₹" 
                   className="w-full bg-black/30 border border-white/10 rounded p-2 text-sm text-white focus:border-primary outline-none"
                   value={filters.maxPrice !== undefined ? filters.maxPrice : ''}
                   onChange={(e) => {
                      if (e.target.value === '') {
                          handleFilterChange('maxPrice', '');
                          return;
                      }
                      let val = Number(e.target.value);
                      if (val < 0) val = 0;
                      handleFilterChange('maxPrice', val);
                   }}
                />
            </div>
          </div>

          {/* Scale */}
          <div className="mb-6">
            <h3 className="font-bold text-sm text-gray-400 mb-2 uppercase tracking-wide">Scale</h3>
            <div className="space-y-1">
              {meta.scales.map(scale => (
                <label key={scale} className="flex items-center gap-2 cursor-pointer hover:text-white text-gray-300">
                  <input 
                    type="checkbox" 
                    checked={filters.scale?.split(',').includes(scale)}
                    onChange={() => handleCheckboxChange('scale', scale)}
                    className="accent-primary rounded mr-2"
                  />
                  {scale}
                </label>
              ))}
            </div>
          </div>


          {/* Manufacturer */}
          <div className="mb-6">
            <h3 className="font-bold text-sm text-gray-400 mb-2 uppercase tracking-wide">Model Brand</h3>
            <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
              {meta.manufacturers.map(mfg => (
                <label key={mfg} className="flex items-center gap-2 cursor-pointer hover:text-white text-gray-300">
                  <input 
                    type="checkbox" 
                    checked={filters.manufacturer?.split(',').includes(mfg)}
                    onChange={() => handleCheckboxChange('manufacturer', mfg)}
                    className="accent-primary rounded mr-2"
                  />
                  {mfg}
                </label>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
           <h1 className="text-2xl font-bold">
             All Models <span className="text-gray-500 text-lg font-normal">({totalProducts})</span>
           </h1>
           
           <div className="flex items-center gap-4 w-full md:w-auto">
               <select 
                 className="bg-surface border border-white/10 px-4 py-2 rounded-lg outline-none cursor-pointer text-sm text-white"
                 value={filters.sort}
                 onChange={(e) => handleFilterChange('sort', e.target.value)}
               >
                 <option value="newest">Newest Arrivals</option>
                 <option value="price_asc">Price: Low to High</option>
                 <option value="price_desc">Price: High to Low</option>
               </select>
           </div>
        </div>

        {error ? (
          <div className="text-center py-20 bg-surface rounded-xl border border-red-500/30">
             <p className="text-xl text-red-400 font-bold mb-2">⚠️ {error}</p>
             <button onClick={() => fetchProducts(filters, page, true)} className="mt-4 px-6 py-2 bg-primary rounded-full font-bold">Retry</button>
          </div>
        ) : products.length === 0 && !loading ? (
          <div className="text-center py-20 bg-surface rounded-xl border border-white/10">
             <p className="text-xl text-gray-400">No models found matching your criteria.</p>
             <button onClick={clearFilters} className="mt-4 text-primary font-bold hover:underline">Clear Filters</button>
          </div>
        ) : (
          <motion.div 
            layout 
            className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6"
          >
            <AnimatePresence mode="popLayout">
            {products.map(product => (
              <motion.div 
                layout
                key={product._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
            </AnimatePresence>
            
            {loading && [1,2,3].map(i => (
                <div key={`idx-${i}`} className="bg-surface aspect-[3/4] rounded-xl animate-pulse border border-white/5"></div>
            ))}

            {page < totalPages && !loading && (
                <div className="col-span-full flex justify-center mt-8">
                    <button 
                        onClick={loadMore}
                        className="px-8 py-3 bg-surface border border-white/10 hover:bg-white/10 rounded-full font-bold transition-all"
                    >
                        Load More Models
                    </button>
                </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
};


export default Shop;
