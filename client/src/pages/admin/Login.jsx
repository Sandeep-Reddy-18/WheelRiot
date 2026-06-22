import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';


const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { loginAdmin } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      console.log('Login Response:', res.data);
      
      if (res.data.user.role === 'admin' || res.data.user.role === 'co-owner') {
        loginAdmin(res.data.user, res.data.token);
        navigate('/admin');
      } else {
        setError('Access Denied: You do not have admin privileges.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-surface p-8 rounded-xl border border-white/10 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-primary/10 rounded-full">
            <Lock className="text-primary" size={32} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center mb-6">Wheel Riot Admin</h2>
        
        {error && (
          <div className="bg-red-500/10 text-red-500 p-3 rounded-lg mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary"
              placeholder="admin@wheelriot.in"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary"
              placeholder="Password"
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-primary hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors"
          >
            Enter Command Center
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
