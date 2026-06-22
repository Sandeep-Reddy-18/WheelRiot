import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import useCartStore from '../store/cartStore';

const CartDrawer = () => {
  const { items, isOpen, toggleCart, removeItem, updateQuantity, setQuantity, updateItemMeta, total, addItem } = useCartStore();
  const [infoMessage, setInfoMessage] = React.useState(null);

  useEffect(() => {
    if (isOpen) {
      setInfoMessage(null);
      validateStock();
    }
  }, [isOpen]);

  const validateStock = async () => {
    let alerts = [];
    for (const item of items) {
      try {
        const res = await axios.get(`/api/products/${item.slug}`);
        const freshStock = res.data.stock;
        
        updateItemMeta(item._id, { stock: freshStock, price: res.data.price, discount: res.data.discount });

        if (freshStock === 0) {
           if (item.quantity > 0) {
              removeItem(item._id); 
              alerts.push(`${item.name} was removed from your cart (Out of Stock).`);
           }
        } else if (freshStock < item.quantity) {
           setQuantity(item._id, freshStock);
           alerts.push(`Quantity for ${item.name} adjusted to ${freshStock} (Max available).`);
        }
      } catch (err) {
        if (err.response?.status === 404) {
           removeItem(item._id); 
           alerts.push(`${item.name} is no longer available.`);
        }
      }
    }
    if (alerts.length > 0) {
      setInfoMessage(alerts);
    }
  };

  const hasOOSItems = items.some(i => i.stock === 0 || i.quantity === 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleCart}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-surface border-l border-white/10 z-50 p-6 flex flex-col"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Your Cart</h2>
              <button onClick={toggleCart} className="p-2 hover:bg-white/10 rounded-full">
                <X size={24} />
              </button>
            </div>

            {/* Info Box Alert */}
            {infoMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 bg-primary/20 border border-primary text-primary px-4 py-3 rounded-lg text-sm flex gap-2 items-start"
              >
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <div>
                    {infoMessage.map((msg, i) => (
                      <div key={i}>{msg}</div>
                    ))}
                  </div>
              </motion.div>
            )}

            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                <p>No cars parked here yet.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {items.map(item => (
                  <div key={item._id} className={`relative flex gap-4 bg-white/5 p-4 rounded-xl border ${item.quantity === 0 ? 'border-red-500/50 opacity-75' : 'border-white/5'}`}>
                    <Link to={`/product/${item.slug}`} onClick={toggleCart}>
                       <img src={item.images[0]} alt={item.name} className="w-20 h-20 object-cover rounded-lg bg-black cursor-pointer hover:opacity-80 transition-opacity" />
                    </Link>
                    <div className="flex-1">
                      <Link to={`/product/${item.slug}`} onClick={toggleCart}>
                          <h3 className="font-bold text-sm truncate hover:text-primary transition-colors cursor-pointer">{item.name}</h3>
                      </Link>
                      <p className="text-gray-400 text-xs mb-2">{item.attributes.brand}</p>
                      
                      {item.quantity === 0 ? (
                          <div className="text-red-500 text-sm font-bold flex items-center gap-1">
                              <AlertTriangle size={14} /> Out of Stock
                          </div>
                      ) : (
                          <div className="flex justify-between items-center">
                            <span className="font-bold">₹{item.price.toLocaleString()}</span>
                            <div className="flex items-center gap-3 bg-black/30 rounded-lg p-1">
                              <button 
                                onClick={() => updateQuantity(item._id, -1)} 
                                className="p-1 hover:text-primary"
                                disabled={item.quantity <= 1}
                              >
                                <Minus size={14} />
                              </button>
                              <span className="text-sm w-4 text-center">{item.quantity}</span>
                              <button 
                                onClick={() => updateQuantity(item._id, 1)} 
                                className="p-1 hover:text-primary"
                                disabled={item.stock && item.quantity >= item.stock}
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                      )}
                    </div>
                    
                    <button onClick={() => removeItem(item._id)} className="text-gray-500 hover:text-red-500 self-start">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {items.length > 0 && (
              <div className="border-t border-white/10 pt-6 mt-4">
                <div className="flex justify-between text-lg font-bold mb-4">
                  <span>Total</span>
                  <span>₹{total().toLocaleString()}</span>
                </div>
                {hasOOSItems ? (
                    <button disabled className="w-full bg-gray-600 text-white/50 font-bold py-4 rounded-xl cursor-not-allowed flex justify-center items-center">
                      Remove Out of Stock Items to Checkout
                    </button>
                ) : (
                    <button 
                      onClick={() => {
                        toggleCart();
                        const token = localStorage.getItem('token');
                        if (token) {
                           window.location.href = '/checkout';
                        } else {
                           window.location.href = '/login?redirect=/checkout';
                        }
                      }}
                      className="w-full bg-primary text-white font-bold py-4 rounded-xl hover:bg-red-700 transition-colors flex justify-center items-center"
                    >
                      Checkout Now
                    </button>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
