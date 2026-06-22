const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const mongoose = require('mongoose'); 
const auth = require('../middleware/auth');

const updateProductRating = async (productId) => {
    try {
        const stats = await Review.aggregate([
            { $match: { product: new mongoose.Types.ObjectId(productId), isVisible: true } },
            { $group: { _id: '$product', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]);

        const update = stats.length > 0 
            ? { average: Math.round(stats[0].avgRating * 10) / 10, count: stats[0].count }
            : { average: 0, count: 0 };

        await Product.findByIdAndUpdate(productId, { ratings: update });
    } catch (err) {
        console.error('Error updating product rating:', err);
    }
};

// Check Eligibility (for UI)
router.get('/check-eligibility', auth.protect, async (req, res) => {
    try {
        const { userId, productId } = req.query;
        console.log(`Checking Eligibility for User: ${userId}, Product: ${productId}`);
        console.log(`Req User ID from Token: ${req.user.userId}`);
        

        const order = await Order.findOne({
            user: userId, 
            'items.product': productId,
            status: 'Delivered'
        });
        
        console.log(`Eligibility Result: ${!!order}`);
        res.json({ eligible: !!order });
    } catch (err) {
        console.error('Eligibility Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get Reviews for a Product
router.get('/product/:productId', async (req, res) => {
  try {
    const { sort, star } = req.query;
    
    let query = { product: req.params.productId, isVisible: true };
    
    // Filter by Star Rating
    if (star) {
        query.rating = parseInt(star);
    }

    let sortOption = { createdAt: -1 }; // Default: Newest
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    if (sort === 'highest') sortOption = { rating: -1 };
    if (sort === 'lowest') sortOption = { rating: 1 };

    const reviews = await Review.find(query)
      .populate('user', 'username googleId') // Show name
      .sort(sortOption);
      
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Get ALL Reviews
router.get('/all', async (req, res) => {
    try {
        const reviews = await Review.find()
            .populate('user', 'username email')
            .populate('product', 'name sku')
            .sort({ updatedAt: -1 }); // Sort by Last Modified
        res.json(reviews);
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// Add Review (Protected)
// ... (omitted for brevity, unchanged)

// Update Review (Protected)
router.put('/:id', auth.protect, async (req, res) => {
    try {
        const { rating, text } = req.body;
        
        let review = await Review.findById(req.params.id);
        
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }

        // Verify Ownership
        if (review.user.toString() !== req.user.userId && req.user.role !== 'admin') {
            return res.status(401).json({ error: 'Not authorized' });
        }

        review = await Review.findByIdAndUpdate(req.params.id, { 
            rating, 
            text
        }, { new: true, runValidators: true });
        
        await updateProductRating(review.product);

        res.json(review);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Review (Admin Only)
router.delete('/:id', async (req, res) => {
    try {
        const review = await Review.findByIdAndDelete(req.params.id);
        if(!review) return res.status(404).json({error: 'Not found'});
        
        const stats = await Review.aggregate([
            { $match: { product: review.product, isVisible: true } },
            { $group: { _id: '$product', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]);
        
        const update = stats.length > 0 
            ? { average: Math.round(stats[0].avgRating * 10) / 10, count: stats[0].count }
            : { average: 0, count: 0 };

        await Product.findByIdAndUpdate(review.product, { ratings: update });

        res.json({ message: 'Deleted' });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
