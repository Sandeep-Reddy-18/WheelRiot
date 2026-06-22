import React from 'react';
import { motion } from 'framer-motion';

const TyreSmoke = () => {
  return (
    <motion.div
      className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut", delay: 0.2 }}
    >
      {/* Smoke Overlay */}
      <motion.div 
        className="absolute inset-0 bg-zinc-900"
        initial={{ scaleY: 1 }}
        animate={{ scaleY: 0, transformOrigin: 'top' }}
        exit={{ scaleY: 0 }}
        transition={{ duration: 0.8, ease: "easeInOut", delay: 0.2 }}
      />
      
      {/* Spinning Wheel Icon */}
      <motion.div
        className="relative z-10 w-24 h-24 border-8 border-t-primary border-r-gray-700 border-b-gray-700 border-l-gray-700 rounded-full"
        initial={{ opacity: 1, rotate: 0 }}
        animate={{ opacity: 0, rotate: 360 }}
        transition={{ duration: 0.5 }}
      />
    </motion.div>
  );
};

export default TyreSmoke;
