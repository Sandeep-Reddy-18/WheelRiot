import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Truck, CheckCircle, XCircle, Search, Archive } from 'lucide-react';

const OrderManager = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [shippingLoadout, setShippingLoadout] = useState(false);
  const [shipForm, setShipForm] = useState({ length: 10, breadth: 10, height: 10, weight: 0.5 });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  
  const indexOfFirstRow = (currentPage - 1) * rowsPerPage;
  const indexOfLastRow = indexOfFirstRow + orders.length;

  // States for manual tracking
  const [manualTrackingUrl, setManualTrackingUrl] = useState('');
  const [manualAwb, setManualAwb] = useState('');
  const [manualCourier, setManualCourier] = useState('');

  useEffect(() => {
    fetchOrders(1);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
        fetchOrders(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search, showArchived]);

  useEffect(() => {
     if (selectedOrder) {
        setManualTrackingUrl(selectedOrder.shipping?.tracking_url || '');
        setManualAwb(selectedOrder.shipping?.awb || '');
        setManualCourier(selectedOrder.shipping?.courierName || '');
     }
  }, [selectedOrder]);

  const fetchOrders = async (pageNum = currentPage) => {
    try {
      setLoading(true);
      const res = await axios.get('/api/orders', {
          params: { search, archived: showArchived, page: pageNum, limit: rowsPerPage }
      });
      const data = res.data.orders || res.data;
      setOrders(Array.isArray(data) ? data : []); 
      if (res.data.pages) setTotalPages(res.data.pages);
      if (res.data.currentPage) setCurrentPage(res.data.currentPage);
      if (res.data.total !== undefined) setTotalOrders(res.data.total);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const toggleArchive = async (orderId) => {
      if (!showArchived) {
          if (!window.confirm("Archiving this order will automatically mark it as CANCELLED. Are you sure?")) {
              return;
          }
      }
      try {
          await axios.put(`/api/orders/${orderId}/archive`);
          fetchOrders();
          setSelectedOrder(null);
      } catch (err) {
          alert('Failed to archive');
      }
  };

  const statusColors = {
      'pending_payment': 'bg-yellow-500/20 text-yellow-500',
      'paid': 'bg-emerald-500/20 text-emerald-500',
      'processing': 'bg-blue-500/20 text-blue-500',
      'packing': 'bg-fuchsia-500/20 text-fuchsia-400',
      'ready_to_ship': 'bg-indigo-500/20 text-indigo-500',
      'shipped': 'bg-purple-500/20 text-purple-500',
      'out_for_delivery': 'bg-pink-500/20 text-pink-500',
      'delivered': 'bg-green-500/20 text-green-500',
      'rto': 'bg-orange-500/20 text-orange-500',
      'cancelled': 'bg-red-500/20 text-red-500'
  };

  const updateStatus = async (id, status) => {
      try {
          await axios.put(`/api/orders/${id}/status`, { status });
          fetchOrders();
          if (selectedOrder && selectedOrder._id === id) {
              setSelectedOrder(prev => ({ ...prev, status }));
          }
      } catch (err) {
          console.error(err);
      }
  };

  const simulateTracking = async (id, status) => {
      try {
          await axios.post(`/api/orders/${id}/simulate-tracking`, { status });
          fetchOrders();
          if (selectedOrder && selectedOrder._id === id) {
              setSelectedOrder(prev => ({ ...prev, status }));
          }
      } catch (err) {
          console.error(err);
          alert('Simulation failed: ' + (err.response?.data?.error || err.message));
      }
  };

  const downloadInvoice = (id) => {
      window.open(`/api/orders/${id}/invoice`, '_blank');
  };

  const handleShipOrder = async () => {
      if(!window.confirm('Create ShipRocket Order for this item?')) return;
      try {
          const res = await axios.post(`/api/shipping/orders/${selectedOrder._id}/ship`, {
              pickupLocation: 'Primary',
              weight: 0.5
          });
          alert('Order Sent to ShipRocket! AWB Assigned: ' + (res.data.shipping?.awb || 'Pending'));
          fetchOrders();
          setSelectedOrder(null);
      } catch(err) {
           console.error(err);
           alert(err.response?.data?.error || 'Shipping Failed');
      }
  };

  const handleCancelShipment = async () => {
      if(!window.confirm('Are you sure you want to cancel the shipment? This will verify with ShipRocket.')) return;
      try {
          await axios.post('/api/shipping/cancel', { orderId: selectedOrder._id });
          alert('Shipment Cancelled');
          fetchOrders();
          setSelectedOrder(null);
      } catch (err) {
          alert('Cancel API Failed: ' + (err.response?.data?.error || err.message));
      }
  };

  const handleSaveTracking = async () => {
      try {
          const res = await axios.put(`/api/orders/${selectedOrder._id}/tracking`, {
              tracking_url: manualTrackingUrl,
              awb_code: manualAwb,
              courierName: manualCourier
          });
          alert('Tracking info saved!');
          fetchOrders();
          setSelectedOrder(res.data); 
      } catch (err) {
          alert(err.response?.data?.error || 'Failed to save tracking info');
      }
  };

  const handleInitiateReturn = async (orderId) => {
      if(!window.confirm("Are you sure you want to initiate a return via ShipRocket?")) return;
      try {
          const res = await axios.post(`/api/orders/${orderId}/return`);
          alert("Return Initiated Successfully");
          fetchOrders();
          if (selectedOrder && selectedOrder._id === orderId) {
              setSelectedOrder(res.data.order);
          }
      } catch (err) {
          alert(err.response?.data?.error || "Return Failed");
      }
  };

  const handleCreateShiprocket = async (orderId) => {
      try {
          setShippingLoadout(true);
          
          const plength = Math.max(Number(shipForm.length) || 10, 10);
          const pbreadth = Math.max(Number(shipForm.breadth) || 10, 10);
          const pheight = Math.max(Number(shipForm.height) || 10, 10);
          const pweight = Math.max(Number(shipForm.weight) || 0.5, 0.5);

          const res = await axios.post(`/api/shipping/create-shiprocket/${orderId}`, {
                length: plength,
                breadth: pbreadth,
                height: pheight,
                weight: pweight
          });
          
          alert("ShipRocket Order Created Successfully!");
          fetchOrders();
          setSelectedOrder(res.data.order);
      } catch (err) {
          console.error('Shiprocket creation error:', err);
          const msg = err.response?.data?.error || err.message || 'Unknown creation error';
          alert(`Failed to create ShipRocket Order:\n${msg}`);
      } finally {
          setShippingLoadout(false);
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <h2 className="text-2xl font-bold">Order Fulfillment</h2>
        <div className="flex flex-col sm:flex-row gap-4 items-start w-full lg:w-auto">
             <button 
                onClick={() => setShowArchived(!showArchived)}
                className={`px-4 py-2 rounded-lg text-sm font-bold border ${showArchived ? 'bg-white text-black border-white' : 'border-white/20 hover:bg-white/10'}`}
             >
                {showArchived ? 'Show Active' : 'Show Archived'}
             </button>
             <div className="relative w-full sm:w-auto">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                 <input 
                    type="text" 
                    placeholder="Search Order ID / Customer..." 
                    className="bg-surface border border-white/10 rounded-lg pl-10 pr-4 py-2 outline-none focus:border-primary w-full sm:w-64"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                 />
             </div>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto whitespace-nowrap">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-gray-400 text-sm uppercase">
              <tr>
                <th className="p-4 min-w-[120px]">Order ID</th>
                <th className="p-4 min-w-[200px]">Customer</th>
                <th className="p-4 min-w-[120px]">Amount</th>
                <th className="p-4 min-w-[200px]">Date</th>
                <th className="p-4 min-w-[150px]">Status</th>
                <th className="p-4 text-right min-w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan="6" className="p-8 text-center text-gray-500">Loading Orders...</td></tr>
              ) : orders.map(order => (
                <tr key={order._id} className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setSelectedOrder(order)}>
                  <td className="p-4 font-mono text-sm">{order._id.slice(-6).toUpperCase()}</td>
                  <td className="p-4">
                     <div className="font-bold">{order.shippingAddress?.fullName || order.shippingAddress.label}</div>
                     <div className="text-xs text-gray-500">{order.shippingAddress.city}</div>
                  </td>
                  <td className="p-4">₹{order.totalAmount.toLocaleString()}</td>
                    <td className="p-4 text-gray-400 text-sm">{new Date(order.createdAt).toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusColors[order.status] || 'bg-gray-500/20'}`}>
                      {order.status}
                    </span>
                  </td>
                    <td className="p-4 flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleArchive(order._id)} className="p-2 hover:bg-gray-500/20 hover:text-gray-400 rounded" title={showArchived ? "Unarchive" : "Archive"}><Archive size={18} /></button>
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
          <div className="flex justify-between items-center bg-surface p-4 rounded-xl border border-white/10 mt-4">
              <span className="text-sm text-gray-400">
                  Showing {indexOfFirstRow + 1} to {Math.min(indexOfLastRow, totalOrders)} of {totalOrders} entries
              </span>
              <div className="flex gap-2">
                  <button 
                      onClick={() => fetchOrders(Math.max(currentPage - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded disabled:opacity-50"
                  >
                      Prev
                  </button>
                  <span className="px-3 py-1 text-sm bg-white/10 rounded">{currentPage} / {totalPages}</span>
                  <button 
                      onClick={() => fetchOrders(Math.min(currentPage + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded disabled:opacity-50"
                  >
                      Next
                  </button>
              </div>
          </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-surface border border-white/10 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Order #{selectedOrder._id.slice(-6).toUpperCase()}</h2>
                  <p className="text-sm text-gray-400">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-white">✕</button>
             </div>

             <div className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                 
                 {/* Left Column: Customer Details */}
                 <div className="bg-white/5 p-4 rounded-lg">
                    <h3 className="text-sm font-bold text-gray-400 mb-2">Shipping Address</h3>
                    <p className="font-bold">{selectedOrder.shippingAddress.label} - {selectedOrder.shippingAddress.fullName || selectedOrder.shippingAddress.label}</p>
                    <p className="text-sm font-mono text-primary mb-1">{selectedOrder.user?.email || selectedOrder.billingAddress?.email || 'Guest'}</p>
                    <p className="text-sm">{selectedOrder.shippingAddress.street}</p>
                    <p className="text-sm">{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.zip}</p>
                    <p className="text-sm">{selectedOrder.shippingAddress.country}</p>
                    <p className="text-sm mt-1 text-primary">{selectedOrder.shippingAddress.phone}</p>

                    {selectedOrder.billingAddress && (
                        <>
                            <h3 className="text-sm font-bold text-gray-400 mt-4 mb-2 border-t border-white/10 pt-4">Billing Address</h3>
                            <p className="font-bold">{selectedOrder.billingAddress.fullName}</p>
                            <p className="text-sm">{selectedOrder.billingAddress.street}</p>
                            <p className="text-sm">{selectedOrder.billingAddress.city}, {selectedOrder.billingAddress.zip}</p>
                            <p className="text-sm">{selectedOrder.billingAddress.country}</p>
                            <p className="text-sm mt-1 text-primary">{selectedOrder.billingAddress.phone}</p>
                        </>
                    )}
                 </div>

                 {/* Right Column: Payment & Status */}
                 <div className="bg-white/5 p-4 rounded-lg">
                    <h3 className="text-sm font-bold text-gray-400 mb-2">Payment & Status</h3>
                    <p className="text-sm">Method: <span className="text-white">{selectedOrder.payment.provider}</span></p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm">Status:</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${statusColors[selectedOrder.status]}`}>{selectedOrder.status}</span>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/10">
                        <h3 className="text-sm font-bold text-gray-400 mb-2">Admin Notes</h3>
                        <textarea 
                            className="w-full bg-black/30 border border-red-500/50 rounded-lg p-2 text-sm text-red-200 focus:border-red-500 outline-none h-24"
                            placeholder="Add internal notes or alerts here..."
                            value={selectedOrder.adminNotes || ''}
                            onChange={(e) => setSelectedOrder(prev => ({ ...prev, adminNotes: e.target.value }))}
                            onBlur={async () => {
                                try {
                                    await axios.put(`/api/orders/${selectedOrder._id}/notes`, { notes: selectedOrder.adminNotes });
                                    fetchOrders();
                                } catch (err) { console.error("Failed to save notes", err) }
                            }}
                        />
                    </div>
                    
                    {/* Logistics Status synced entirely via Shiprocket Dashboard */}
                    {selectedOrder.shipping?.awbCode ? (
                        <div className="mt-4 pt-4 border-t border-white/10">
                            <h4 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Logistics</h4>
                            <div className="bg-black/20 p-3 rounded">
                                <p className="text-xs text-green-400 font-bold flex items-center gap-1"><Truck size={12} /> Shiprocket Synced</p>
                                <p className="text-xs text-gray-400 mt-1">Status: <span className="text-white font-bold">{selectedOrder.shipping.status || 'Manifested'}</span></p>
                                {selectedOrder.shipping.etd && <p className="text-xs text-gray-400 mt-1">ETD: <span className="text-white font-bold">{selectedOrder.shipping.etd}</span></p>}
                                <p className="text-xs text-gray-400 mt-1">AWB: <a href={selectedOrder.shipping.trackingUrl || `https://shiprocket.co/tracking/${selectedOrder.shipping.awbCode}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono ml-1">{selectedOrder.shipping.awbCode}</a></p>
                                <p className="text-[10px] text-gray-500 mt-1">Tracker ID: {selectedOrder.shipping.shipmentId}</p>
                                {selectedOrder.shiprocketOrderId && <p className="text-[10px] text-gray-500">ShipRocket Order ID: {selectedOrder.shiprocketOrderId}</p>}
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 pt-4 border-t border-white/10">
                            <h4 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Package Dimensions</h4>
                            <div className="bg-white/5 p-3 rounded space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-gray-400 uppercase">Length (cm)</label>
                                        <input type="number" value={shipForm.length} onChange={e => setShipForm({...shipForm, length: Number(e.target.value)})} className="w-full bg-black/50 border border-white/10 rounded p-1.5 text-sm outline-none focus:border-primary" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-400 uppercase">Breadth (cm)</label>
                                        <input type="number" value={shipForm.breadth} onChange={e => setShipForm({...shipForm, breadth: Number(e.target.value)})} className="w-full bg-black/50 border border-white/10 rounded p-1.5 text-sm outline-none focus:border-primary" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-400 uppercase">Height (cm)</label>
                                        <input type="number" value={shipForm.height} onChange={e => setShipForm({...shipForm, height: Number(e.target.value)})} className="w-full bg-black/50 border border-white/10 rounded p-1.5 text-sm outline-none focus:border-primary" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-400 uppercase">Weight (kg)</label>
                                        <input type="number" step="0.1" value={shipForm.weight} onChange={e => setShipForm({...shipForm, weight: Number(e.target.value)})} className="w-full bg-black/50 border border-white/10 rounded p-1.5 text-sm outline-none focus:border-primary" />
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleCreateShiprocket(selectedOrder._id)} 
                                    disabled={shippingLoadout || selectedOrder.status === 'cancelled' || selectedOrder.payment.status === 'payment_failed' || !!selectedOrder.shipping?.awbCode}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded text-sm font-bold transition-colors mt-2 text-center flex justify-center items-center gap-2">
                                    {shippingLoadout ? 'Processing...' : 'Ship with ShipRocket'}
                                </button>
                            </div>
                        </div>
                    )}

                    <button onClick={() => downloadInvoice(selectedOrder._id)} className="mt-4 w-full bg-white/5 hover:bg-white/10 text-gray-300 py-2 rounded text-sm flex items-center justify-center gap-2 border border-white/5 transition-colors">
                       Download Invoice
                    </button>

                    {selectedOrder.status === 'delivered' && (
                        <button onClick={() => handleInitiateReturn(selectedOrder._id)} className="mt-2 w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded text-sm flex items-center justify-center font-bold gap-2 transition-colors shadow-lg shadow-orange-500/20">
                            Initiate Return
                        </button>
                    )}
                 </div>
               </div>

               <div>
                 <h3 className="text-sm font-bold text-gray-400 mb-3">Items</h3>
                 <div className="space-y-2">
                   {selectedOrder.items.map((item, idx) => (
                     <div key={idx} className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                        <div className="flex items-center gap-3">
                           {item.pimg ? (
                             <img src={item.pimg} alt={item.name} className="w-12 h-12 object-cover rounded" />
                           ) : (
                             <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center text-xs">No Img</div>
                           )}
                           <div>
                             <p className="font-bold">{item.name || 'Unknown Product'}</p>
                             <p className="text-xs text-gray-400">Qty: {item.quantity} | SKU: {item.sku || 'N/A'}</p>
                           </div>
                        </div>
                        <p className="font-mono">₹{(item.price || item.priceAtPurchase || 0).toLocaleString()}</p>
                     </div>
                   ))}
                 </div>
                 <div className="flex justify-end mt-4 pt-4 border-t border-white/10">
                    <div className="text-right w-64">
                        {
                          (() => {
                            const subtotalItems = selectedOrder.items.reduce((acc, item) => acc + (item.price || item.priceAtPurchase || 0) * item.quantity, 0);
                            const disc = selectedOrder.discountApplied || 0;
                            const inferredShipping = selectedOrder.totalAmount - (subtotalItems - disc);
                            const shippingCost = selectedOrder.shipping?.cost !== undefined ? selectedOrder.shipping.cost : inferredShipping;
                            
                            return (
                                <>
                                   <div className="flex justify-between text-sm text-gray-400 mb-1">
                                       <span>Subtotal (Items)</span>
                                       <span>₹{subtotalItems.toLocaleString()}</span>
                                   </div>
                                   {disc > 0 && (
                                       <div className="flex justify-between text-sm text-green-500 mb-1">
                                           <span>Discount {selectedOrder.couponCode ? `(${selectedOrder.couponCode})` : ''}</span>
                                           <span>-₹{disc.toLocaleString()}</span>
                                       </div>
                                   )}
                                   <div className="flex justify-between text-sm text-gray-400 mb-2 pb-2 border-b border-white/10">
                                       <span>Shipping</span>
                                       <span>{shippingCost > 0 ? `₹${shippingCost.toLocaleString()}` : (shippingCost === 0 ? 'FREE' : 'Included')}</span>
                                   </div>
                                </>
                            );
                          })()
                        }
                       <div className="flex justify-between font-bold items-end mt-2">
                           <span className="text-gray-400 text-sm">Total Amount</span>
                           <span className="text-2xl text-primary">₹{selectedOrder.totalAmount.toLocaleString()}</span>
                       </div>
                    </div>
                 </div>
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManager;
