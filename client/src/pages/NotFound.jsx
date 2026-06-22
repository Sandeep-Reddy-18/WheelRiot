import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center pt-24 pb-12 px-4 text-center">
      <h1 className="text-9xl font-bold text-primary mb-4 animate-pulse">404</h1>
      <h2 className="text-3xl font-bold mb-6 text-white">Page Not Found</h2>
      <p className="text-gray-400 mb-8 max-w-md mx-auto">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      <Link 
        to="/" 
        className="bg-primary text-white font-bold py-3 px-8 rounded-lg hover:bg-red-700 transition-colors"
      >
        Return to Home
      </Link>
    </div>
  );
};

export default NotFound;
