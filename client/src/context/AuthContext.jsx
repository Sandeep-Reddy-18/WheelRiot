import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import useCartStore from '../store/cartStore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { fetchCart, setUserId, clearCart } = useCartStore();

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response && error.response.status === 401) {
          if (window.location.pathname.startsWith('/admin')) {
              localStorage.removeItem('token');
              localStorage.removeItem('wheelriot_admin');
              window.location.href = '/admin/login';
          } else {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              delete axios.defaults.headers.common['Authorization'];
              window.location.href = '/login?expired=true';
          }
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  useEffect(() => {
    const checkTokenExpiry = () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const payload = JSON.parse(atob(storedToken.split('.')[1]));
          if (payload.exp * 1000 < Date.now()) {
             localStorage.removeItem('token');
             localStorage.removeItem('user');
             delete axios.defaults.headers.common['Authorization'];
             window.location.href = '/login?expired=true';
          }
        } catch(e) {
        }
      }
    };
    
    checkTokenExpiry();
    const interval = setInterval(checkTokenExpiry, 60000);
    return () => clearInterval(interval);
  }, []);

  // Admin Inactivity Timeout
  useEffect(() => {
    let timeout;
    
    const resetTimer = () => {
      if (admin) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          logoutAdmin();
          alert("Session expired due to inactivity.");
        }, 10 * 60 * 1000);
      }
    };

    if (admin) {
      window.addEventListener('mousemove', resetTimer);
      window.addEventListener('keydown', resetTimer);
      window.addEventListener('click', resetTimer);
      resetTimer();
    }

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
    };
  }, [admin]);

  useEffect(() => {
    const initAuth = () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = JSON.parse(localStorage.getItem('user'));
      const storedAdmin = JSON.parse(localStorage.getItem('wheelriot_admin'));

      if (storedToken) {
        setToken(storedToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        if (storedUser) {
          setUser(storedUser);
          setUserId(storedUser._id);
          fetchCart(storedUser._id);
        }
        if (storedAdmin) setAdmin(storedAdmin);
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const loginUser = (userData, authToken) => {
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(authToken);
    setUser(userData);
    setUserId(userData._id);
    fetchCart(userData._id);
    axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
  };

  const loginAdmin = (adminData, authToken) => {
    localStorage.setItem('token', authToken);
    localStorage.setItem('wheelriot_admin', JSON.stringify(adminData));
    setToken(authToken);
    setAdmin(adminData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    setToken(null);
    setUser(null);
    setUserId(null);
    clearCart();
    delete axios.defaults.headers.common['Authorization'];
    window.location.href = '/login'; 
  };
  
  const logoutAdmin = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('wheelriot_admin');
      setAdmin(null);
      setToken(null);
      delete axios.defaults.headers.common['Authorization'];
      window.location.href = '/admin/login';
  };

  return (
    <AuthContext.Provider value={{ user, admin, token, loginUser, loginAdmin, logout, logoutAdmin, loading, setShowLoginModal }}>
      {!loading && children}

    </AuthContext.Provider>
  );
};
