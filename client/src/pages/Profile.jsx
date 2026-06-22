import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Settings, LogOut, User as UserIcon, MapPin, Trash2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MyOrders from './MyOrders';

const Profile = () => {
  const { user, logout, token } = useAuth(); 
  const [activeTab, setActiveTab] = useState('orders');
  
  // Addresses State
  const [addresses, setAddresses] = useState([]);
  const [newAddress, setNewAddress] = useState({ label: '', fullName: '', street: '', city: '', state: '', zip: '', phone: '', country: 'India' });
  const [showAddressForm, setShowAddressForm] = useState(false);

  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '' });
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    setAddresses(user.addresses || []);
  }, [navigate, user]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/auth/change-password', {
        userId: user._id || user.id,
        oldPassword: passForm.currentPassword,
        newPassword: passForm.newPassword
      }, {
         headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Password updated successfully');
      setPassForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update password');
    }
  };

  const handleAddAddress = async (e) => {
      e.preventDefault();
      try {
          const res = await axios.post(`/api/users/${user._id || user.id}/addresses`, newAddress);
          const updatedUser = { ...user, addresses: res.data };
          localStorage.setItem('user', JSON.stringify(updatedUser)); 
          setAddresses(res.data);
          setNewAddress({ label: '', fullName: '', street: '', city: '', state: '', zip: '', phone: '', country: 'India' });
          setShowAddressForm(false);
      } catch (err) {
          alert('Failed to add address');
      }
  };

  const handleDeleteAddress = async (addressId) => {
      if(!window.confirm('Delete this address?')) return;
      try {
          const res = await axios.delete(`/api/users/${user._id || user.id}/addresses/${addressId}`);
          const updatedUser = { ...user, addresses: res.data };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setAddresses(res.data);
      } catch (err) {
          alert('Failed to delete address');
      }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Sidebar */}
        <div className="md:col-span-4 bg-surface border border-white/10 rounded-xl p-6 h-fit">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-primary/20 p-3 rounded-full text-primary">
              <UserIcon size={24} />
            </div>
            <div>
              <h2 className="font-bold">{user.fullName || 'Member'}</h2>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
          </div>
          
          <nav className="space-y-2">
            <button 
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'orders' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
            >
              <Package size={20} />
              <span>Order History</span>
            </button>
            <button 
              onClick={() => setActiveTab('addresses')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'addresses' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
            >
              <MapPin size={20} />
              <span>Saved Addresses</span>
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
            >
              <Settings size={20} />
              <span>Account Settings</span>
            </button>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors mt-8"
            >
              <LogOut size={20} />
              <span>Sign Out</span>
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="md:col-span-8">
          {activeTab === 'orders' && (
              <MyOrders isEmbedded={true} />
          )}

          {activeTab === 'addresses' && (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Saved Addresses</h2>
                    <button onClick={() => setShowAddressForm(!showAddressForm)} className="bg-primary hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
                        <Plus size={18} /> Add New
                    </button>
                </div>

                {showAddressForm && (
                    <form onSubmit={handleAddAddress} className="bg-surface border border-white/10 p-6 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input required placeholder="Label (Home, Work, etc)" className="bg-black/30 border border-white/10 rounded p-3 w-full" value={newAddress.label} onChange={e => setNewAddress({...newAddress, label: e.target.value})} />
                        <input required placeholder="Full Name" className="bg-black/30 border border-white/10 rounded p-3 w-full" value={newAddress.fullName} onChange={e => setNewAddress({...newAddress, fullName: e.target.value})} />
                        <input required placeholder="Street Address" className="bg-black/30 border border-white/10 rounded p-3 w-full md:col-span-2" value={newAddress.street} onChange={e => setNewAddress({...newAddress, street: e.target.value})} />
                        <input required placeholder="City" className="bg-black/30 border border-white/10 rounded p-3 w-full" value={newAddress.city} onChange={e => setNewAddress({...newAddress, city: e.target.value})} />
                        <input required placeholder="State" className="bg-black/30 border border-white/10 rounded p-3 w-full" value={newAddress.state} onChange={e => setNewAddress({...newAddress, state: e.target.value})} />
                        <input required placeholder="Postal Code" className="bg-black/30 border border-white/10 rounded p-3 w-full" value={newAddress.zip} onChange={e => setNewAddress({...newAddress, zip: e.target.value})} />
                        <input required placeholder="Phone Number" className="bg-black/30 border border-white/10 rounded p-3 w-full" value={newAddress.phone} onChange={e => setNewAddress({...newAddress, phone: e.target.value})} />
                        <input required placeholder="Country" className="bg-black/30 border border-white/10 rounded p-3 w-full" value={newAddress.country} onChange={e => setNewAddress({...newAddress, country: e.target.value})} />
                        <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                            <button type="button" onClick={() => setShowAddressForm(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                            <button type="submit" className="bg-primary text-white font-bold px-6 py-2 rounded">Save Address</button>
                        </div>
                    </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.length === 0 && !showAddressForm ? (
                        <div className="md:col-span-2 text-center py-12 bg-surface rounded-xl border border-white/10 text-gray-400">
                            No saved addresses.
                        </div>
                    ) : (
                        addresses.map((addr, idx) => (
                            <div key={idx} className="bg-surface border border-white/10 p-6 rounded-xl relative group">
                                <button onClick={() => handleDeleteAddress(addr._id)} className="absolute top-4 right-4 text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-red-500/10 rounded" title="Delete Address">
                                    <Trash2 size={16} />
                                </button>
                                <span className="bg-white/10 text-white text-xs px-2 py-1 rounded-full mb-3 inline-block font-bold">{addr.label}</span>
                                <h4 className="font-bold mb-1">{addr.fullName}</h4>
                                <p className="text-gray-400 text-sm whitespace-pre-wrap">
                                    {addr.street}<br/>
                                    {addr.city}, {addr.state} {addr.zip}<br/>
                                    Phone: {addr.phone}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-md">
              <h2 className="text-2xl font-bold mb-6">Security Settings</h2>
              <form onSubmit={handlePasswordChange} className="bg-surface border border-white/10 rounded-xl p-6 space-y-4">
                <h3 className="font-bold text-gray-300">Change Password</h3>
                {message && <div className={`p-3 rounded text-sm ${message.includes('success') ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>{message}</div>}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Current Password</label>
                  <input 
                    type="password" 
                    className="w-full bg-black/30 border border-white/10 rounded p-3"
                    value={passForm.currentPassword}
                    onChange={(e) => setPassForm({...passForm, currentPassword: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">New Password</label>
                  <input 
                    type="password" 
                    className="w-full bg-black/30 border border-white/10 rounded p-3"
                    value={passForm.newPassword}
                    onChange={(e) => setPassForm({...passForm, newPassword: e.target.value})}
                  />
                </div>
                 <button className="w-full bg-primary py-3 rounded-lg font-bold hover:bg-red-700 transition">Update Password</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
