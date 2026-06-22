import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash, Eye, EyeOff, Tag, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

const ProductManager = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [meta, setMeta] = useState({ manufacturers: [], carBrands: [], scales: [] });
  
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [showBulkDiscountModal, setShowBulkDiscountModal] = useState(false);
  const [bulkDiscountPercent, setBulkDiscountPercent] = useState('');
  const [filters, setFilters] = useState({ manufacturer: '', carBrand: '', scale: '', status: '', stockStatus: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  
  const initialFormState = {
    name: '',
    slug: '',
    sku: '',
    price: '',
    discountPercent: '',
    discountedPrice: '',
    enableDiscount: false, 
    stock: '',
    description: '',
    manufacturer: '',
    attributes: { scale: '1:18', material: 'Diecast', color: '' },
    images: ['', ''],
    isFeatured: false
  };

  const [formData, setFormData] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [brands, setBrands] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const [lowStockThreshold, setLowStockThreshold] = useState(5);

  useEffect(() => {
    fetchBrands();
    fetchMeta();
    axios.get('/api/settings/lowStockThreshold')
        .then(res => setLowStockThreshold(res.data || 5))
        .catch(err => console.error(err));
  }, []);

  const fetchBrands = async () => {
      try { const res = await axios.get('/api/brands'); setBrands(res.data); } catch(err) {}
  };
  const fetchMeta = async () => {
      try { const res = await axios.get('/api/products/meta'); setMeta(res.data); } catch(err) {}
  };

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(1, true); 
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, filters, sortConfig]); 

  const fetchProducts = async (pageNum = 1) => {
    setLoading(true);
    try {
      const params = {
          includeHidden: true,
          search: searchTerm,
          page: pageNum,
          limit: Math.min(25, 10),
          sortBy: sortConfig.key,
          sortOrder: sortConfig.direction,
          ...filters
      };
      Object.keys(params).forEach(key => params[key] === '' && delete params[key]);

      const res = await axios.get('/api/products', { params });
      
      const { products: newProducts, total, pages } = res.data;
      
      setProducts(newProducts);
      setPage(pageNum);
      setTotalPages(pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
      let direction = 'asc';
      if (sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Auto-generate slug
    if (name === 'name' && !editingId) {
       const autoSlug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
       setFormData(prev => ({ ...prev, name: value, slug: autoSlug }));
       return;
    }

    if (name.startsWith('images.')) {
        const index = parseInt(name.split('.')[1]);
        const newImages = [...formData.images];
        newImages[index] = value;
        setFormData({ ...formData, images: newImages });
        return;
    }

    if (name.includes('.')) {
       const [parent, child] = name.split('.');
       setFormData(prev => ({
         ...prev,
         [parent]: {
           ...prev[parent],
           [child]: value
         }
       }));
    } else {
       setFormData({ ...formData, [name]: value });
    }
  };
  
  // Pricing Logic Handlers
  const handlePriceChange = (field, val) => {
      const numVal = Math.round(Number(val));
      if (isNaN(numVal)) return;

      if (field === 'price') {
          setFormData(prev => {
              const newState = { ...prev, price: numVal };
              if (prev.enableDiscount && prev.discountPercent) {
                  newState.discountedPrice = Math.round(numVal - (numVal * prev.discountPercent / 100));
              } 
              return newState;
          });
      } else if (field === 'discountPercent') {
          setFormData(prev => {
             const dsp = Math.round(prev.price - (prev.price * numVal / 100));
             return { ...prev, discountPercent: numVal, discountedPrice: dsp };
          });
      } else if (field === 'discountedPrice') {
          setFormData(prev => {
             if (!prev.price) return prev;
             const percent = Math.round(((prev.price - numVal) / prev.price) * 100);
             return { ...prev, discountedPrice: numVal, discountPercent: percent };
          });
      }
  };

  const handleAddBrand = async (e) => {
      e.preventDefault();
      if (!newBrandName.trim()) return;
      try {
          const res = await axios.post('/api/brands', { name: newBrandName });
          setBrands(prev => [...prev, res.data].sort((a,b) => a.name.localeCompare(b.name)));
          setFormData(prev => ({ ...prev, manufacturer: newBrandName }));
          setNewBrandName('');
          setShowBrandModal(false);
      } catch(err) {
          alert("Failed to add brand: " + (err.response?.data?.error || err.message));
      }
  };

  const handleRemoveExistingImage = async (index) => {
      if(!editingId) {
          const newImages = [...formData.images];
          newImages.splice(index, 1);
          setFormData({...formData, images: newImages});
          return;
      }
      if(!window.confirm('Delete this image permanently?')) return;
      try {
          await axios.delete(`/api/products/${editingId}/images/${index}`);
          const newImages = [...formData.images];
          newImages.splice(index, 1);
          setFormData({...formData, images: newImages});
      } catch(err) {
          alert('Failed to delete image: ' + err.message);
      }
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingId(null);
    setSelectedFiles([]);
    setShowModal(false);
  };

  const handleEdit = (product) => {
    setEditingId(product._id);
    
    const sp = product.price || 0;
    const dsp = product.discountedPrice || 0; 
    setFormData({
      ...product,
      images: product.images || [],
      attributes: product.attributes || initialFormState.attributes,
      enableDiscount: !!product.discountedPrice,
      discountedPrice: product.discountedPrice || '',
      discountPercent: product.discountPercent || '',
      isFeatured: product.isFeatured || false
    });
    setSelectedFiles([]);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await axios.delete(`/api/products/${id}`);
      fetchProducts(page, true); 
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const handleToggleStatus = async (product) => {
    try {
      const newStatus = product.status === 'Active' ? 'Hidden' : 'Active';
      await axios.put(`/api/products/${product._id}`, { status: newStatus });
      setProducts(products.map(p => p._id === product._id ? { ...p, status: newStatus } : p));
    } catch (err) {
      alert('Failed to toggle status');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.attributes.color?.trim()) {
          alert("Color is required!");
          return;
      }
      if (Number(formData.price) < 0 || Number(formData.stock) < 0) {
          alert("Price and Stock cannot be negative!");
          return;
      }
      if (formData.enableDiscount && (Number(formData.discountPercent) < 0 || Number(formData.discountedPrice) < 0)) {
          alert("Discount values cannot be negative!");
          return;
      }

      const payload = {
         ...formData,
         status: editingId ? formData.status : 'Active',
         images: Array.isArray(formData.images) ? formData.images.filter(Boolean) : [],
         price: Number(formData.price),
         stock: Number(formData.stock),
         discountedPrice: formData.enableDiscount ? Number(formData.discountedPrice) : null,
         discountPercent: formData.enableDiscount ? Number(formData.discountPercent) : null,
         isDiscounted: formData.enableDiscount,
         isFeatured: formData.isFeatured
      };

      if (!formData.enableDiscount) {
          delete payload.discountedPrice;
          delete payload.discountPercent;
      }
      
      let productId = editingId;
      if (editingId) {
        await axios.put(`/api/products/${editingId}`, payload);
      } else {
        const res = await axios.post('/api/products', payload);
        productId = res.data._id;
      }
      
      if (selectedFiles.length > 0) {
          const uploadData = new FormData();
          selectedFiles.forEach(f => uploadData.append('images', f));
          await axios.post(`/api/products/${productId}/images`, uploadData, {
              headers: { 'Content-Type': 'multipart/form-data' }
          });
      }
      
      resetForm();
      fetchProducts(page, true); 
    } catch (err) {
      alert('Operation failed: ' + (err.response?.data?.error || err.message));
      console.error(err);
    }
  };

  const handleBulkDiscount = async (e) => {
      e.preventDefault();
      if (!bulkDiscountPercent || bulkDiscountPercent <= 0 || bulkDiscountPercent >= 100) {
          alert('Please enter a valid percentage between 1 and 99.');
          return;
      }
      if (!window.confirm(`Are you sure you want to apply a ${bulkDiscountPercent}% discount to all currently filtered products?`)) return;

      try {
          const discountFilters = { ...filters, search: searchTerm };
          const res = await axios.put('/api/products/bulk-discount', {
              percentage: Number(bulkDiscountPercent),
              filters: discountFilters
          });
          alert(res.data.message);
          setShowBulkDiscountModal(false);
          setBulkDiscountPercent('');
          fetchProducts(page, true);
      } catch (err) {
          alert('Failed to apply bulk discount: ' + (err.response?.data?.error || err.message));
      }
  };

  const SortIcon = ({ colKey }) => {
      if (sortConfig.key !== colKey) return <ArrowUpDown size={14} className="text-gray-600 inline ml-1" />;
      return sortConfig.direction === 'asc' 
        ? <ArrowUp size={14} className="text-primary inline ml-1" />
        : <ArrowDown size={14} className="text-primary inline ml-1" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Inventory</h2>
            <div className="flex gap-4">
                 <button onClick={() => setShowBulkDiscountModal(true)} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-bold transition-colors">
                  <Tag size={20} />
                  Bulk Discount
                 </button>
                 <button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2 bg-primary hover:bg-red-700 px-4 py-2 rounded-lg font-bold transition-colors">
                  <Plus size={20} />
                  Add Model
                </button>
            </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap gap-4 bg-surface p-4 rounded-xl border border-white/10">
             <div className="relative flex-1 min-w-[200px]">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                 <input 
                    type="text" 
                    placeholder="Search products..." 
                    className="w-full bg-black/30 border border-white/10 rounded-lg pl-10 pr-4 py-2 outline-none focus:border-primary"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                 />
             </div>
             
             <select 
                value={filters.manufacturer}
                onChange={(e) => setFilters({...filters, manufacturer: e.target.value})}
                className="bg-black/30 border border-white/10 rounded-lg px-4 py-2 outline-none focus:border-primary"
             >
                <option value="">All Brands</option>
                {meta.manufacturers.map(m => <option key={m} value={m}>{m}</option>)}
             </select>

             <select 
                value={filters.scale}
                onChange={(e) => setFilters({...filters, scale: e.target.value})}
                className="bg-black/30 border border-white/10 rounded-lg px-4 py-2 outline-none focus:border-primary"
             >
                <option value="">All Scales</option>
                {meta.scales.map(s => <option key={s} value={s}>{s}</option>)}
             </select>

             <select 
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="bg-black/30 border border-white/10 rounded-lg px-4 py-2 outline-none focus:border-primary"
             >
                <option value="">Status</option>
                <option value="Active">Active</option>
                <option value="Hidden">Hidden</option>
             </select>

             <select 
                value={filters.stockStatus}
                onChange={(e) => setFilters({...filters, stockStatus: e.target.value})}
                className="bg-black/30 border border-white/10 rounded-lg px-4 py-2 outline-none focus:border-primary"
             >
                <option value="">Stock</option>
                <option value="in_stock">In Stock</option>
                <option value="out_of_stock">Out of Stock</option>
             </select>
             
             {(Object.values(filters).some(Boolean) || searchTerm) && (
                 <button onClick={() => { setFilters({manufacturer: '', scale: '', status: '', stockStatus: ''}); setSearchTerm(''); }} className="text-sm text-red-400 hover:text-white">
                     Clear
                 </button>
             )}
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto whitespace-nowrap">
          <table className="w-full text-left">
          <thead className="bg-white/5 text-gray-400 text-sm uppercase cursor-pointer select-none">
            <tr>
              <th className="p-4" onClick={() => handleSort('name')}>Details <SortIcon colKey="name" /></th>
              <th className="p-4" onClick={() => handleSort('price')}>Price <SortIcon colKey="price" /></th>
              <th className="p-4" onClick={() => handleSort('stock')}>Stock <SortIcon colKey="stock" /></th>
              <th className="p-4" onClick={() => handleSort('isFeatured')}>Featured <SortIcon colKey="isFeatured" /></th>
              <th className="p-4" onClick={() => handleSort('status')}>Status <SortIcon colKey="status" /></th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan="6" className="p-8 text-center text-gray-500">Loading...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-gray-500">No products found.</td></tr>
            ) : (
              products.map(product => (
                <tr key={product._id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="font-mono text-xs text-gray-500">{product.sku || 'NO-SKU'}</div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-xs text-gray-400">{product.manufacturer}</div>
                  </td>
                  <td className="p-4">
                      {product.discountedPrice ? (
                          <div>
                              <span className="text-green-500 font-bold">₹{product.discountedPrice.toLocaleString()}</span>
                              <span className="text-xs text-gray-500 line-through ml-2">₹{product.price.toLocaleString()}</span>
                          </div>
                      ) : (
                          <span>₹{product.price?.toLocaleString()}</span>
                      )}
                  </td>
                   <td className="p-4">
                     <span className={`px-2 py-1 rounded-full text-xs ${product.stock <= lowStockThreshold ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                       {product.stock}
                     </span>
                  </td>
                  <td className="p-4">
                      {product.isFeatured ? (
                          <Tag size={16} className="text-yellow-500" />
                      ) : (
                          <span className="text-gray-600">-</span>
                      )}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${product.status === 'Active' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-700 text-gray-400'}`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="p-4 flex justify-end gap-2">
                    <button onClick={() => handleToggleStatus(product)} className="p-2 hover:text-primary" title="Toggle Visibility">
                      {product.status === 'Active' ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                    <button onClick={() => handleEdit(product)} className="p-2 hover:text-yellow-500" title="Edit">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(product._id)} className="p-2 hover:text-red-500" title="Delete">
                      <Trash size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
          <div className="flex justify-between items-center bg-surface p-4 rounded-xl border border-white/10 mt-4">
              <span className="text-sm text-gray-400">
                  Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                  <button 
                      onClick={() => fetchProducts(Math.max(page - 1, 1))}
                      disabled={page === 1}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded disabled:opacity-50"
                  >
                      Prev
                  </button>
                  <span className="px-3 py-1 text-sm bg-white/10 rounded">{page} / {totalPages}</span>
                  <button 
                      onClick={() => fetchProducts(Math.min(page + 1, totalPages))}
                      disabled={page === totalPages}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded disabled:opacity-50"
                  >
                      Next
                  </button>
              </div>
          </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-white/10 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-6">
               <h2 className="text-2xl font-bold">{editingId ? 'Edit Model' : 'Add New Model'}</h2>
               <button onClick={resetForm} className="text-gray-400 hover:text-white">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              
               {/* SECTION 1: Classifications */}
              <div className="space-y-4">
                <h3 className="text-primary font-bold uppercase text-xs tracking-wider border-b border-white/10 pb-1">Vehicle Classification</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="col-span-1 relative">
                    <label className="block text-sm text-gray-400 mb-1">Manufacturer (Brand)</label>
                    <div className="flex gap-2">
                        <select 
                            name="manufacturer" 
                            value={formData.manufacturer} 
                            onChange={handleInputChange} 
                            className="w-full bg-black/30 border border-white/10 rounded p-2" 
                            required 
                        >
                            <option value="">Select Brand</option>
                            {brands.map(b => (
                                <option key={b._id} value={b.name}>{b.name}</option>
                            ))}
                        </select>
                        <button type="button" onClick={() => setShowBrandModal(true)} className="bg-white/10 hover:bg-primary p-2 rounded transition-colors" title="Add New Brand">
                            <Plus size={18} />
                        </button>
                    </div>
                  </div>
                </div>
              </div>

               {/* SECTION 2: Core Info */}
               <div className="space-y-4">
                <h3 className="text-primary font-bold uppercase text-xs tracking-wider border-b border-white/10 pb-1">Product Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-400 mb-1">Product Name</label>
                    <input name="name" value={formData.name} onChange={handleInputChange} className="w-full bg-black/30 border border-white/10 rounded p-2 focus:border-primary outline-none" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4 col-span-2">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">SKU (Stock ID)</label>
                        <input name="sku" value={formData.sku} onChange={handleInputChange} className="w-full bg-black/30 border border-white/10 rounded p-2 focus:border-primary outline-none" placeholder="e.g. POR-911-001" required />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Stock</label>
                        <input type="number" name="stock" value={formData.stock} onChange={handleInputChange} className="w-full bg-black/30 border border-white/10 rounded p-2" required />
                      </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Media & Display */}
              <div className="space-y-4">
                <h3 className="text-primary font-bold uppercase text-xs tracking-wider border-b border-white/10 pb-1">Media & Specs</h3>
                <div className="grid grid-cols-2 gap-4">
                   <div className="col-span-2 space-y-4">
                     <div>
                         <label className="block text-sm text-gray-400 mb-1">Upload New Images (Max 10)</label>
                         <input type="file" multiple accept="image/*" onChange={(e) => setSelectedFiles(Array.from(e.target.files))} className="w-full bg-black/30 border border-white/10 rounded p-2" />
                         {selectedFiles.length > 0 && <p className="text-xs text-primary mt-1">{selectedFiles.length} files selected.</p>}
                     </div>
                     {formData.images && formData.images.length > 0 && (
                         <div>
                             <label className="block text-sm text-gray-400 mb-2">Existing Images</label>
                             <div className="flex flex-wrap gap-2">
                                 {formData.images.map((img, idx) => (
                                     img && (
                                     <div key={idx} className="relative group w-20 h-20 bg-black/50 border border-white/10 rounded overflow-hidden">
                                         <img src={img} alt="Product" className="w-full h-full object-cover" />
                                         <button type="button" onClick={() => handleRemoveExistingImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                             <Trash size={12} />
                                         </button>
                                     </div>
                                     )
                                 ))}
                             </div>
                         </div>
                     )}
                   </div>
                   <div className="col-span-2 flex items-center gap-4">
                      <div className="w-32">
                        <label className="block text-sm text-gray-400 mb-1">Scale</label>
                        <input name="attributes.scale" value={formData.attributes.scale} onChange={handleInputChange} className="w-full bg-black/30 border border-white/10 rounded p-2" placeholder="e.g. 1:18 or N/A" />
                      </div>
                      <div className="flex-1">
                         <label className="block text-sm text-gray-400 mb-1">Exterior Color</label>
                         <input name="attributes.color" value={formData.attributes.color} onChange={handleInputChange} className="w-full bg-black/30 border border-white/10 rounded p-2" placeholder="e.g. Guards Red" />
                      </div>
                      <div className="flex-1">
                         <label className="block text-sm text-gray-400 mb-1">Material</label>
                         <input name="attributes.material" value={formData.attributes.material} onChange={handleInputChange} className="w-full bg-black/30 border border-white/10 rounded p-2" />
                      </div>
                   </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description (Optional)</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} className="w-full bg-black/30 border border-white/10 rounded p-2 h-24"></textarea>
              </div>

              {/* SECTION 4: New Pricing Strategy */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <h3 className="text-primary font-bold uppercase text-xs tracking-wider pb-1">Pricing Strategy</h3>
                
                <div className="bg-white/5 p-4 rounded-lg border border-white/10 space-y-6">
                     <div className="grid grid-cols-2 gap-8">
                         <div>
                            <label className="block text-sm text-gray-400 mb-1">Selling Price (Original)</label>
                            <input 
                                type="number" 
                                value={formData.price} 
                                onChange={(e) => handlePriceChange('price', e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded p-2 text-xl font-bold"
                                placeholder="0"
                                required
                            />
                         </div>
                         <div className="flex items-center pt-6">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input 
                                    type="checkbox" 
                                    checked={formData.enableDiscount}
                                    onChange={(e) => {
                                        const enabled = e.target.checked;
                                        setFormData(prev => ({
                                            ...prev, 
                                            enableDiscount: enabled,
                                            discountPercent: enabled ? '' : '', 
                                            discountedPrice: enabled ? '' : ''
                                        }));
                                    }}
                                    className="accent-primary w-5 h-5"
                                />
                                <div className="leading-tight">
                                    <span className="block font-bold">Enable Discount</span>
                                    <span className="text-xs text-gray-400">Offer a lower price</span>
                                </div>
                            </label>
                         </div>
                     </div>
                      
                      <div className="pt-4 border-t border-white/5">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input 
                                    type="checkbox" 
                                    checked={formData.isFeatured}
                                    onChange={(e) => setFormData({...formData, isFeatured: e.target.checked})}
                                    className="accent-yellow-500 w-5 h-5"
                                />
                                <div className="leading-tight">
                                    <span className="block font-bold">Featured Product</span>
                                    <span className="text-xs text-gray-400">Show on Home Page</span>
                                </div>
                            </label>
                      </div>

                     {formData.enableDiscount && (
                        <div className="grid grid-cols-2 gap-8 animate-in slide-in-from-top-2 border-t border-white/5 pt-4">
                             <div>
                                <label className="block text-sm text-gray-400 mb-1">Discount %</label>
                                <input 
                                    type="number" 
                                    value={formData.discountPercent} 
                                    onChange={(e) => handlePriceChange('discountPercent', e.target.value)}
                                    className="w-full bg-black/30 border border-white/10 rounded p-2 text-yellow-500 font-bold"
                                    placeholder="e.g. 20"
                                    max="100"
                                />
                             </div>
                             <div>
                                <label className="block text-sm text-gray-400 mb-1">Discounted Price (Final)</label>
                                <input 
                                    type="number" 
                                    value={formData.discountedPrice} 
                                    onChange={(e) => handlePriceChange('discountedPrice', e.target.value)}
                                    className="w-full bg-black/30 border border-white/10 rounded p-2 text-green-500 font-bold"
                                    placeholder="Auto-calculated"
                                />
                             </div>
                        </div>
                     )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button type="button" onClick={resetForm} className="px-6 py-3 hover:bg-white/10 rounded-lg font-medium">Cancel</button>
                <button type="submit" className="bg-primary hover:bg-red-700 px-8 py-3 rounded-lg font-bold transition-all shadow-lg hover:shadow-primary/20">
                  {editingId ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBrandModal && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
              <div className="bg-surface border border-white/10 rounded-lg p-6 w-full max-w-sm">
                  <h3 className="text-lg font-bold mb-4">Add New Brand</h3>
                  <form onSubmit={handleAddBrand}>
                      <label className="block text-sm text-gray-400 mb-1">Brand Name</label>
                      <input 
                          autoFocus
                          value={newBrandName} 
                          onChange={(e) => setNewBrandName(e.target.value)}
                          className="w-full bg-black/30 border border-white/10 rounded p-2 mb-4 focus:border-primary outline-none"
                          placeholder="e.g. Tarmac Works"
                      />
                      <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setShowBrandModal(false)} className="px-4 py-2 hover:bg-white/10 rounded">Cancel</button>
                          <button type="submit" className="bg-primary px-4 py-2 rounded font-bold text-sm">Add Brand</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Bulk Discount Modal */}
      {showBulkDiscountModal && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
              <div className="bg-surface border border-white/10 rounded-lg p-6 w-full max-w-md">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Tag className="text-purple-500" />
                      Apply Bulk Discount
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">
                      This will reduce the <strong>Selling Price</strong> of all products matching your current filters by the specified percentage.
                  </p>
                  <form onSubmit={handleBulkDiscount}>
                      <label className="block text-sm text-gray-400 mb-1">Discount Percentage (%)</label>
                      <input 
                          autoFocus
                          type="number"
                          min="1"
                          max="99"
                          value={bulkDiscountPercent} 
                          onChange={(e) => setBulkDiscountPercent(e.target.value)}
                          className="w-full bg-black/30 border border-white/10 rounded p-2 mb-6 focus:border-purple-500 outline-none text-xl font-bold text-purple-400"
                          placeholder="e.g. 10"
                          required
                      />
                      <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setShowBulkDiscountModal(false)} className="px-4 py-2 hover:bg-white/10 rounded">Cancel</button>
                          <button type="submit" className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded font-bold transition-colors">Apply Discount</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default ProductManager;
