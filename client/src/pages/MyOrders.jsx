import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Truck, Calendar, ShoppingCart, RefreshCw, ExternalLink, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import useCartStore from '../store/cartStore';
import { useAuth } from '../context/AuthContext';

const MyOrders = ({ isEmbedded = false }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedAddressId, setExpandedAddressId] = useState(null);
  const { addItem, fetchCart } = useCartStore();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
        fetchOrders();
    } else {
        setLoading(false);
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`/api/orders/my-orders?userId=${user?._id || user?.id || ''}`);
      setOrders(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleCancel = async (orderId) => {
    if(!window.confirm('Are you sure you want to cancel this order? If it is already paid, a refund will be issued.')) return;
    try {
        await axios.put(`/api/orders/${orderId}/archive`);
        fetchOrders();
    } catch (err) {
        alert(err.response?.data?.error || 'Failed to cancel order');
    }
  };

  const handleRetryPayment = async (order) => {
      try {
          const res = await axios.post(`/api/orders/${order._id}/retry-payment`);
          const rzpOrderId = res.data.razorpayOrder.id;

          if (!document.getElementById('razorpay-script')) {
              const script = document.createElement('script');
              script.src = 'https://checkout.razorpay.com/v1/checkout.js';
              script.id = 'razorpay-script';
              document.body.appendChild(script);
              await new Promise(resolve => script.onload = resolve);
          }

          let rzpKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_YOUR_ID';
          try {
              const keyRes = await axios.get('/api/settings/razorpayKeyId');
              if (keyRes.data) rzpKeyId = keyRes.data;
          } catch (e) {
              console.error("Failed to fetch Razorpay Key ID", e);
          }

          const options = {
              "key": rzpKeyId,
              "amount": res.data.razorpayOrder.amount,
              "currency": "INR",
              "name": "WheelRiot",
              "description": "Retry Order #" + order._id.slice(-6).toUpperCase(),
              "image": window.location.origin + "/wheelriot_full-logo.png",
              "order_id": rzpOrderId,
              "timeout": 300,
              "config": {
                  "display": {
                      "blocks": {
                          "banks": {
                              "name": "Pay using Card or UPI",
                              "instruments": [
                                  { "method": "upi" },
                                  { "method": "card" }
                              ]
                          }
                      },
                      "sequence": ["block.banks"],
                      "preferences": { "show_default_blocks": false }
                  }
              },
              "handler": async function (response) {
                  try {
                      const verifyRes = await axios.post('/api/orders/verify-payment', {
                          orderId: order._id,
                          razorpay_payment_id: response.razorpay_payment_id,
                          razorpay_order_id: response.razorpay_order_id,
                          razorpay_signature: response.razorpay_signature
                      });
                      if (verifyRes.data.success) {
                          navigate(`/order-success/${order._id}`);
                      }
                  } catch (err) {
                      alert('Payment verification failed.');
                      fetchOrders();
                  }
              },
              "prefill": {
                  "name": order.shippingAddress.label || order.shippingAddress.fullName || '',
                  "contact": order.shippingAddress.phone || ''
              },
              "theme": {
                  "color": "#DB0000"
              }
          };

          const rzp = new window.Razorpay(options);
          rzp.on('payment.failed', function (response){
              alert("Payment Failed: " + response.error.description);
          });
          rzp.open();
      } catch (err) {
          alert(err.response?.data?.error || 'Failed to initialize retry payment');
      }
  };

  return (
    <div className={isEmbedded ? "" : "pt-24 pb-12 px-4 max-w-7xl mx-auto"}>
      {!isEmbedded && <h1 className="text-3xl font-bold mb-8">Order History</h1>}

      {loading ? (
        <div className="text-gray-500">Loading records...</div>
      ) : orders.length === 0 ? (
        <div className="bg-surface p-8 rounded-xl border border-white/10 text-center">
          <p>No orders found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map(order => (
            <div key={order._id} className="bg-surface rounded-xl border border-white/10 overflow-hidden">
              <div className="bg-white/5 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm gap-4">
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                  <div>
                    <span className="text-gray-400 block text-xs uppercase">Order Placed</span>
                    <span className="font-bold flex items-center gap-1">
                      <Calendar size={14} className="text-gray-500" />
                      {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-xs uppercase">Total</span>
                    <span className="font-bold">₹{order.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="relative">
                    <span className="text-gray-400 block text-xs uppercase">Ship To</span>
                    <div className="flex items-center gap-2">
                        <span className="font-bold">{order.shippingAddress?.label || 'Home'}</span>
                        <button 
                            onClick={() => setExpandedAddressId(expandedAddressId === order._id ? null : order._id)}
                            className="text-xs text-primary hover:underline font-bold"
                        >
                            {expandedAddressId === order._id ? 'Hide Details' : 'More Details'}
                        </button>
                    </div>
                    {expandedAddressId === order._id && order.shippingAddress && (
                        <div className="absolute top-full left-0 mt-2 bg-zinc-800 border border-white/10 rounded-lg p-3 z-50 min-w-[200px] shadow-xl text-xs text-gray-300">
                            <p className="font-bold text-white mb-1">{order.shippingAddress.fullName}</p>
                            <p>{order.shippingAddress.street}</p>
                            <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}</p>
                            <p className="mt-1">Phone: {order.shippingAddress.phone}</p>
                        </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   {['pending', 'payment_failed'].includes(order.payment?.status) && order.status !== 'cancelled' && ((Date.now() - new Date(order.createdAt).getTime()) / 60000) < 5 && (
                       <button 
                         onClick={() => handleRetryPayment(order)}
                         className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded transition-colors font-bold shadow-lg shadow-green-500/20"
                       >
                         Retry Payment
                       </button>
                   )}
                   {['pending_payment', 'packing'].includes(order.status) && (
                       <button 
                         onClick={() => handleCancel(order._id)}
                         className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-1 rounded transition-colors border border-red-500/20 font-bold"
                       >
                         Cancel Order
                       </button>
                   )}
                   <div className="text-xs uppercase font-bold text-gray-500">Order # {order._id.slice(-6)}</div>
                   <button 
                     onClick={() => window.open(`/api/orders/${order._id}/invoice`, '_blank')}
                     className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-white transition-colors"
                   >
                     Invoice
                   </button>
                   {order.shipping?.awbCode && (
                       <button 
                         onClick={() => window.open(order.shipping.trackingUrl || `https://shiprocket.co/tracking/${order.shipping.awbCode}`, '_blank')}
                         className="text-xs bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 px-3 py-1 rounded transition-colors font-bold"
                       >
                         Track Shipment
                       </button>
                   )}
                </div>
              </div>
              
               <div className="p-4 space-y-4">
                {(!['cancelled', 'rto', 'payment_failed'].includes(order.status)) && (
                    <div className="py-6 px-2 md:px-8 block overflow-x-auto border-b border-white/5 mb-4">
                        <div className="flex items-start justify-between relative min-w-[500px] w-full max-w-2xl mx-auto">
                            <div className="absolute left-0 top-4 -translate-y-1/2 w-full h-1 bg-white/10 z-0"></div>
                            
                            {[
                                { status: ['pending_payment'], label: 'Pending Payment' },
                                { status: ['packing'], label: 'Packing' },
                                { status: ['waiting_for_pickup'], label: 'Waiting/Pickup' },
                                { status: ['in_transit', 'shipped'], label: 'In Transit' },
                                { status: ['delivered', 'return_requested', 'returned'], label: 'Delivered' }
                            ].map((step, idx, arr) => {
                                const orderStatusList = ['pending_payment', 'packing', 'waiting_for_pickup', 'in_transit', 'shipped', 'delivered', 'return_requested', 'returned'];
                                const currentIndex = orderStatusList.indexOf(order.status);
                                const isCompleted = step.status.some(s => orderStatusList.indexOf(s) <= currentIndex);
                                const isCurrent = step.status.includes(order.status);
                                
                                return (
                                    <div key={idx} className="relative z-10 flex flex-col items-center gap-2 w-24 text-center">
                                        <div className={`w-8 h-8 rounded-full border-2 flex flex-shrink-0 items-center justify-center transition-colors bg-surface ${isCompleted ? 'bg-primary border-primary text-white' : 'bg-zinc-900 border-white/20 text-gray-500'} ${isCurrent ? 'ring-4 ring-primary/20 shadow-lg shadow-primary/40' : ''}`}>
                                            {isCompleted && !isCurrent ? <Check size={16} /> : <div className="w-2 h-2 rounded-full bg-current" />}
                                        </div>
                                        <span className={`text-xs font-bold leading-tight ${isCurrent ? 'text-primary' : isCompleted ? 'text-white' : 'text-gray-500'}`}>{step.label}</span>
                                    </div>
                                );
                            })}
                            <div className="absolute left-0 top-4 -translate-y-1/2 h-1 bg-primary z-0 transition-all duration-500" style={{ width: 
                                ['delivered', 'return_requested', 'returned'].includes(order.status) ? '100%' : 
                                ['in_transit', 'shipped'].includes(order.status) ? '75%' : 
                                order.status === 'waiting_for_pickup' ? '50%' : 
                                order.status === 'packing' ? '25%' : '0%' }}></div>
                        </div>
                    </div>
                )}

                {order.shipping?.status && (
                    <div className="bg-white/5 p-4 rounded-lg flex flex-col items-center justify-center text-center gap-1">
                        <div className="text-secondary text-xs font-bold uppercase tracking-widest">Shipment Update</div>
                        <div className="text-lg font-bold text-white capitalize">{order.shipping.status.toLowerCase().replace(/_/g, ' ')}</div>
                        {order.shipping.etd && (
                            <div className="text-sm text-gray-400 mt-1">
                                Estimated Delivery: <span className="text-white font-bold">{order.shipping.etd}</span>
                            </div>
                        )}
                        {order.shipping.trackingUrl && (
                             <a href={order.shipping.trackingUrl} target="_blank" className="text-xs text-primary hover:underline mt-2 flex items-center gap-1">
                                See Full Tracking Details <ExternalLink size={12} />
                             </a>
                        )}
                    </div>
                )}

                 {/* Non-Standard Status Overrides */}
                 {['cancelled', 'rto', 'payment_failed'].includes(order.status) && (
                     <div className="py-4 border-b border-white/5 mb-4 text-center">
                         <span className={`font-bold uppercase tracking-wider text-sm ${order.status === 'cancelled' ? 'text-red-500' : order.status === 'rto' ? 'text-orange-500' : 'text-yellow-500'}`}>
                             Order {order.status.replace(/_/g, ' ')}
                         </span>
                     </div>
                 )}

                {order.items.map((item, idx) => (
                   <div key={idx} className="flex flex-col sm:flex-row gap-4 items-center sm:items-start text-center sm:text-left border-b border-white/5 pb-4 last:border-0 last:pb-0">
                     <div className="w-20 h-20 sm:w-16 sm:h-16 bg-zinc-900 rounded-lg overflow-hidden border border-white/10 group relative flex-shrink-0">
                       {item.pimg && <img src={item.pimg} className="w-full h-full object-cover transition-transform group-hover:scale-110" />}
                       {item.product && (
                           <button 
                               onClick={() => addItem({_id: item.product, name: item.name, price: item.price, images: [item.pimg], stock: 10})} 
                               className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                               title="Buy It Again"
                           >
                               <RefreshCw size={20} className="text-white" />
                           </button>
                       )}
                     </div>
                     <div className="flex-1">
                       <h4 className="font-bold hover:text-primary transition-colors">
                           {item.product ? <Link to={`/product/${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`} target="_blank" className="hover:underline">{item.name}</Link> : item.name}
                       </h4>
                       <p className="text-sm text-gray-400 mb-1">Qty: {item.quantity}</p>
                       
                       {order.shipping?.trackingUrl ? (
                           <a 
                               href={order.shipping.trackingUrl} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded font-bold shadow-lg shadow-blue-500/20 inline-flex items-center gap-1 transition-all hover:-translate-y-0.5 mt-1"
                           >
                               <Truck size={14} /> Track Item
                           </a>
                       ) : (
                           item.purchaseCount > 1 && (
                               <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold border border-primary/20 inline-block mt-1">
                                    You've bought this {item.purchaseCount} times
                               </span>
                           )
                       )}
                     </div>
                     
                     <div className="text-right flex flex-col items-end gap-2">
                         <span className="font-bold text-lg">₹{(item.price * item.quantity).toLocaleString()}</span>
                         <span className="text-xs text-gray-500 line-through">₹{((item.price + 500) * item.quantity).toLocaleString()}</span>
                     </div>
                   </div>
                ))}
                
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrders;
