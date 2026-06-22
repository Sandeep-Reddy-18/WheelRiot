import React, { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useCartStore from '../store/cartStore';

const ProductCard = memo(({ product, lowStockThreshold = 5 }) => {
  const [isHovered, setIsHovered] = useState(false);
  const addItem = useCartStore(state => state.addItem);
  const navigate = useNavigate();

  const hasDiscount = product.discount > 0;
  
  const mainImage = product.images?.[0] || `https://placehold.co/600x400/111111/FFFFFF/png?text=${encodeURIComponent(product.name || 'Product')}`;
  const hoverImage = product.images?.[1];

  const handleCardClick = () => {
    navigate(`/product/${product.slug}`);
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    addItem(product);
  };

  return (
    <div 
      onClick={handleCardClick}
      className="group relative bg-surface rounded-xl overflow-hidden border border-white/5 hover:border-primary/50 transition-colors duration-300 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-zinc-900">
          <motion.img 
            src={mainImage} 
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
            initial={{ scale: 1 }}
            animate={{ scale: isHovered ? 1.05 : 1 }}
            transition={{ duration: 0.4 }}
          />
          
          {/* Secondary Image */}
          <AnimatePresence>
            {isHovered && hoverImage && (
              <motion.img 
                src={hoverImage} 
                alt={product.name + " alternate"}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
            )}
          </AnimatePresence>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.stock <= 0 && (
             <span className="bg-black/80 backdrop-blur text-white text-xs font-bold px-2 py-1 rounded border border-red-500/50 text-red-500">
              OUT OF STOCK
            </span>
          )}
          {product.attributes?.scale && (
            <span className="bg-black/50 backdrop-blur text-white text-xs font-bold px-2 py-1 rounded border border-white/10">
              {product.attributes.scale}
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">{product.manufacturer || 'Unbranded'}</div>
        <h3 className="font-bold text-lg mb-2 truncate group-hover:text-primary transition-colors">{product.name}</h3>
        
        <div className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-primary">
                    ₹{(product.discountedPrice || product.price).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                </span>
                {product.discountedPrice && product.discountedPrice < product.price && (
                    <span className="text-sm text-gray-500 line-through">
                        ₹{product.price.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                    </span>
                )}
                {!product.discountedPrice && product.mrp > product.price && (
                    <span className="text-sm text-gray-500 line-through">
                        ₹{product.mrp.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                    </span>
                )}
            </div>
            
            {(product.discountPercent > 0 || product.discount > 0) && (
                 <span className="text-xs font-bold text-green-500">
                    {product.discountPercent || product.discount}% OFF
                 </span>
            )}
          </div>
          {product.stock > 0 && (
            <button 
                onClick={handleAddToCart}
                className="p-2 bg-white text-black rounded-full hover:bg-gray-200 transition-colors z-10 relative"
            >
                <ShoppingCart size={20} />
            </button>
          )}
        </div>
        
        {product.stats?.inCarts > 0 && (
          <div className="mt-3 text-xs text-yellow-500 flex items-center gap-1">
             🔥 {product.stats.inCarts} people have this in cart
          </div>
        )}
      </div>
    </div>
  );
});

export default ProductCard;
