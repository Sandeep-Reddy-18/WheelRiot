import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Tag, Search } from 'lucide-react';

const Brands = () => {
  const [brands, setBrands] = useState([]);
  const [filteredBrands, setFilteredBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
      if(searchTerm === '') {
          setFilteredBrands(brands);
      } else {
          setFilteredBrands(brands.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase())));
      }
  }, [searchTerm, brands]);

  const fetchBrands = async () => {
    try {
      const res = await axios.get('/api/brands');
      setBrands(res.data);
      setFilteredBrands(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto min-h-screen">
      <div className="text-center mb-12">
         <h1 className="text-4xl md:text-5xl font-bold mb-4">All Brands</h1>
         <p className="text-gray-400 max-w-2xl mx-auto mb-8">
           We curate models from the most prestigious manufacturers. 
           Authenticity is not just a promise; it's our obsession.
         </p>
         
         <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <input 
                type="text" 
                placeholder="Search brands..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-surface border border-white/10 rounded-full py-3 pl-12 pr-4 outline-none focus:border-primary transition-colors"
            />
         </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-500">Loading Directory...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredBrands.map((brand, idx) => (
            <Link to={`/shop?manufacturer=${encodeURIComponent(brand.name)}`} key={brand._id || idx}>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-surface p-8 rounded-2xl border border-white/5 hover:border-primary/50 transition-colors group flex flex-col items-center text-center h-full"
            >
              <div className="h-32 w-full flex items-center justify-center bg-white/5 p-4 rounded-xl mb-6 group-hover:bg-white/10 transition-all duration-300 overflow-hidden">
                 {brand.image ? (
                     <img src={brand.image} alt={brand.name} className="max-h-full max-w-full object-contain grayscale group-hover:grayscale-0 transition-all duration-300" />
                 ) : (
                     <Tag size={40} className="text-gray-500 group-hover:text-primary transition-colors" />
                 )}
              </div>
              <h3 className="text-2xl font-bold mb-2">{brand.name}</h3>
              {brand.description && <p className="text-gray-400 text-sm">{brand.description}</p>}
            </motion.div>
            </Link>
          ))}
          
          {filteredBrands.length === 0 && (
            <div className="col-span-full text-center py-12 bg-surface rounded-xl border border-white/10">
               <p className="text-gray-400">No brands found.</p>
               {brands.length === 0 && <p className="text-xs text-gray-500 mt-2">Admin needs to populate brands in the Command Center.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Brands;
