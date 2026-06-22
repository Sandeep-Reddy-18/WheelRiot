import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { User } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const redirect = location.state?.from?.pathname || searchParams.get('redirect') || '/profile';

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/login', formData);
      loginUser(res.data.user, res.data.token);
      navigate(redirect);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  const { loginUser } = useAuth();
  
  const handleGoogleSuccess = async (credentialResponse) => {
      try {
        const res = await axios.post('/api/auth/google', { token: credentialResponse.credential });
        loginUser(res.data.user, res.data.token);
        navigate(redirect);
      } catch (err) {
        setError('Google Login Failed: ' + (err.response?.data?.error || err.message));
      }
  };

  return (
    <div className="min-h-screen pt-20 px-4 flex items-center justify-center">
      <div className="bg-surface p-8 rounded-xl border border-white/10 w-full max-w-md">
        <div className="flex justify-center mb-6">
           <div className="p-3 bg-primary/20 rounded-full text-primary">
             <User size={32} />
           </div>
        </div>
        <h2 className="text-2xl font-bold text-center mb-6">Welcome Back</h2>
        
        {error && <div className="bg-red-500/10 text-red-500 p-3 rounded mb-4 text-center text-sm">{error}</div>}

        <div className="flex justify-center mb-4 min-h-[44px]">
            <GoogleLogin
               onSuccess={handleGoogleSuccess}
               onError={() => setError('Google Login Failed')}
               useOneTap
            />
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-surface text-gray-500">Or continue with</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input 
              type="email" 
              className="w-full bg-black/30 border border-white/10 rounded p-3 outline-none focus:border-primary"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input 
              type="password" 
              className="w-full bg-black/30 border border-white/10 rounded p-3 outline-none focus:border-primary"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
            />
            <div className="flex justify-end mt-2">
               <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot Password?</Link>
            </div>
          </div>
          <button className="w-full bg-primary py-3 rounded-lg font-bold hover:bg-red-700 transition">Login</button>
        </form>
        
        <p className="text-center text-gray-500 text-sm mt-6">
          New to Wheel Riot? <Link to="/signup" className="text-primary hover:underline">Create Account</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
