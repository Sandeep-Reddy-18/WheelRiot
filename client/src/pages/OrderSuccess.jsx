import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const OrderSuccess = () => {
  const { id } = useParams();

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 flex items-center justify-center">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center max-w-lg"
      >
        <div className="flex justify-center mb-6">
          <CheckCircle className="text-green-500 w-24 h-24" />
        </div>
        <h1 className="text-4xl font-bold mb-4">Order Confirmed!</h1>
        <p className="text-gray-400 mb-8">
          Thank you for choosing Hooligan. Your order <span className="text-white font-mono font-bold">#{id.slice(-6).toUpperCase()}</span> has been placed successfully.
        </p>
        
        <div className="bg-surface p-6 rounded-xl border border-white/10 mb-8">
          <p className="text-sm text-gray-500">A confirmation email has been sent to your inbox. Use this Order ID to track your shipment.</p>
        </div>

        <div className="flex gap-4 justify-center">
            <Link to="/profile" className="bg-white/10 text-white px-8 py-3 rounded-full font-bold hover:bg-white/20 transition-colors">
              Go to Orders
            </Link>
            <Link to="/shop" className="bg-primary px-8 py-3 rounded-full font-bold hover:bg-red-700 transition-colors">
              Continue Shopping
            </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default OrderSuccess;
