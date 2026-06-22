import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Star, Trash, Eye, EyeOff, X } from 'lucide-react';

const ReviewManager = () => {
  const [reviews, setReviews] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentReviews = reviews.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(reviews.length / rowsPerPage);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
        const res = await axios.get('/api/reviews/all'); 
        setReviews(res.data);
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (id) => {
      if(!window.confirm("Delete this review?")) return;
      try {
          await axios.delete(`/api/reviews/${id}`);
          setReviews(reviews.filter(r => r._id !== id));
          if (selectedReview && selectedReview._id === id) setSelectedReview(null);
      } catch(err) {
          alert('Failed to delete');
      }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Review Management</h2>
      
      <div className="bg-surface rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto whitespace-nowrap">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-gray-400 text-sm uppercase">
              <tr>
                <th className="p-4 min-w-[200px]">Product</th>
                <th className="p-4 min-w-[150px]">User</th>
                <th className="p-4 min-w-[120px]">Rating</th>
                <th className="p-4 min-w-[250px]">Review</th>
                <th className="p-4 text-right min-w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                  <tr><td colSpan="5" className="p-8 text-center text-gray-500">Loading Reviews...</td></tr>
              ) : reviews.length === 0 ? (
                  <tr><td colSpan="5" className="p-8 text-center text-gray-500">No reviews found.</td></tr>
              ) : (
                  currentReviews.map(review => (
                      <tr 
                          key={review._id} 
                          className="hover:bg-white/5 cursor-pointer transition-colors"
                          onClick={() => setSelectedReview(review)}
                      >
                          <td className="p-4">
                              <div className="font-bold">{review.product?.name || 'Unknown Item'}</div>
                              <div className="text-xs text-gray-500">{review.product?.sku}</div>
                          </td>
                          <td className="p-4 text-sm">
                              {review.user?.username || review.user?.email || 'Unknown User'}
                          </td>
                          <td className="p-4">
                              <div className="flex text-yellow-500">
                                  {[...Array(5)].map((_, i) => (
                                      <Star key={i} size={14} fill={i < review.rating ? "currentColor" : "none"} />
                                  ))}
                              </div>
                          </td>
                          <td className="p-4 text-sm text-gray-300 max-w-xs truncate">
                              {review.text}
                          </td>
                          <td className="p-4 text-right">
                              <button 
                                  onClick={(e) => { e.stopPropagation(); handleDelete(review._id); }} 
                                  className="p-2 hover:text-red-500 rounded hover:bg-white/10" 
                                  title="Delete Review"
                              >
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
                  Showing {indexOfFirstRow + 1} to {Math.min(indexOfLastRow, reviews.length)} of {reviews.length} entries
              </span>
              <div className="flex gap-2">
                  <button 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded disabled:opacity-50"
                  >
                      Prev
                  </button>
                  <span className="px-3 py-1 text-sm bg-white/10 rounded">{currentPage} / {totalPages}</span>
                  <button 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded disabled:opacity-50"
                  >
                      Next
                  </button>
              </div>
          </div>
      )}

      {/* Review Details Modal */}
      {selectedReview && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedReview(null)}>
              <div className="bg-surface border border-white/10 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setSelectedReview(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <X size={24} />
                  </button>
                  
                  <div className="flex gap-4 mb-6">
                      {selectedReview.product?.images?.[0] && (
                          <img src={selectedReview.product.images[0]} alt="Product" className="w-20 h-20 object-cover rounded-lg border border-white/10" />
                      )}
                      <div>
                          <h3 className="text-xl font-bold">{selectedReview.product?.name}</h3>
                          <div className="flex items-center gap-2 text-yellow-500 my-1">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={16} fill={i < selectedReview.rating ? "currentColor" : "none"} />
                                ))}
                                <span className="text-white text-sm ml-2">({selectedReview.rating}/5)</span>
                          </div>
                          <p className="text-sm text-gray-400">By {selectedReview.user?.username || 'Unknown'}</p>
                      </div>
                  </div>

                  <div className="bg-white/5 p-4 rounded-xl border border-white/5 mb-6">
                      <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                          {selectedReview.text}
                      </p>
                  </div>

                  {selectedReview.images && selectedReview.images.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {selectedReview.images.map((img, i) => (
                              <img key={i} src={img} alt="Review attachment" className="rounded-lg border border-white/10 w-full h-32 object-cover" />
                          ))}
                      </div>
                  )}
                  
                  <div className="flex justify-end mt-6 pt-4 border-t border-white/10">
                      <button 
                        onClick={() => handleDelete(selectedReview._id)} 
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-6 py-2 rounded-lg font-bold flex items-center gap-2"
                      >
                          <Trash size={18} /> Delete Review
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ReviewManager;
