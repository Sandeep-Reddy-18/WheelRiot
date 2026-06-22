import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ProductCard from '../components/ProductCard';
import { Heart } from 'lucide-react';

const Favorites = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [visibleCount, setVisibleCount] = useState(12);

    useEffect(() => {
        fetchFavorites();
    }, []);

    const fetchFavorites = async () => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            setLoading(false);
            return;
        }

        try {
            const res = await axios.get(`/api/users/${user._id || user.id}/wishlist`);
            setProducts(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const removeFavorite = async (productId) => {
        const user = JSON.parse(localStorage.getItem('user'));
        if(!user) return;
        
        setProducts(products.filter(p => p._id !== productId));

        try {
            await axios.post(`/api/users/wishlist/${productId}`, { userId: user._id || user.id });
        } catch(err) {
            console.error(err);
            fetchFavorites(); 
        }
    };

    if (loading) return <div className="pt-32 text-center">Loading Favorites...</div>;

    return (
        <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto min-h-screen">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                 <div className="flex items-center gap-3">
                     <div className="p-3 bg-red-500/10 rounded-full text-primary">
                         <Heart size={32} className="fill-current" />
                     </div>
                     <h1 className="text-4xl font-bold">My Favorites</h1>
                 </div>
                 
                 {/* View Toggle */}
                 <div className="flex bg-surface border border-white/10 rounded-lg p-1">
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${viewMode === 'grid' ? 'bg-primary text-white' : 'hover:text-white text-gray-400'}`}
                    >
                        Grid
                    </button>
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : 'hover:text-white text-gray-400'}`}
                    >
                        List
                    </button>
                 </div>
             </div>

             {products.length === 0 ? (
                 <div className="text-center py-20 bg-surface rounded-xl border border-white/10">
                     <p className="text-xl text-gray-400">Your wishlist is empty.</p>
                     <a href="/shop" className="mt-4 inline-block text-primary font-bold hover:underline">Go Shopping</a>
                 </div>
             ) : (
                 <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
                     {products.slice(0, visibleCount).map(product => {
                         if (!product) return null;
                         
                         if (viewMode === 'grid') {
                             return (
                                 <div key={product._id} className="relative group">
                                     <ProductCard product={product} />
                                     <button 
                                        onClick={(e) => { e.preventDefault(); removeFavorite(product._id); }}
                                        className="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
                                        title="Remove from favorites"
                                     >
                                         <span className="sr-only">Remove</span>
                                         ✕
                                     </button>
                                 </div>
                             );
                         } else {
                             // List View
                             return (
                                <div key={product._id} className="bg-surface border border-white/10 p-4 rounded-xl flex gap-6 items-center group hover:border-primary/50 transition-colors">
                                    <div className="w-24 h-24 bg-black/30 rounded-lg overflow-hidden flex-shrink-0">
                                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-xl mb-1">{product.name}</h3>
                                        <div className="text-sm text-gray-400 mb-2">{product.manufacturer} | {product.scale}</div>
                                        <div className="font-bold text-primary text-lg">₹{product.price.toLocaleString()}</div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <a href={`/product/${product._id}`} className="bg-white text-black px-6 py-2 rounded-lg font-bold text-sm hover:bg-gray-200 text-center">View</a>
                                        <button 
                                            onClick={() => removeFavorite(product._id)}
                                            className="text-red-500 hover:text-red-400 text-sm font-bold flex items-center gap-1 justify-center"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                             );
                         }
                     })}

                     {visibleCount < products.length && (
                        <div className={viewMode === 'grid' ? "col-span-full text-center mt-8" : "text-center mt-8"}>
                             <button 
                                onClick={() => setVisibleCount(prev => prev + 12)}
                                className="px-8 py-3 bg-surface border border-white/10 hover:bg-white/10 rounded-full font-bold transition-all"
                            >
                                Load More Favorites ({products.length - visibleCount} remaining)
                            </button>
                        </div>
                     )}
                 </div>
             )}
        </div>
    );
};

export default Favorites;
