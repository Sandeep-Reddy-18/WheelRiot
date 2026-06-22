import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedUserRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
      return (
          <div className="min-h-screen bg-black flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
      );
  }

  if (!user) console.warn("ProtectedUserRoute: No User, Redirecting to /login");

  return user ? <Outlet /> : <Navigate to="/login" state={{ from: location }} replace />;
};

export default ProtectedUserRoute;
