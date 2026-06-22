import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { UserPlus, MailCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Signup = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '' });
  const [otp, setOtp] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await axios.post('/api/auth/send-signup-otp', { email: formData.email, fullName: formData.fullName, password: formData.password });
      setMessage(res.data.message);
      setStep(2);
      setResendTimer(300);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await axios.post('/api/auth/register', { ...formData, otp });
      loginUser(res.data.user, res.data.token);
      navigate('/profile');
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  return (
    <div className="min-h-screen pt-20 px-4 flex items-center justify-center">
      <div className="bg-surface p-8 rounded-xl border border-white/10 w-full max-w-md">
        <div className="flex justify-center mb-6">
           <div className="p-3 bg-primary/20 rounded-full text-primary">
             {step === 1 ? <UserPlus size={32} /> : <MailCheck size={32} />}
           </div>
        </div>
        <h2 className="text-2xl font-bold text-center mb-6">Join the Club</h2>
        
        {error && <div className="bg-red-500/10 text-red-500 p-3 rounded mb-4 text-center text-sm">{error}</div>}
        {message && <div className="bg-green-500/10 text-green-500 p-3 rounded mb-4 text-center text-sm">{message}</div>}

        {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Full Name</label>
                <input 
                  className="w-full bg-black/30 border border-white/10 rounded p-3 outline-none focus:border-primary"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  required
                />
              </div>
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
              </div>
              <button disabled={loading} className="w-full bg-primary py-3 rounded-lg font-bold hover:bg-red-700 transition disabled:opacity-50">
                  {loading ? 'Sending OTP Code...' : 'Create Account'}
              </button>
            </form>
        ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
               <div>
                  <label className="block text-sm text-gray-400 mb-1">Enter 6-Digit OTP</label>
                  <input 
                    type="text" 
                    maxLength="6"
                    className="w-full bg-black/30 border border-white/10 rounded p-3 outline-none focus:border-primary font-mono tracking-widest text-center text-lg"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2 text-center">We sent a verification code to {formData.email}</p>
                  <p className="text-xs text-gray-500 mt-1 text-center">OTP expires in 5 minutes.</p>
                </div>
                <button disabled={loading} className="w-full bg-primary py-3 rounded-lg font-bold hover:bg-red-700 transition disabled:opacity-50">
                    {loading ? 'Verifying...' : 'Verify Email & Login'}
                </button>
                
                <div className="text-center pt-2 border-t border-white/10 mt-4">
                    <button 
                        type="button" 
                        onClick={handleSendOtp} 
                        disabled={resendTimer > 0 || loading}
                        className="text-sm text-gray-400 hover:text-white disabled:opacity-50 transition mt-4"
                    >
                        {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP Code'}
                    </button>
                </div>

                <div className="text-center mt-2">
                    <button type="button" onClick={() => setStep(1)} className="w-full text-sm text-gray-500 py-1 hover:text-white transition">
                        &larr; Back to full Signup form
                    </button>
                </div>
            </form>
        )}
        
        {step === 1 && (
            <p className="text-center text-gray-500 text-sm mt-6">
              Already a member? <Link to="/login" className="text-primary hover:underline">Login</Link>
            </p>
        )}
      </div>
    </div>
  );
};

export default Signup;
