const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const nodemailer = require('nodemailer');

const Product = require('../models/Product');
const razorpayService = require('../services/razorpayService');
const shipRocketService = require('../services/shipRocketService');
const { generateInvoice } = require('../utils/invoiceGenerator');

// Create Order (Protected)
router.post('/', require('../middleware/auth').protect, async (req, res) => {
  try {
    const { items, totalAmount, shippingAddress, billingAddress, discountApplied, couponCode, payment, saveAddress, shipping } = req.body;
    const userId = req.user.userId; 

    // 1. Validate Stock & Build Snapshot
    const orderItems = [];
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ error: `Product not found: ${item.name || item.product}` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}. Only ${product.stock} left.` });
      }
      
      // Create Snapshot
      orderItems.push({
        product: product._id,
        name: product.name,
        sku: product.sku,
        pimg: product.images && product.images[0] ? product.images[0] : '', 
        quantity: item.quantity,
        price: product.price 
      });
    }

    // 2. Create Order
    const newOrder = new Order({
      user: userId,
      items: orderItems, 
      totalAmount,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress, 
      discountApplied: discountApplied || 0,
      couponCode: couponCode || null,
      payment,
      shipping: { 
          status: 'pending',
          cost: shipping?.cost || 0,
          method: shipping?.method || 'Standard'
      }
    });

    // 3. Update Stock (Decrement)
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, { 
        $inc: { stock: -item.quantity, soldCount: item.quantity } 
      });
    }

    await newOrder.save();
    
    if (saveAddress && userId) {
        await User.findByIdAndUpdate(userId, {
            $addToSet: { addresses: shippingAddress }
        });
    }
    
    // Log Order Creation
    await require('../models/Log').create({
        type: 'ECOMMERCE',
        action: 'ORDER_CREATED',
        details: { orderId: newOrder._id, amount: totalAmount },
        actor: { userId: userId, username: 'Customer' } 
    });

    // 6. Handle Razorpay Payment Generation
    if (payment.provider === 'Razorpay') {
        try {
           const rzpOrder = await razorpayService.createOrder(totalAmount, newOrder._id);
           newOrder.payment.razorpayOrderId = rzpOrder.id;
           await newOrder.save();
           
           // Fetch fresh user to return updated addresses
           let updatedAddresses = null;
           if (userId) {
               const freshUser = await User.findById(userId);
               updatedAddresses = freshUser ? freshUser.addresses : null;
           }
           
           return res.status(201).json({
               order: newOrder,
               razorpayOrder: rzpOrder,
               updatedAddresses
           });
        } catch (err) {
           return res.status(500).json({ error: 'Failed to initialize payment gateway' });
        }
    }

    let updatedAddresses = null;
    if (userId) {
        const freshUser = await User.findById(userId);
        updatedAddresses = freshUser ? freshUser.addresses : null;
    }
    
    res.status(201).json({ order: newOrder, updatedAddresses });
  } catch (err) {
    console.error("Order Creation Failed:", err);
    res.status(400).json({ error: err.message });
  }
});

// Get User Orders (by User/Guest ID)
router.get('/my-orders', require('../middleware/auth').protect, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    await Order.updateMany(
       { status: 'pending_payment', createdAt: { $lt: tenMinsAgo } },
       { $set: { status: 'cancelled', adminNotes: 'System automatically cancelled: Payment window 10m expired.' } }
    );

    const query = { user: userId };
    console.log(`[DEBUG] Fetching MyOrders for user: ${userId}`);
    const orders = await Order.find(query).sort({ createdAt: -1 });
    
    if (orders.length === 0) {
        console.log(`[DEBUG] No orders found for user: ${userId}. Checking if any orders exist with this ID but different status...`);
    } else {
        console.log(`[DEBUG] Found ${orders.length} orders for user: ${userId}`);
    }

    const purchaseCounts = {};
    orders.forEach(order => {
        order.items.forEach(item => {
            if (item.product) {
                const pid = item.product.toString();
                purchaseCounts[pid] = (purchaseCounts[pid] || 0) + 1;
            }
        });
    });

    const enrichedOrders = orders.map(order => {
        const orderObj = order.toObject();
        orderObj.items = orderObj.items.map(item => ({
            ...item,
            purchaseCount: item.product ? purchaseCounts[item.product.toString()] : 0
        }));
        return orderObj;
    });

    res.json(enrichedOrders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/verify-payment', require('../middleware/auth').protect, async (req, res) => {
    try {
        const { orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        const isValid = await razorpayService.verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);

        if (isValid) {
            order.payment.status = 'paid';
            order.payment.transactionId = razorpay_payment_id;

            const paymentDetails = await razorpayService.getPayment(razorpay_payment_id);
            if (paymentDetails) {
                const paidAmount = paymentDetails.amount / 100; 
                if (paidAmount !== order.totalAmount) {
                     order.adminNotes = `[CRITICAL WARNING] Razorpay captured ₹${paidAmount}, while internal invoice expected ₹${order.totalAmount}!\n${order.adminNotes || ''}`;
                }
            }
            
            await order.save();
            
            if (req.body.saveAddress && req.user && req.user.userId) {
                const addressPayload = {
                    label: order.shippingAddress.label || 'Saved Address',
                    fullName: order.shippingAddress.fullName,
                    street: order.shippingAddress.street,
                    city: order.shippingAddress.city,
                    state: order.shippingAddress.state,
                    zip: order.shippingAddress.zip,
                    country: order.shippingAddress.country,
                    phone: order.shippingAddress.phone
                };
                await User.findByIdAndUpdate(req.user.userId, {
                    $push: { addresses: addressPayload }
                });
            }

            try {
                const pdfBuffer = await generateInvoice(order);
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.NODEMAILER_EMAIL,
                        pass: process.env.NODEMAILER_PASSWORD
                    }
                });
                
                const targetEmail = order.billingAddress?.email || order.shippingAddress?.email;
                if (targetEmail) {
                    await transporter.sendMail({
                        from: `"WheelRiot" <${process.env.NODEMAILER_EMAIL}>`,
                        to: targetEmail,
                        subject: `Invoice for Order #WR-${order._id.toString().slice(-6).toUpperCase()}`,
                        text: `Thank you for your order! Please find your invoice attached.`,
                        attachments: [
                            {
                                filename: `Invoice-WR-${order._id.toString().slice(-6).toUpperCase()}.pdf`,
                                content: pdfBuffer
                            }
                        ]
                    });
                    console.log("Invoice email sent to", targetEmail);
                }
            } catch (invoiceErr) {
                console.error("Failed to compile or send invoice PDF:", invoiceErr);
            }
            
            // Trigger Discord Webhook Alert
            try {
                const { sendDiscordWebhook } = require('../services/discordService');
                await sendDiscordWebhook(order);
            } catch (discordErr) {
                console.error("Discord Ping Failed", discordErr);
            }

            res.json({ success: true, message: 'Payment verified successfully.' });
        } else {
            order.payment.status = 'payment_failed';
            await order.save();
            res.status(400).json({ success: false, error: 'Invalid signature. Payment failed.' });
        }
    } catch (err) {
        console.error("Payment Verification Error:", err);
        res.status(500).json({ error: 'Internal server error during verification' });
    }
});

// Handle Razorpay Payment Failure Sync
router.post('/payment-failed', async (req, res) => {
    try {
        const { orderId, errorDetails } = req.body;
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        
        order.status = 'pending_payment';
        order.payment.status = 'payment_failed';
        await order.save();
        
        await require('../models/Log').create({
            type: 'ECOMMERCE',
            action: 'RAZORPAY_PAYMENT_FAILED',
            details: { orderId, errorDetails },
            actor: { username: 'System' }
        });
        
        res.json({ success: true, message: 'Order marked as payment failed. User can retry.' });
    } catch (err) {
        console.error("Payment Failure Sync Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Admin: Bulk Ship Orders
router.post('/bulk-ship', async (req, res) => {
    try {
        const { orderIds } = req.body;
        if (!orderIds || !Array.isArray(orderIds)) {
            return res.status(400).json({ error: 'orderIds array is required' });
        }

        const shipRocketService = require('../services/shipRocketService');
        const results = [];

        for (const id of orderIds) {
            const order = await Order.findById(id);
            if (!order) {
                results.push({ id, status: 'failed', reason: 'Not found' });
                continue;
            }
            if (['processing', 'paid'].includes(order.status) && !order.shiprocketOrderId) {
                try {
                    const srRes = await shipRocketService.createOrder(order._id);
                    order.status = 'ready_to_ship';
                    if (srRes && srRes.awb_code) {
                        order.shipment = {
                            awbCode: srRes.awb_code,
                            courierName: srRes.courier_name || 'System Auto Assign'
                        };
                    }
                    await order.save();
                    results.push({ id, status: 'success', awb: srRes?.awb_code });
                } catch (err) {
                    results.push({ id, status: 'failed', reason: err.message });
                }
            } else {
                 results.push({ id, status: 'skipped', reason: 'Invalid status or already shipped' });
            }
        }
        res.json({ results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Mock Shiprocket Tracking Simulator
router.post('/:id/simulate-tracking', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // packing, in_transit, delivered
        
        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        
        const validStatuses = ['processing', 'packing', 'in_transit', 'delivered'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid sim status' });
        }
        
        order.status = status;
        if (status === 'packing') {
            order.shipping.status = 'manifested';
            if (!order.shipping.trackingUrl) {
                order.shipping.awbCode = 'MOCK_AWB_9999';
                order.shipping.trackingUrl = `https://shiprocket.co/tracking/MOCK_AWB_9999`;
            }
        } else if (status === 'in_transit') {
            order.shipping.status = 'in_transit';
        } else if (status === 'delivered') {
            order.shipping.status = 'delivered';
        }
        
        await order.save();
        res.json({ success: true, order });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const { isValidObjectId } = require('mongoose');


// Admin: Get All Orders (Filtered)
router.get('/', async (req, res) => {
  try {
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    await Order.updateMany(
       { status: 'pending_payment', createdAt: { $lt: tenMinsAgo } },
       { $set: { status: 'cancelled', adminNotes: 'System automatically cancelled: Payment window 10m expired.' } }
    );

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { search, archived } = req.query;
    let query = {};
    
    // Archive Filter (Default: Show Unarchived)
    if (archived === 'true') {
        query.archived = true;
    } else {
        query.archived = { $ne: true };
    }

    // Search (Order ID or Customer Name)
    if (search) {
       const searchRegex = { $regex: search, $options: 'i' };
       const conditions = [
         { 'shippingAddress.label': searchRegex },
         { 'shippingAddress.fullName': searchRegex },
         { 'payment.transactionId': searchRegex },
         { $expr: { $regexMatch: { input: { $toString: "$_id" }, regex: search, options: "i" } } }
       ];
       
       if (isValidObjectId(search)) {
           conditions.push({ _id: search });
       }
       
       query.$or = conditions;
    }
    
    const total = await Order.countDocuments(query);
    const pages = Math.ceil(total / limit);

    const orders = await Order.find(query)
      .populate('user', 'email fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({ orders, total, pages, currentPage: page });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle Archive (Auto-Cancel)
router.put('/:id/archive', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if(!order) return res.status(404).json({error: 'Order not found'});
        
        if (!order.archived) {
            if (order.status !== 'cancelled') {
                // 1. Process Razorpay Refund
                if (order.payment.provider === 'Razorpay' && order.payment.status === 'paid') {
                    try {
                        const razorpayService = require('../services/razorpayService');
                        const refund = await razorpayService.issueRefund(order.payment.transactionId, order.totalAmount);
                        order.payment.status = 'refunded';
                        
                        await require('../models/Log').create({
                            type: 'SYSTEM', action: 'RAZORPAY_REFUND_SUCCESS', details: { orderId: order._id, refundId: refund.id }, actor: { username: 'System' }
                        });
                    } catch (refErr) {
                        console.error("Razorpay refund failed:", refErr);
                        await require('../models/Log').create({
                            type: 'SYSTEM', action: 'RAZORPAY_REFUND_FAILED', details: { orderId: order._id, error: refErr.message }, actor: { username: 'System' }
                        });
                    }
                }

                // 2. Process Shiprocket Cancellation
                if (order.shipment && order.shipment.awbCode) {
                    try {
                        const shipRocketService = require('../services/shipRocketService');
                        await shipRocketService.cancelOrder(order.shiprocketOrderId || order._id);
                    } catch (srErr) {
                        console.error("Shiprocket auto-cancel failed:", srErr);
                    }
                }
            }
            order.status = 'cancelled';
        }
        
        order.archived = !order.archived;
        await order.save();
        res.json(order);
    } catch(err) {
        res.status(400).json({ error: err.message });
    }
});

// Admin: Update Order Status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const normalizedStatus = status.toLowerCase();
    
    if (normalizedStatus === 'paid' && order.status === 'pending_payment') {
        order.payment.status = 'paid';
    }

    // Handle Cancellation Logic
    if (normalizedStatus === 'cancelled' && order.status !== 'cancelled') {
        // 1. Process Razorpay Refund
        if (order.payment.provider === 'Razorpay' && order.payment.status === 'paid') {
            try {
                const razorpayService = require('../services/razorpayService');
                const refund = await razorpayService.issueRefund(order.payment.transactionId, order.totalAmount);
                order.payment.status = 'refunded';
                
                await require('../models/Log').create({
                    type: 'SYSTEM', action: 'RAZORPAY_REFUND_SUCCESS', details: { orderId: order._id, refundId: refund.id }, actor: { username: 'System' }
                });
            } catch (refErr) {
                console.error("Razorpay refund failed:", refErr);
                await require('../models/Log').create({
                    type: 'SYSTEM', action: 'RAZORPAY_REFUND_FAILED', details: { orderId: order._id, error: refErr.message }, actor: { username: 'System' }
                });
            }
        }

        // 2. Process Shiprocket Cancellation
        if (order.shipment && order.shipment.awbCode) {
            try {
                const shipRocketService = require('../services/shipRocketService');
                await shipRocketService.cancelOrder(order.shiprocketOrderId || order._id);
            } catch (srErr) {
                console.error("Shiprocket auto-cancel failed:", srErr);
            }
        }
    }

    order.status = normalizedStatus;
    await order.save();
    
    // Create Log
    await require('../models/Log').create({
        type: 'ECOMMERCE',
        action: 'ORDER_STATUS_UPDATE',
        details: { orderId: order._id, status: normalizedStatus },
        actor: { username: 'Admin' }
    });

    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Retry Payment (Generate new Razorpay Order ID)
router.post('/:id/retry-payment', require('../middleware/auth').protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        
        // Ensure user owns order or is admin
        if (order.user.toString() !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        if (order.payment.status !== 'payment_failed' && order.payment.status !== 'pending') {
            return res.status(400).json({ error: 'Order is not in a failed or pending state' });
        }

        const razorpayService = require('../services/razorpayService');
        const rzpOrder = await razorpayService.createOrder(order.totalAmount, order._id);
        
        order.payment.razorpayOrderId = rzpOrder.id;
        await order.save();

        res.json({ razorpayOrder: rzpOrder });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Admin Notes
router.put('/:id/notes', require('../middleware/auth').protect, require('../middleware/auth').admin, async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(req.params.id, { adminNotes: req.body.notes }, { new: true });
        res.json({ success: true, order });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// Generate Invoice PDF
router.get('/:id/invoice', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order._id.toString().slice(-6)}.pdf`);
    
    generateInvoice(order, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Initiate Return for a Delivered Order
router.post('/:id/return', require('../middleware/auth').protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        
        if (order.user.toString() !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        if (order.status !== 'delivered') {
            return res.status(400).json({ error: 'Only delivered orders can be returned' });
        }

        // Update status
        order.status = 'return_requested';
        await order.save();

        // Trigger ShipRocket Return API
        const shipRocketService = require('../services/shipRocketService');
        try {
            await shipRocketService.createReturnOrder(order);
        } catch (srErr) {
            console.error("Failed to automate ShipRocket return. Manual intervention required:", srErr);
        }

        await require('../models/Log').create({
            type: 'ECOMMERCE', action: 'RETURN_INITIATED', details: { orderId: order._id }, actor: { username: req.user.role === 'admin' ? 'Admin' : 'Customer' }
        });

        res.json({ success: true, order });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Invoice PDF directly
router.get('/:id/invoice', require('../middleware/auth').protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        
        // Security: Ensure the user requesting parsing is the owner or an admin
        if (order.user.toString() !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized viewing capability' });
        }

        const pdfBuffer = await generateInvoice(order);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="invoice-${order._id}.pdf"`);
        res.send(pdfBuffer);
    } catch (err) {
        console.error("Invoice Preview Error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
