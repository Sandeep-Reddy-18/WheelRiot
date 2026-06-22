import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { ShoppingCart, Star, Truck, Shield, Heart, CheckCircle, XCircle, Warehouse } from 'lucide-react';
import { motion } from 'framer-motion';
import useCartStore from '../store/cartStore';
import ReviewSection from '../components/ReviewSection';

const ProductDetails = () => {
  const { slug } = useParams();
  const addItem = useCartStore(state => state.addItem);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  
  const [user, setUser] = useState(null); 

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user'));
    setUser(u); 
    fetchProduct(); 
  }, [slug]);

  const fetchProduct = async () => { 
    try {
      const res = await axios.get(`/api/products/${slug}`);
      setProduct(res.data);
      setLoading(false);
      
      // Check favorite status
      if (currentUser && res.data) {
         checkFavoriteStatus(currentUser._id || currentUser.id, res.data._id);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const checkFavoriteStatus = async (userId, productId) => {
      try {
          const res = await axios.get(`/api/users/${userId}/wishlist`);
          const favorites = res.data; 
          const found = favorites.some(f => (typeof f === 'string' ? f : f._id) === productId);
          setIsFavorite(found);
      } catch (err) { console.error(err); }
  };

  const toggleFavorite = async () => {
    if(!user) return alert('Please login to add to favorites');
    try {
       await axios.post(`/api/users/wishlist/${product._id}`, { userId: user._id || user.id });
       setIsFavorite(!isFavorite);
    } catch(err) {
       console.error(err);
    }
  };

  if (loading) return <div className="text-center pt-32">Loading Machine...</div>;
  if (!product) return <div className="text-center pt-32">Product not found in our garage.</div>;

  const displayImages = (product.images && product.images.length > 0) 
    ? product.images 
    : [`https://placehold.co/600x400/111111/FFFFFF/png?text=${encodeURIComponent(product.name)}`];

  return (
    <div className="relative min-h-screen pt-24 pb-12">
      {/* Dynamic Glow Background */}
      <div 
        className="fixed top-0 left-0 right-0 h-screen -z-10 blur-[150px] opacity-20 pointer-events-none transition-colors duration-1000"
        style={{ background: `radial-gradient(circle at 70% 30%, ${product.primaryColor}, transparent)` }}
      />

      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Gallery */}
        <div className="space-y-4">
          <motion.div 
            className="aspect-[4/3] bg-zinc-900 rounded-2xl overflow-hidden border border-white/5"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <img 
              src={displayImages[activeImage] || displayImages[0]} 
              alt={product.name} 
              className="w-full h-full object-contain p-4"
            />
          </motion.div>
          
          <div className="flex gap-4 overflow-x-auto pb-2">
            {displayImages.map((img, idx) => (
              <button 
                key={idx}
                onClick={() => setActiveImage(idx)}
                className={`w-24 h-24 bg-zinc-900 rounded-lg flex-shrink-0 border-2 overflow-hidden ${activeImage === idx ? 'border-primary' : 'border-transparent'}`}
              >
                <img src={img} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Details */}
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div>
            <div className="flex justify-between items-start">
              <h2 className="text-gray-400 text-lg">{product.manufacturer || 'Unbranded'}</h2>
              <div className="flex items-center gap-1 text-yellow-500">
                <Star className="fill-current" size={16} />
                <span className="font-bold">{product.ratings?.average ? product.ratings.average.toFixed(1) : 'New'}</span>
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mt-1 mb-4 leading-tight">{product.name}</h1>
            <div className="flex items-end gap-4">
              <div className="flex flex-col">
                  {(product.discountedPrice && product.discountedPrice < product.price) && (
                      <span className="text-gray-500 text-lg line-through decoration-red-500 decoration-2">₹{product.price.toLocaleString()}</span>
                  )}
                  {(!product.discountedPrice && product.mrp > product.price) && (
                      <span className="text-gray-500 text-lg line-through decoration-red-500 decoration-2">₹{product.mrp.toLocaleString()}</span>
                  )}
                  <span className="text-3xl font-bold text-primary">₹{(product.discountedPrice || product.price).toLocaleString()}</span>
              </div>
              
              {(product.discountPercent > 0 || product.discount > 0) && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded mb-2">
                     {product.discountPercent || product.discount}% OFF
                  </span>
              )}
              {(!product.discountPercent && product.mrp > product.price) && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded mb-2">
                     {Math.round(((product.mrp - product.price) / product.mrp) * 100)}% OFF
                  </span>
              )}
            </div>
          </div>
          
          <PincodeChecker productWeight={0.5} />
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-surface p-3 rounded-lg border border-white/5">
              <span className="text-gray-400 block">Scale</span>
              <span className="font-bold">{product.attributes.scale}</span>
            </div>
            <div className="bg-surface p-3 rounded-lg border border-white/5">
              <span className="text-gray-400 block">Material</span>
              <span className="font-bold">{product.attributes.material}</span>
            </div>
          </div>

          <div className="prose prose-invert prose-sm">
            <p>{product.description}</p>
          </div>

          <ReviewSection 
             productId={product._id} 
             averageRating={product.ratings?.average}
             reviewCount={product.ratings?.count}
          />

          {/* Action Area */}
          <div className="flex flex-col gap-4 border-t border-white/10 pt-6">
             <div className="flex gap-4">
                <button 
                  onClick={() => addItem(product)}
                  disabled={product.stock <= 0}
                  className={`flex-1 font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-lg transition-transform active:scale-95 ${product.stock <= 0 ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-white text-black hover:bg-gray-200'}`}
                >
                  <Warehouse size={24} />
                  {product.stock <= 0 ? 'Out of Stock' : 'Add to Garage'}
                </button>
                
                <button 
                  onClick={toggleFavorite}
                  className={`p-4 rounded-xl border-2 transition-colors ${isFavorite ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 hover:border-white text-gray-400'}`}
                >
                  <Heart size={24} className={isFavorite ? 'fill-current' : ''} />
                </button>
             </div>
             
             <div className="flex justify-between text-xs text-gray-500 mt-2">
               <div className="flex items-center gap-1"></div>
               <div className="flex items-center gap-1"><Shield size={14} /> Official Distributor</div>
             </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProductDetails;

const PincodeChecker = ({ productWeight }) => {
    const [pincode, setPincode] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const checkServiceability = async () => {
        if (!pincode || pincode.length < 6) return;
        setLoading(true);
        setResult(null);
        try {
            const res = await axios.post('/api/shipping/serviceability', {
                pincode,
                weight: productWeight,
                cod: 1
            });
            setResult(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setResult({ error: 'Check failed' });
            setLoading(false);
        }
    };

    return (
        <div className="bg-surface p-4 rounded-xl border border-white/10 my-4">
            <h3 className="text-sm font-bold text-gray-400 mb-2 flex items-center gap-2">
                <Truck size={16} /> Check Delivery Availability
            </h3>
            <div className="flex gap-2">
                <input 
                    type="text" 
                    placeholder="Enter Pincode" 
                    className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary w-full"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g,'').slice(0,6))}
                />
                <button 
                    onClick={checkServiceability}
                    disabled={loading || pincode.length !== 6}
                    className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                >
                    {loading ? '...' : 'Check'}
                </button>
            </div>
            {result && (
               <div className="mt-3 text-sm animate-in fade-in slide-in-from-top-2">
                   {result.deliverable ? (
                       <div className="text-green-400">
                           <p className="font-bold flex items-center gap-1"><CheckCircle size={14} /> Deliverable by {result.courier_name}</p>
                           {result.etd && <p className="text-gray-400 text-xs">Est. Delivery: <span className="text-white">{result.etd}</span></p>}
                       </div>
                   ) : (
                       <p className="text-red-400 flex items-center gap-1"><XCircle size={14} /> Not deliverable to this pincode.</p>
                   )}
               </div>
            )}
        </div>
    );
};
