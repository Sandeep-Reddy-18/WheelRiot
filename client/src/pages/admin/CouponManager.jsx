import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Tag, Trash, Plus } from 'lucide-react';

const CouponManager = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [filterTerm, setFilterTerm] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentCoupons = coupons.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(coupons.length / rowsPerPage);

  const [formData, setFormData] = useState({
    code: '',
    discountType: 'PERCENTAGE',
    value: '',
    minOrderValue: 0,
    applicableType: 'ALL',
    expiryDate: ''
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const res = await axios.get('/api/coupons');
      const brandsRes = await axios.get('/api/products/meta'); 
      const productsRes = await axios.get('/api/products?limit=1000'); 
      
      setCoupons(res.data);
      setBrands(brandsRes.data.manufacturers.map(m => ({name: m}))); 
      setProducts(productsRes.data.products);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm('Delete coupon?')) return;
    await axios.delete(`/api/coupons/${id}`);
    fetchCoupons();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        const payload = {
            ...formData,
            value: Number(formData.value),
            minOrderValue: Number(formData.minOrderValue || 0),
            maxDiscountAmount: formData.maxDiscountAmount ? Number(formData.maxDiscountAmount) : undefined
        };
        await axios.post('/api/coupons', payload);
        setShowModal(false);
        setFormData({ code: '', discountType: 'PERCENTAGE', value: '', minOrderValue: 0, applicableType: 'ALL', expiryDate: '' });
        fetchCoupons();
    } catch (err) {
        alert(err.response?.data?.error || 'Failed');
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
         <h2 className="text-2xl font-bold">Discount Coupons</h2>
         <button onClick={() => setShowModal(true)} className="bg-primary hover:bg-red-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2">
            <Plus size={20} /> Create Coupon
         </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentCoupons.map(coupon => (
             <div 
                key={coupon._id} 
                onClick={() => {
                    setFormData({
                        ...coupon,
                        expiryDate: coupon.expiryDate ? new Date(coupon.expiryDate).toISOString().slice(0, 16) : ''
                    });
                    setShowModal(true);
                }}
                className="bg-surface border border-white/10 p-6 rounded-xl relative group cursor-pointer hover:bg-white/5 transition-colors"
             >
                <div className="flex justify-between items-start mb-4">
                    <div className="bg-white/10 px-3 py-1 rounded text-sm font-mono tracking-wider">{coupon.code}</div>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(coupon._id); }} className="text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash size={18} />
                    </button>
                </div>
                <div className="text-3xl font-bold text-primary mb-1">
                    {coupon.discountType === 'PERCENTAGE' ? `${coupon.value}% OFF` : `₹${coupon.value} OFF`}
                </div>
                <div className="text-sm text-gray-400">
                    {coupon.applicableType === 'ALL' ? 'Store-wide' : `Specific ${coupon.applicableType}`}
                </div>
                {coupon.minOrderValue > 0 && (
                    <div className="text-xs text-gray-500 mt-2">Min Order: ₹{coupon.minOrderValue}</div>
                )}
                 {coupon.expiryDate && (
                    <div className="text-xs text-gray-500 mt-1">
                        Expires: {new Date(coupon.expiryDate).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true, month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                )}
             </div>
          ))}
       </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
          <div className="flex justify-between items-center bg-surface p-4 rounded-xl border border-white/10 mt-4">
              <span className="text-sm text-gray-400">
                  Showing {indexOfFirstRow + 1} to {Math.min(indexOfLastRow, coupons.length)} of {coupons.length} entries
              </span>
              <div className="flex gap-2">
                  <button 
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded disabled:opacity-50"
                  >
                      Prev
                  </button>
                  <span className="px-3 py-1 text-sm bg-white/10 rounded">{currentPage} / {totalPages}</span>
                  <button 
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded disabled:opacity-50"
                  >
                      Next
                  </button>
              </div>
          </div>
      )}

       {showModal && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-white/10 rounded-xl p-6 w-full max-w-md">
                <h3 className="text-xl font-bold mb-4">Coupon Details</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Coupon Code</label>
                        <input 
                            className="w-full bg-black/30 border border-white/10 rounded p-2 uppercase"
                            value={formData.code}
                            onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm text-gray-400 mb-1">Type</label>
                            <select 
                                className="w-full bg-black/30 border border-white/10 rounded p-2"
                                value={formData.discountType}
                                onChange={(e) => setFormData({...formData, discountType: e.target.value})}
                            >
                                <option value="PERCENTAGE">Percentage (%)</option>
                                <option value="FIXED">Fixed Amount (₹)</option>
                            </select>
                         </div>
                         <div>
                            <label className="block text-sm text-gray-400 mb-1">Value</label>
                            <input 
                                type="number"
                                className="w-full bg-black/30 border border-white/10 rounded p-2"
                                value={formData.value}
                                onChange={(e) => setFormData({...formData, value: e.target.value})}
                                required
                            />
                         </div>
                    </div>

                    {formData.discountType === 'PERCENTAGE' && (
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Max Discount Amount (₹)</label>
                            <input 
                                type="number"
                                className="w-full bg-black/30 border border-white/10 rounded p-2"
                                value={formData.maxDiscountAmount || ''}
                                onChange={(e) => setFormData({...formData, maxDiscountAmount: e.target.value})}
                                placeholder="Optional Cap (e.g. 500)"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm text-gray-400 mb-1">Min Order Value (₹)</label>
                            <input 
                                type="number"
                                className="w-full bg-black/30 border border-white/10 rounded p-2"
                                value={formData.minOrderValue}
                                onChange={(e) => setFormData({...formData, minOrderValue: e.target.value})}
                            />
                         </div>
                         <div>
                             <label className="block text-sm text-gray-400 mb-1">Expiry Date</label>
                             <input 
                                type="datetime-local"
                                className="w-full bg-black/30 border border-white/10 rounded p-2 text-white"
                                style={{ colorScheme: 'dark' }}
                                value={formData.expiryDate}
                                onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Applicable To</label>
                        <select 
                            className="w-full bg-black/30 border border-white/10 rounded p-2 mb-2"
                            value={formData.applicableType}
                            onChange={(e) => setFormData({...formData, applicableType: e.target.value, applicableValues: []})}
                        >
                            <option value="ALL">Entire Store</option>
                            <option value="BRAND">Specific Brands</option>
                            <option value="MODEL">Specific Models</option>
                        </select>
                        
                        {formData.applicableType !== 'ALL' && (
                            <div>
                                <input 
                                    placeholder={formData.applicableType === 'BRAND' ? "Search Brands..." : "Search Products..."}
                                    className="w-full bg-black/30 border border-white/10 rounded p-2 mb-2 text-sm text-white"
                                    value={filterTerm}
                                    onChange={(e) => setFilterTerm(e.target.value)}
                                />
                                
                                <select 
                                    multiple
                                    className="w-full bg-black/30 border border-white/10 rounded p-2 h-40 text-sm"
                                    value={formData.applicableValues || []}
                                    onChange={(e) => {
                                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                                        setFormData({...formData, applicableValues: selected});
                                    }}
                                >
                                    {formData.applicableType === 'BRAND' ? (
                                        brands.filter(b => b.name.toLowerCase().includes(filterTerm.toLowerCase())).map(b => (
                                            <option key={b.name} value={b.name}>{b.name}</option>
                                        ))
                                    ) : (
                                        products.filter(p => p.name.toLowerCase().includes(filterTerm.toLowerCase()) || p.sku.toLowerCase().includes(filterTerm.toLowerCase())).map(p => (
                                            <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
                                        ))
                                    )}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple.</p>
                            </div>
                        )}
                    </div>
                    
                    <button className="w-full bg-primary py-3 rounded-lg font-bold mt-4">Save Coupon</button>
                    <button type="button" onClick={() => setShowModal(false)} className="w-full mt-2 text-gray-400 text-sm">Cancel</button>
                </form>
            </div>
         </div>
       )}
    </div>
  );
};

export default CouponManager;
