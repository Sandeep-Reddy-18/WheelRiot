import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const Dashboard = () => {
  const [activity, setActivity] = useState([]);
  const [stats, setStats] = useState({ totalSales: 0, activeOrders: 0, traffic: 0, activeUsers: 0, salesTrend: [] });
  const [walletBalance, setWalletBalance] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);

  const fetchWallet = async () => {
      setWalletLoading(true);
      try {
          const res = await axios.get('/api/shipping/admin-data');
          if (res.data && res.data.balance !== undefined) {
              setWalletBalance(res.data.balance);
          }
      } catch (err) {
          console.error('Wallet fetch error', err);
      } finally {
          setWalletLoading(false);
      }
  };

  const fetchStats = () => {
    fetch('/api/stats')
        .then(res => res.json())
        .then(data => setStats(data))
        .catch(err => console.error(err));

    fetch('/api/logs?limit=5')
      .then(res => res.json())
      .then(data => setActivity(data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchStats();
    fetchWallet();
    const interval = setInterval(fetchStats, 5000); 
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <div className="bg-surface p-6 rounded-xl border border-white/10">
          <h3 className="text-gray-400 text-sm mb-2">Total Sales</h3>
          <p className="text-3xl font-bold">₹{stats.totalSales?.toLocaleString() || 0}</p>
          <p className="text-green-500 text-sm mt-2 mb-4">Lifetime Revenue</p>
          <div className="pt-4 border-t border-white/10 flex justify-between gap-2 text-sm">
              <div className="flex-1"><span className="text-gray-400 block text-xs">Today</span> <span className="text-green-400 font-bold">₹{stats.todayCollected?.toLocaleString() || 0}</span></div>
              <div className="text-right flex-1"><span className="text-gray-400 block text-xs">Ship Cost</span> <span className="text-red-400 font-bold">₹{stats.todayShippingSpent?.toLocaleString() || 0}</span></div>
          </div>
        </div>
        <div className="bg-surface p-6 rounded-xl border border-white/10">
          <h3 className="text-gray-400 text-sm mb-2">Active Orders</h3>
          <p className="text-3xl font-bold">{stats.activeOrders}</p>
          <p className="text-yellow-500 text-sm mt-2">Processing / Shipped</p>
        </div>
        <div className="bg-surface p-6 rounded-xl border border-white/10">
          <h3 className="text-gray-400 text-sm mb-2">Delivered</h3>
          <p className="text-3xl font-bold">{stats.deliveredOrders || 0}</p>
          <p className="text-green-500 text-sm mt-2">Completed Orders</p>
        </div>
        <div className="bg-surface p-6 rounded-xl border border-white/10">
          <h3 className="text-gray-400 text-sm mb-2">Site Traffic</h3>
          <p className="text-3xl font-bold">{stats.traffic.toLocaleString()}</p>
          <p className="text-blue-500 text-sm mt-2">Active users: {stats.activeUsers}</p>
        </div>
        <div className="bg-surface p-6 rounded-xl border border-white/10 flex flex-col justify-between">
          <div>
             <h3 className="text-gray-400 text-sm mb-2 flex justify-between items-center">
                 Wallet
                 <button onClick={fetchWallet} disabled={walletLoading} className="text-xs text-primary hover:text-white transition-colors disabled:opacity-50">
                     {walletLoading ? '↻' : 'Refresh'}
                 </button>
             </h3>
             <p className="text-3xl font-bold">{walletBalance !== null ? `₹${Number(walletBalance).toLocaleString()}` : '---'}</p>
          </div>
          <p className="text-purple-500 text-sm mt-2">ShipRocket Balance</p>
        </div>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-surface p-6 rounded-xl border border-white/10 h-[400px]" style={{ minWidth: 0 }}>
          <h3 className="text-xl font-bold mb-4 text-white">Sales Trend (7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats.salesTrend}>
                  <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="_id" stroke="#666" fontSize={12} tickFormatter={(str) => str.slice(5)} />
                  <YAxis stroke="#666" fontSize={12} />
                  <Tooltip 
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#ef4444" fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-4 bg-surface p-6 rounded-xl border border-white/10 h-[400px]" style={{ minWidth: 0 }}>
           <h3 className="text-xl font-bold mb-4 text-white">Volume Breakdown</h3>
           <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="_id" stroke="#666" fontSize={12} tickFormatter={(str) => str.slice(5)} />
                  <Tooltip 
                      cursor={{fill: 'rgba(255,255,255,0.05)'}}
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                  />
                  <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
           </ResponsiveContainer>
        </div>
      </div>

      {/* Activity & Additional Data */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-surface p-6 rounded-xl border border-white/10">
          <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold text-white">Recent Activity Stream</h3>
               <a href="/admin/logs" className="text-sm text-primary hover:text-red-400 font-bold transition-colors">View System Logs</a>
          </div>
          <div className="space-y-4">
            {activity.length > 0 ? activity.map((log) => (
               <div key={log._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-4 gap-2">
                  <div>
                    <p className="font-bold text-gray-200">{log.action}</p>
                    <p className="text-xs text-gray-500">Actor: {log.actor?.username || 'System'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
               </div>
            )) : (
               <p className="text-gray-500 py-10 text-center italic">No recent system activity recorded.</p>
            )}
          </div>
        </div>
        
        <div className="lg:col-span-4 space-y-6">
            <div className="bg-surface p-6 rounded-xl border border-white/10">
                <h3 className="font-bold mb-2">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                    <a href="/admin/products" className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-center text-sm transition-colors">Products</a>
                    <a href="/admin/orders" className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-center text-sm transition-colors">Orders</a>
                    <a href="/admin/coupons" className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-center text-sm transition-colors">Coupons</a>
                    <a href="/admin/settings" className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-center text-sm transition-colors">Settings</a>
                </div>
            </div>
            
            <div className="bg-primary/10 p-6 rounded-xl border border-primary/20">
                <h3 className="font-bold text-primary mb-2">Performance Tip</h3>
                <p className="text-sm text-gray-400">Regularly check your ShipRocket wallet to avoid delays in AWB generation during peak hours.</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
