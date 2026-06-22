import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash, Plus, Upload, Edit, X } from 'lucide-react';

const BrandManager = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentBrands = brands.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(brands.length / rowsPerPage);

  // Edit State
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', image: '', description: '' });

  useEffect(() => { fetchBrands(); }, []);

  const fetchBrands = async () => {
    try {
        const res = await axios.get('/api/brands');
        setBrands(res.data);
        setLoading(false);
    } catch(err) { console.error(err); setLoading(false); }
  };

  const handleDelete = async (id) => {
      if(!window.confirm('Delete brand?')) return;
      await axios.delete(`/api/brands/${id}`);
      fetchBrands();
  };

  const handleEdit = (brand) => {
      setEditingId(brand._id);
      setFormData({ name: brand.name, image: brand.image, description: brand.description });
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
      setEditingId(null);
      setFormData({ name: '', image: '', description: '' });
  };

  const handleSubmit = async (e) => {
      e.preventDefault();
      try {
          if (editingId) {
              await axios.put(`/api/brands/${editingId}`, formData);
          } else {
              await axios.post('/api/brands', formData);
          }
          handleCancel();
          fetchBrands();
      } catch(err) { alert(err.message); }
  };

  return (
    <div className="space-y-6">
        <h2 className="text-2xl font-bold">Brand Manager</h2>
        
        {/* Create/Edit Form */}
        <div className="bg-surface p-6 rounded-xl border border-white/10 relative">
            {editingId && (
                <button onClick={handleCancel} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <X size={20} />
                </button>
            )}
            <h3 className="font-bold mb-4">{editingId ? 'Edit Manufacturer' : 'Add New Manufacturer'}</h3>
            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                    <label className="block text-xs text-gray-500 mb-1">Name</label>
                    <input className="w-full bg-black/30 border border-white/10 rounded p-2" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} required placeholder="e.g. Ferrari" />
                </div>
                <div className="flex-1 w-full">
                    <label className="block text-xs text-gray-500 mb-1">Logo / Image URL</label>
                    <input className="w-full bg-black/30 border border-white/10 rounded p-2" value={formData.image} onChange={e=>setFormData({...formData, image: e.target.value})} placeholder="https://..." />
                </div>
                 <div className="flex-1 w-full">
                    <label className="block text-xs text-gray-500 mb-1">Description (Optional)</label>
                    <input className="w-full bg-black/30 border border-white/10 rounded p-2" value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} />
                </div>
                <div className="flex gap-2">
                    {editingId && <button type="button" onClick={handleCancel} className="px-4 py-2 rounded-lg font-bold hover:bg-white/10 h-10">Cancel</button>}
                    <button className="bg-primary px-6 py-2 rounded-lg font-bold hover:bg-red-600 transition-colors h-10">
                        {editingId ? 'Update' : 'Add'}
                    </button>
                </div>
            </form>
        </div>

        {/* List */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {currentBrands.map(brand => (
                <div key={brand._id} className="bg-surface p-4 rounded-xl border border-white/10 relative group">
                    <div className="aspect-video bg-black/20 rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
                         {brand.image ? <img src={brand.image} alt={brand.name} className="w-full h-full object-contain" /> : <span className="text-gray-600 text-xs">No Image</span>}
                         
                         <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                             <button onClick={() => handleEdit(brand)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white" title="Edit">
                                 <Edit size={16} />
                             </button>
                             <button onClick={() => handleDelete(brand._id)} className="p-2 bg-white/10 hover:bg-red-500/80 rounded-full text-white" title="Delete">
                                 <Trash size={16} />
                             </button>
                         </div>
                    </div>
                    <h4 className="font-bold text-lg">{brand.name}</h4>
                    <p className="text-xs text-gray-500 truncate">{brand.description}</p>
                </div>
            ))}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
            <div className="flex justify-between items-center bg-surface p-4 rounded-xl border border-white/10 mt-4">
                <span className="text-sm text-gray-400">
                    Showing {indexOfFirstRow + 1} to {Math.min(indexOfLastRow, brands.length)} of {brands.length} entries
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
    </div>
  );
};

export default BrandManager;
