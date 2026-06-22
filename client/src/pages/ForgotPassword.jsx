import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, KeyRound } from 'lucide-react';

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await axios.post('/api/auth/forgot-password', { email });
      setMessage(res.data.message);
      setStep(2);
      setResendTimer(300);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await axios.post('/api/auth/reset-password', { email, otp, newPassword });
      setMessage(res.data.message);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 px-4 flex items-center justify-center">
      <div className="bg-surface p-8 rounded-xl border border-white/10 w-full max-w-md">
        <div className="flex justify-center mb-6">
           <div className="p-3 bg-primary/20 rounded-full text-primary">
             {step === 1 ? <Mail size={32} /> : <KeyRound size={32} />}
           </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center mb-2">
            {step === 1 ? 'Forgot Password' : 'Reset Password'}
        </h2>
        <p className="text-center text-gray-400 text-sm mb-6">
            {step === 1 
                ? 'Enter your email to receive a 6-digit recovery code.' 
                : 'Enter the 6-digit code sent to your email and your new password.'}
        </p>
        
        {error && <div className="bg-red-500/10 text-red-500 p-3 rounded mb-4 text-center text-sm">{error}</div>}
        {message && <div className="bg-green-500/10 text-green-500 p-3 rounded mb-4 text-center text-sm">{message}</div>}

        {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Registered Email</label>
                <input 
                  type="email" 
                  className="w-full bg-black/30 border border-white/10 rounded p-3 outline-none focus:border-primary"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="wheelriot@example.com"
                  required
                />
              </div>
              <button 
                disabled={loading}
                className="w-full bg-primary py-3 rounded-lg font-bold hover:bg-red-700 transition disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send OTP Code'}
              </button>
            </form>
        ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">6-Digit OTP</label>
                <input 
                  type="text" 
                  maxLength="6"
                  className="w-full bg-black/30 border border-white/10 rounded p-3 outline-none focus:border-primary font-mono tracking-widest text-center text-lg"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="------"
                  required
                />
                <p className="text-xs text-gray-500 mt-1 text-center">OTP expires in 5 minutes.</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">New Password</label>
                <input 
                  type="password" 
                  className="w-full bg-black/30 border border-white/10 rounded p-3 outline-none focus:border-primary"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <button 
                disabled={loading}
                className="w-full bg-primary py-3 rounded-lg font-bold hover:bg-red-700 transition disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Reset Password'}
              </button>
              
              <div className="text-center pt-2">
                  <button 
                      type="button" 
                      onClick={handleSendOtp} 
                      disabled={resendTimer > 0 || loading}
                      className="text-sm text-gray-400 hover:text-white disabled:opacity-50 transition"
                  >
                      {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP Code'}
                  </button>
              </div>
            </form>
        )}

        <div className="mt-6 text-center text-sm">
            <Link to="/login" className="text-gray-500 hover:text-white flex items-center justify-center gap-1">
                &larr; Back to Login
            </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
