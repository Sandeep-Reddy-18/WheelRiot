import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Star, Edit, Filter, X, StarHalf } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const ReviewSection = ({ productId }) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [eligible, setEligible] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  
  const [filters, setFilters] = useState({ sort: 'newest', star: '' });
  
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchReviews();
    if (user) {
        checkEligibility();
    }
  }, [productId, filters, user]);

  const checkEligibility = async () => {
      setCheckingEligibility(true);
      try {
          const res = await axios.get('/api/reviews/check-eligibility', {
              params: { userId: user._id || user.id, productId }
          });
          setEligible(res.data.eligible);
      } catch (err) {
          console.error(err);
      } finally {
          setCheckingEligibility(false);
      }
  };

  const fetchReviews = async () => {
    try {
      const res = await axios.get(`/api/reviews/product/${productId}`, { params: filters });
      setReviews(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (review) => {
      setEditingId(review._id);
      setRating(review.rating);
      setText(review.text);
      document.getElementById('review-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError('');

    try {
      if (editingId) {
        // Update
          const res = await axios.put(`/api/reviews/${editingId}`, {
             userId: user._id || user.id,
             rating,
             text
          });
          setReviews(reviews.map(r => r._id === editingId ? res.data : r));
          setEditingId(null);
      } else {
        // Create
          const res = await axios.post('/api/reviews', {
            userId: user._id || user.id,
            productId,
            rating,
            text
          });
          setReviews([res.data, ...reviews]);
      }
      
      setText('');
      setRating(5);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  // Star Rating Logic
  const handleStarClick = (e, starIndex) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const isLeftHalf = (e.clientX - rect.left) < (rect.width / 2);
      setRating(isLeftHalf ? starIndex - 0.5 : starIndex);
  };
  
  const handleStarHover = (e, starIndex) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const isLeftHalf = (e.clientX - rect.left) < (rect.width / 2);
      setHoverRating(isLeftHalf ? starIndex - 0.5 : starIndex);
  };

  const renderStars = (currentRating, interactive = false) => {
      return [...Array(5)].map((_, i) => {
         const starValue = i + 1;
         const isHalf = currentRating === starValue - 0.5;
         const isFull = currentRating >= starValue;

         if (interactive) {
             return (
                 <button 
                    type="button" 
                    key={starValue}
                    onClick={(e) => handleStarClick(e, starValue)}
                    onMouseMove={(e) => handleStarHover(e, starValue)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-110 focus:outline-none"
                 >
                    <div className="relative">
                        <Star 
                            size={24} 
                            className={`${(hoverRating || rating) >= starValue ? 'text-yellow-500 fill-yellow-500' : 'text-gray-600'}`} 
                        />
                        {(hoverRating || rating) === starValue - 0.5 && (
                             <div className="absolute inset-0 overflow-hidden w-1/2 text-yellow-500">
                                 <Star size={24} fill="currentColor" />
                             </div>
                        )}
                    </div>
                 </button>
             );
         }
         
         return (
             <div key={i} className="relative">
                 <Star size={14} className="text-gray-600" />
                 {isFull && <div className="absolute inset-0 text-yellow-500"><Star size={14} fill="currentColor" /></div>}
                 {isHalf && <div className="absolute inset-0 w-[50%] overflow-hidden text-yellow-500"><Star size={14} fill="currentColor" /></div>}
             </div>
         );
      });
  };

  return (
    <div className="mt-16 border-t border-white/10 pt-10">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
         <h3 className="text-2xl font-brand">Customer Reviews</h3>
         
         <div className="flex gap-4">
            <select 
                value={filters.sort}
                onChange={(e) => setFilters({...filters, sort: e.target.value})}
                className="bg-surface border border-white/10 px-4 py-2 rounded-lg outline-none cursor-pointer text-sm"
            >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="highest">Highest Rated</option>
                <option value="lowest">Lowest Rated</option>
            </select>
         </div>
      </div>

      <div className="grid md:grid-cols-2 gap-12">
        {/* Reviews List */}
        <div className="space-y-6 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
          {loading ? (
             <div className="text-gray-500">Loading reviews...</div>
          ) : reviews.length === 0 ? (
             <div className="text-gray-500 py-8 text-center border border-dashed border-white/10 rounded-xl">
                 No reviews match your filters.
             </div>
          ) : (
             reviews.map((review) => (
                <div key={review._id} className="bg-surface p-4 rounded-xl border border-white/5 relative group transition-all hover:bg-white/5">
                   <div className="flex justify-between items-start mb-2">
                      <div>
                         <div className="font-bold text-sm text-gray-300 flex items-center gap-2">
                            {review.user?.username || 'Verified Customer'}
                            {(user && (user._id === review.user?._id || user.id === review.user?._id)) && (
                                <span className="text-[10px] bg-primary/20 text-primary px-1 rounded">YOU</span>
                            )}
                         </div>
                         <div className="text-xs text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString()}
                         </div>
                      </div>
                      <div className="flex gap-1">
                         {renderStars(review.rating, false)}
                      </div>
                   </div>
                   <p className="text-gray-400 text-sm whitespace-pre-wrap">{review.text}</p>
                   
                   {/* Edit Button */}
                   {(user && (user._id === review.user?._id || user.id === review.user?._id)) && (
                       <div className="absolute top-4 right-4">
                           <button 
                             onClick={() => handleEdit(review)}
                             className="p-2 bg-black/50 hover:bg-white rounded-full text-gray-400 hover:text-black transition-all opacity-0 group-hover:opacity-100"
                             title="Edit Review"
                           >
                               <Edit size={14} />
                           </button>
                       </div>
                   )}
                </div>
             ))
          )}
        </div>

        {/* Write Review Form */}
        <div id="review-form" className="bg-surface/50 p-6 rounded-xl border border-white/10 h-fit sticky top-24">
           <div className="flex justify-between items-center mb-4">
               <h4 className="text-lg font-bold">{editingId ? 'Edit Your Review' : 'Write a Review'}</h4>
               {editingId && <button onClick={() => { setEditingId(null); setText(''); setRating(5); }} className="text-xs text-red-400">Cancel Edit</button>}
           </div>
           
           {!user ? (
             <div className="text-center py-6">
                <p className="text-gray-400 mb-4">Please login to write a review</p>
                <Link to="/login" className="bg-primary text-black px-6 py-2 rounded font-bold hover:bg-primary/90 transition-colors">
                   Login
                </Link>
             </div>
           ) : !eligible && !editingId ? (
              <div className="text-center py-8 border border-dashed border-white/10 rounded-lg">
                  <p className="text-gray-400 mb-2">Verified Purchase Required</p>
                  <p className="text-xs text-gray-500">You can only review models you have purchased.</p>
              </div>
           ) : (
             <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="text-red-500 text-sm bg-red-500/10 p-2 rounded">{error}</div>}
                
                <div>
                   <label className="block text-sm text-gray-400 mb-2">Rating</label>
                   <div className="flex gap-2" onMouseLeave={() => setHoverRating(0)}>
                      {renderStars(hoverRating || rating, true)}
                   </div>
                   <div className="text-xs text-gray-500 mt-1">
                       {hoverRating || rating} / 5
                   </div>
                </div>

                <div>
                   <label className="block text-sm text-gray-400 mb-2">Review</label>
                   <textarea 
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      className="w-full bg-black/20 border border-white/10 rounded p-3 text-white focus:outline-none focus:border-primary min-h-[100px]"
                      placeholder="Share your thoughts..."
                      maxLength={1000}
                   />
                   <div className="text-right text-xs text-gray-500 mt-1">{text.length}/1000</div>
                </div>

                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full bg-primary text-black font-bold py-3 rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : (editingId ? 'Update Review' : 'Post Review')}
                </button>
             </form>
           )}
        </div>
      </div>
    </div>
  );
};

export default ReviewSection;
