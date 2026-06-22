import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedAdminRoute = () => {
  const { admin, loading } = useAuth();

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Verifying Admin Access...</div>;

  if (!admin) console.warn("ProtectedAdminRoute: No Admin Session, Redirecting to /admin/login");

  return admin ? <Outlet /> : <Navigate to="/admin/login" replace />;
};

export default ProtectedAdminRoute;
