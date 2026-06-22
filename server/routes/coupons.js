const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');

// Verify Coupon (Public/Checkout)
const { protect, admin } = require('../middleware/auth');

// Verify Coupon (Public/Checkout)
router.post('/verify', async (req, res) => {
  try {
    const { code, cartItems, totalAmount } = req.body;
    
    
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) return res.status(404).json({ error: 'Invalid Coupon Code' });

    
    if (coupon.expiryDate && new Date() > coupon.expiryDate) {
        return res.status(400).json({ error: 'Coupon Expired' });
    }

    
    if (totalAmount < coupon.minOrderValue) {
        return res.status(400).json({ error: `Minimum order value of ₹${coupon.minOrderValue} required` });
    }

    
    let discount = 0;
    
    if (coupon.applicableType === 'ALL') {
        if (coupon.discountType === 'PERCENTAGE') {
            discount = (totalAmount * coupon.value) / 100;
        } else {
            discount = coupon.value;
        }
    } else {
        
        let eligibleTotal = 0;
        cartItems.forEach(item => {
             let prompt = false;
             if (coupon.applicableType === 'BRAND' && coupon.applicableValues.includes(item.brand)) prompt = true;
             if (coupon.applicableType === 'MODEL') {
                 const validIds = coupon.applicableValues.map(v => String(v));
                 if (validIds.includes(String(item.product))) prompt = true;
             }
             if (prompt) eligibleTotal += (item.price * item.quantity);
        });
        
         if (eligibleTotal === 0) {
             console.log('Coupon Debug Failed. Items:', cartItems.map(i => i.product), 'Applicable:', coupon.applicableValues);
             return res.status(400).json({ 
                 error: `Coupon not applicable to items in cart`,
                 debug: {
                     type: coupon.applicableType,
                     values: coupon.applicableValues,
                     items: cartItems.map(i => ({ prod: i.product, brand: i.brand }))
                 }
            });
         }
        
        if (coupon.discountType === 'PERCENTAGE') {
            discount = (eligibleTotal * coupon.value) / 100;
        } else {
            discount = coupon.value;
        }
    }
    
    if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
    }

    res.json({ 
        success: true, 
        discount: Math.round(discount), 
        code: coupon.code 
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: CRUD - PROTECTED
router.get('/', protect, admin, async (req, res) => {
    const coupons = await Coupon.find().sort({createdAt: -1});
    res.json(coupons);
});

router.post('/', protect, admin, async (req, res) => {
    try {
        console.log('Coupon POST reached. User:', req.user);
        const { value, minOrderValue, expiryDate, code } = req.body;
        
        if (value < 0) return res.status(400).json({ error: 'Discount value cannot be negative' });
        if (minOrderValue < 0) return res.status(400).json({ error: 'Min Order cannot be negative' });
        if (expiryDate && new Date(expiryDate) < new Date()) {
            return res.status(400).json({ error: 'Expiry date must be in the future' });
        }

        const coupon = await Coupon.create(req.body);
        res.status(201).json(coupon);
    } catch(err) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id', protect, admin, async (req, res) => {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
});

module.exports = router;
