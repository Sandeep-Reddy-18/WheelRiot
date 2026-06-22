import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Lock, Package, Truck, CreditCard, MessageSquare } from 'lucide-react';
import axios from 'axios';
import AdminAvatar from '../../components/admin/AdminAvatar';

const Settings = () => {
  const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' });
  const [message, setMessage] = useState(null);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);

  useEffect(() => {
      axios.get('/api/settings/lowStockThreshold')
        .then(res => setLowStockThreshold(res.data || 5))
        .catch(err => console.error(err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    try {
      const userStr = localStorage.getItem('hooligan_admin');
      if (!userStr) {
          setMessage({ type: 'error', text: 'You need to re-login to update settings.' });
          return;
      }
      const userId = JSON.parse(userStr)._id; 

      const res = await axios.post('/api/auth/change-password', {
        userId,
        oldPassword: passwords.old,
        newPassword: passwords.new
      });
      
      setMessage({ type: 'success', text: res.data.message });
      setPasswords({ old: '', new: '', confirm: '' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update password' });
    }
  };

  return (
    <div className="p-6 text-white">
      <div className="flex items-center gap-4 mb-8">
        <AdminAvatar size={48} />
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

        <div className="mb-8 p-6 bg-white/5 rounded-xl border border-white/10">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Package size={20} className="text-primary" />
                Inventory Preferences
            </h2>
            <div className="flex flex-col gap-2">
                <label className="text-sm text-gray-400">Low Stock Threshold</label>
                <div className="flex flex-col sm:flex-row gap-4">
                    <input 
                        type="number" 
                        min="0"
                        className="flex-1 w-full bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary outline-none"
                        value={lowStockThreshold}
                        onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                    />
                    <button 
                        onClick={async () => {
                            try {
                                await axios.put('/api/settings/lowStockThreshold', { value: lowStockThreshold });
                                setMessage({ type: 'success', text: 'Preferences saved.' });
                            } catch(err) {
                                setMessage({ type: 'error', text: 'Failed to save settings.' });
                            }
                        }} 
                        className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg font-bold"
                    >
                        Save
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Products with stock below this number will be highlighted in the manager.</p>
            </div>
        </div>

        <div className="bg-white/5 p-8 rounded-2xl border border-white/10">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Lock size={20} className="text-primary" />
          Change Password
        </h2>

        {message && (
          <div className={`p-4 rounded-lg mb-6 ${message.type === 'error' ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Old Password</label>
            <input 
              type="password" 
              required
              className="w-full bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary outline-none"
              value={passwords.old}
              onChange={e => setPasswords({...passwords, old: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">New Password</label>
            <input 
              type="password" 
              required
              className="w-full bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary outline-none"
              value={passwords.new}
              onChange={e => setPasswords({...passwords, new: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Confirm New Password</label>
            <input 
              type="password" 
              required
              className="w-full bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary outline-none"
              value={passwords.confirm}
              onChange={e => setPasswords({...passwords, confirm: e.target.value})}
            />
          </div>

          <button type="submit" className="w-full bg-primary py-3 rounded-lg font-bold hover:bg-red-700 transition-colors flex justify-center items-center gap-2">
            <Save size={18} />
            Update Password
          </button>
        </form>
        </div>
        <div className="bg-white/5 p-8 rounded-2xl border border-white/10 mt-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Truck size={20} className="text-primary" />
                Shipping Rules
            </h2>
            <ShippingRulesSettings />
        </div>

        <div className="bg-white/5 p-8 rounded-2xl border border-white/10 mt-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Truck size={20} className="text-primary" />
                ShipRocket Configuration
            </h2>
            <ShipRocketSettings />
        </div>

        <div className="bg-white/5 p-8 rounded-2xl border border-white/10 mt-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <CreditCard size={20} className="text-primary" />
                Razorpay Configuration
            </h2>
            <RazorpaySettings />
        </div>

        <div className="bg-white/5 p-8 rounded-2xl border border-white/10 mt-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <MessageSquare size={20} className="text-[#5865F2]" />
                Discord Order Webhooks
            </h2>
            <DiscordSettings />
        </div>
    </div>
  );
};

const ShipRocketSettings = () => {
    const [config, setConfig] = useState({
        shipRocketEnabled: false,
        shipRocketEmail: '',
        shipRocketPassword: '',
        shipRocketPickupPincode: ''
    });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const keys = ['shipRocketEnabled', 'shipRocketEmail', 'shipRocketPassword', 'shipRocketPickupPincode'];
            const newConfig = { ...config };
            
            for (const key of keys) {
                try {
                    const res = await axios.get(`/api/settings/admin/${key}`);
                    newConfig[key] = res.data ?? '';
                } catch (e) {  }
            }
            setConfig(newConfig);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setConfig(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSave = async () => {
        setMessage(null);
        try {
            await Promise.all([
                axios.put('/api/settings/shipRocketEnabled', { value: config.shipRocketEnabled }),
                axios.put('/api/settings/shipRocketEmail', { value: config.shipRocketEmail }),
                axios.put('/api/settings/shipRocketPassword', { value: config.shipRocketPassword }),
                axios.put('/api/settings/shipRocketPickupPincode', { value: config.shipRocketPickupPincode })
            ]);
            setMessage({ type: 'success', text: 'ShipRocket settings saved.' });
        } catch (err) {
            console.error('Save Failed:', err);
            setMessage({ 
                type: 'error', 
                text: err.response?.data?.error || err.message || 'Failed to save ShipRocket settings.' 
            });
        }
    };

    if (loading) return <div>Loading config...</div>;

    return (
        <div className="space-y-4">
            {message && (
              <div className={`p-3 rounded-lg text-sm font-bold ${message.type === 'error' ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                {message.text}
              </div>
            )}

            <div className="flex items-center gap-2 mb-4">
                <input 
                    type="checkbox" 
                    id="sr_enabled"
                    name="shipRocketEnabled"
                    checked={config.shipRocketEnabled}
                    onChange={handleChange}
                    className="w-5 h-5 accent-primary"
                />
                <label htmlFor="sr_enabled" className="text-white font-bold cursor-pointer">Enable ShipRocket Integration</label>
            </div>

            {config.shipRocketEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Login Email</label>
                        <input 
                            type="email" 
                            name="shipRocketEmail"
                            value={config.shipRocketEmail}
                            onChange={handleChange}
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary outline-none"
                            placeholder={config.shipRocketEmail ? config.shipRocketEmail : "Enter email"}
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Password</label>
                        <input 
                            type="password" 
                            name="shipRocketPassword"
                            value={config.shipRocketPassword}
                            onChange={handleChange}
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary outline-none"
                            placeholder="ShipRocket Password"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Pickup Pincode (Your Warehouse)</label>
                        <input 
                            type="text" 
                            name="shipRocketPickupPincode"
                            value={config.shipRocketPickupPincode}
                            onChange={handleChange}
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary outline-none"
                            placeholder={config.shipRocketPickupPincode ? config.shipRocketPickupPincode : "e.g. 110001"}
                        />
                    </div>
                </div>
            )}
            
            <button 
                onClick={handleSave}
                className="bg-primary hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold mt-4"
            >
                Save Configuration
            </button>
        </div>
    );
};

const ShippingRulesSettings = () => {
    const [shippingRules, setShippingRules] = useState({
        flatRate: 40,
        freeThreshold: 1000,
        premiumSurcharge: 150,
        pickupLocation: 'Primary'
    });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);
    const [pickupLocations, setPickupLocations] = useState([]);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const [rate, threshold, surcharge, pickup, adminDataRes] = await Promise.all([
                axios.get('/api/settings/shippingFlatRate').catch(() => ({ data: { value: 40 }})),
                axios.get('/api/settings/shippingFreeThreshold').catch(() => ({ data: { value: 1000 }})),
                axios.get('/api/settings/shippingPremiumSurcharge').catch(() => ({ data: { value: 150 }})),
                axios.get('/api/settings/shipRocketPickupLocation').catch(() => ({ data: { value: 'Primary' }})),
                axios.get('/api/shipping/admin-data').catch(() => ({ data: { pickupLocations: [] } }))
            ]);
            setShippingRules({
                flatRate: rate.data?.value ?? 40,
                freeThreshold: threshold.data?.value ?? 1000,
                premiumSurcharge: surcharge.data?.value ?? 150,
                pickupLocation: pickup.data?.value ?? 'Primary'
            });
            setPickupLocations(adminDataRes.data?.pickupLocations || []);
            setLoading(false);
        } catch (err) {
            console.error('Failed to load settings', err);
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setShippingRules(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSaveShippingRules = async () => {
        setMessage(null);
        try {
            await Promise.all([
                axios.put('/api/settings/shippingFlatRate', { value: Number(shippingRules.flatRate) }),
                axios.put('/api/settings/shippingFreeThreshold', { value: Number(shippingRules.freeThreshold) }),
                axios.put('/api/settings/shippingPremiumSurcharge', { value: Number(shippingRules.premiumSurcharge) }),
                axios.put('/api/settings/shipRocketPickupLocation', { value: shippingRules.pickupLocation })
            ]);
            setMessage({ type: 'success', text: 'Shipping rules saved.' });
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Failed to save rules.' });
        }
    };

    if (loading) return <div>Loading rules...</div>;

    return (
        <div className="space-y-4">
            {message && (
              <div className={`p-3 rounded-lg text-sm font-bold ${message.type === 'error' ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                {message.text}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Flat Shipping Rate (₹)</label>
                    <input 
                        type="number" 
                        name="flatRate"
                        value={shippingRules.flatRate}
                        onChange={handleChange}
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">Applied if order is below threshold.</p>
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Free Shipping Threshold (₹)</label>
                    <input 
                        type="number" 
                        name="freeThreshold"
                        value={shippingRules.freeThreshold}
                        onChange={handleChange}
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">Orders above this amount get free standard shipping.</p>
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Premium Air Surcharge (₹)</label>
                    <input 
                        type="number" 
                        name="premiumSurcharge"
                        value={shippingRules.premiumSurcharge}
                        onChange={handleChange}
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">Extra cost added for Premium Air option.</p>
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">ShipRocket Pickup Location</label>
                    {pickupLocations.length > 0 ? (
                        <select 
                            name="pickupLocation"
                            value={shippingRules.pickupLocation}
                            onChange={handleChange}
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary outline-none"
                        >
                            <option value="">Select Location</option>
                            {pickupLocations.map((loc, i) => (
                                <option key={i} value={loc.pickup_location}>{loc.pickup_location} ({loc.pin_code})</option>
                            ))}
                        </select>
                    ) : (
                        <input 
                            type="text" 
                            name="pickupLocation"
                            value={shippingRules.pickupLocation}
                            onChange={handleChange}
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary outline-none"
                            placeholder="e.g. Primary"
                        />
                    )}
                </div>
            </div>

            <button 
                onClick={handleSaveShippingRules}
                className="bg-primary hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold mt-4"
            >
                Save Rules
            </button>
        </div>
    );
};

const RazorpaySettings = () => {
    const [config, setConfig] = useState({
        razorpayEnabled: false,
        razorpayKeyId: '',
        razorpaySecret: '',
        razorpayWebhookSecret: ''
    });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const keys = ['razorpayEnabled', 'razorpayKeyId', 'razorpaySecret', 'razorpayWebhookSecret'];
            const newConfig = { ...config };
            
            for (const key of keys) {
                try {
                    const res = await axios.get(`/api/settings/admin/${key}`);
                    newConfig[key] = res.data ?? '';
                } catch (e) {  }
            }
            setConfig(newConfig);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setConfig(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSave = async () => {
        setMessage(null);
        try {
            await Promise.all([
                axios.put('/api/settings/razorpayEnabled', { value: config.razorpayEnabled }),
                axios.put('/api/settings/razorpayKeyId', { value: config.razorpayKeyId }),
                axios.put('/api/settings/razorpaySecret', { value: config.razorpaySecret }),
                axios.put('/api/settings/razorpayWebhookSecret', { value: config.razorpayWebhookSecret })
            ]);
            setMessage({ type: 'success', text: 'Razorpay settings saved.' });
        } catch (err) {
            console.error('Save Failed:', err);
            setMessage({ 
                type: 'error', 
                text: err.response?.data?.error || err.message || 'Failed to save Razorpay settings.' 
            });
        }
    };

    if (loading) return <div>Loading config...</div>;

    return (
        <div className="space-y-4">
            {message && (
              <div className={`p-3 rounded-lg text-sm font-bold ${message.type === 'error' ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                {message.text}
              </div>
            )}

            <div className="flex items-center gap-2 mb-4">
                <input 
                    type="checkbox" 
                    id="rzp_enabled"
                    name="razorpayEnabled"
                    checked={config.razorpayEnabled}
                    onChange={handleChange}
                    className="w-5 h-5 accent-primary"
                />
                <label htmlFor="rzp_enabled" className="text-white font-bold cursor-pointer">Enable Razorpay Integration</label>
            </div>

            {config.razorpayEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Key ID</label>
                        <input 
                            type="text" 
                            name="razorpayKeyId"
                            value={config.razorpayKeyId}
                            onChange={handleChange}
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary outline-none"
                            placeholder="rzp_test_... or rzp_live_..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Key Secret</label>
                        <input 
                            type="password" 
                            name="razorpaySecret"
                            value={config.razorpaySecret}
                            onChange={handleChange}
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary outline-none"
                            placeholder="Razorpay Secret"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Webhook Secret</label>
                        <input 
                            type="password" 
                            name="razorpayWebhookSecret"
                            value={config.razorpayWebhookSecret}
                            onChange={handleChange}
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 focus:border-primary outline-none"
                            placeholder="Webhook Secret"
                        />
                    </div>
                </div>
            )}
            
            <button 
                onClick={handleSave}
                className="bg-primary hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold mt-4"
            >
                Save Configuration
            </button>
        </div>
    );
};

const DiscordSettings = () => {
    const [webhookUrl, setWebhookUrl] = useState('');
    const [webhookContent, setWebhookContent] = useState('A new secure order has been received on WheelRiot!');
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        axios.get('/api/settings/admin/discordWebhookUrl').then(r => r.data && setWebhookUrl(r.data)).catch(()=>{});
        axios.get('/api/settings/admin/discordWebhookContent').then(r => r.data && setWebhookContent(r.data.replace(/&lt;/g, '<').replace(/&gt;/g, '>'))).catch(()=>{});
    }, []);
    
    const handleSave = async () => {
        setLoading(true);
        try {
            await axios.put('/api/settings/discordWebhookUrl', { value: webhookUrl });
            await axios.put('/api/settings/discordWebhookContent', { value: webhookContent });
            alert("Discord Webhook Bindings Saved!");
        } catch(e) { alert("Failed to save binding integrations"); }
        setLoading(false);
    }
    
    const handleTest = async () => {
        setLoading(true);
        try {
            await axios.post('/api/settings/test-discord');
            alert("Test Webhook Packets Sent Successfully!");
        } catch(e) { alert("Test dispatch packet failure. Verify URL."); }
        setLoading(false);
    }
    
    return (
        <div className="space-y-4">
            <div>
               <label className="text-gray-400 block mb-1 text-sm">Discord Webhook Channel URL</label>
               <input className="w-full bg-black/50 border border-white/10 rounded p-2 focus:border-[#5865F2] outline-none" type="url" placeholder="https://discord.com/api/webhooks/..." value={webhookUrl} onChange={e=>setWebhookUrl(e.target.value)} />
            </div>
            <div>
               <label className="text-gray-400 block mb-1 text-sm">Ping Content Base (Max 1500 chars)</label>
               <textarea className="w-full bg-black/50 border border-white/10 rounded p-2 h-24 focus:border-[#5865F2] outline-none" maxLength={1500} value={webhookContent} onChange={e=>setWebhookContent(e.target.value)} />
            </div>
            <div className="flex gap-4 border-t border-white/5 pt-4">
                <button onClick={handleSave} disabled={loading} className="bg-[#5865F2] hover:bg-[#4752C4] font-bold px-6 py-2 rounded-lg flex items-center gap-2 transition-colors text-white text-sm"><Save size={16}/> Save Webhook</button>
                <button onClick={handleTest} disabled={loading} className="bg-white/10 hover:bg-white/20 font-bold px-6 py-2 rounded-lg transition-colors text-white text-sm">Ping Test Payload</button>
            </div>
        </div>
    );
}

export default Settings;
