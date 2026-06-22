const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Toggle Favorite (Wishlist)
router.post('/wishlist/:productId', async (req, res) => {
  try {
    const { userId } = req.body;
    const { productId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const index = user.favorites.indexOf(productId);
    if (index === -1) {
      user.favorites.push(productId);
    } else {
      user.favorites.splice(index, 1);
    }

    await user.save();
    res.json(user.favorites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Favorites
router.get('/:userId/wishlist', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).populate('favorites');
        res.json(user ? user.favorites : []);
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// Add Address
router.post('/:userId/addresses', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { $push: { addresses: req.body } },
            { new: true, runValidators: true }
        );
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        res.json(user.addresses);
    } catch (err) {
        console.error("Add Address Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Delete Address
router.delete('/:userId/addresses/:addressId', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { $pull: { addresses: { _id: req.params.addressId } } },
            { new: true }
        );
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        res.json(user.addresses);
    } catch (err) {
        console.error("Delete Address Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// GET Cart
router.get('/:userId/cart', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).populate('cart.product');
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        let changed = false;
        const validItems = [];

        user.cart.forEach(item => {
            if (item.product) {
                validItems.push({
                    ...item.product._doc,
                    quantity: item.quantity
                });
            } else {
                changed = true;
            }
        });

        if (changed) {
            user.cart = user.cart.filter(item => item.product);
            await user.save();
        }

        res.json(validItems);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// SAVE Cart (Syncing frontend state to DB)
router.post('/:userId/cart', async (req, res) => {
    try {
        const { items } = req.body; 
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const validatedCart = items.map(item => ({
            product: item._id,
            quantity: item.quantity
        }));

        user.cart = validatedCart;
        await user.save();

        const populatedUser = await User.findById(user._id).populate('cart.product');
        const freshItems = populatedUser.cart.map(item => {
            if (!item.product) return null;
            return {
                ...item.product._doc,
                quantity: item.quantity
            };
        }).filter(Boolean);

        res.json({ message: 'Cart synced successfully', items: freshItems });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
