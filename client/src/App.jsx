import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import MainLayout from './layouts/MainLayout';
import TyreSmoke from './components/TyreSmoke';
import ScrollToTop from './components/ScrollToTop';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import ProtectedUserRoute from './components/ProtectedUserRoute';

const Home = lazy(() => import('./pages/Home'));
const Shop = lazy(() => import('./pages/Shop'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Profile = lazy(() => import('./pages/Profile'));
const MyOrders = lazy(() => import('./pages/MyOrders'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const Brands = lazy(() => import('./pages/Brands'));
const About = lazy(() => import('./pages/About'));
const Favorites = lazy(() => import('./pages/Favorites'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Admin Pages
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminLogin = lazy(() => import('./pages/admin/Login'));
const ProductManager = lazy(() => import('./pages/admin/ProductManager'));
const OrderManager = lazy(() => import('./pages/admin/OrderManager'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const Logs = lazy(() => import('./pages/admin/Logs'));
const CouponManager = lazy(() => import('./pages/admin/CouponManager'));
const BrandManager = lazy(() => import('./pages/admin/BrandManager'));
const ReviewManager = lazy(() => import('./pages/admin/ReviewManager'));

// Simple Loading Spinner
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-black">
    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);


const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <Suspense fallback={<PageLoader />}>
      <AnimatePresence mode='wait'>
      <TyreSmoke key={location.pathname} />
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="shop" element={<Shop />} />
          <Route path="product/:slug" element={<ProductDetails />} />
          
          {/* User Protected Routes */}
          <Route element={<ProtectedUserRoute />}>
            <Route path="checkout" element={<Checkout />} />
            <Route path="my-orders" element={<MyOrders />} />
            <Route path="profile" element={<Profile />} />
            <Route path="favorites" element={<Favorites />} />
          </Route>
          
          <Route path="order-success/:id" element={<OrderSuccess />} />
          <Route path="brands" element={<Brands />} />
          <Route path="about" element={<About />} />
        </Route>
        
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/signup" element={<Signup />} />
        
        <Route element={<ProtectedAdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Navigate to="/admin" replace />} />
            <Route path="products" element={<ProductManager />} />
            <Route path="orders" element={<OrderManager />} />
            <Route path="settings" element={<Settings />} />
            <Route path="sales" element={<CouponManager />} />
            <Route path="coupons" element={<CouponManager />} />
            <Route path="brands" element={<BrandManager />} />
            <Route path="reviews" element={<ReviewManager />} />
            <Route path="logs" element={<Logs />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  </Suspense>
  );
};

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AnimatedRoutes />
    </Router>
  );
}

export default App;
