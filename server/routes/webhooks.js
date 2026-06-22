const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Order = require('../models/Order');
const Setting = require('../models/Setting');
const shipRocketService = require('../services/shipRocketService');

router.post('/razorpay', async (req, res) => {
    let secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'YOUR_WEBHOOK_SECRET';
    try {
        const dbSecret = await Setting.findOne({ key: 'razorpayWebhookSecret' });
        if (dbSecret && dbSecret.value) secret = dbSecret.value;
    } catch (err) {
        console.error("Error fetching Webhook Secret from DB", err);
    }

    const signature = req.headers['x-razorpay-signature'];

    if (!signature) {
        return res.status(400).send('Missing signature');
    }

    try {
        const expectedSignature = crypto.createHmac('sha256', secret)
            .update(req.body.toString())
            .digest('hex');

        if (expectedSignature !== signature) {
            console.error('Invalid Razorpay Webhook Signature');
            return res.status(400).json({ error: 'Invalid signature' });
        }

        const payload = JSON.parse(req.body.toString());
        const event = payload.event;
        
        if (event === 'payment.captured' || event === 'order.paid') {
            let rzpOrderId;
            if (event === 'order.paid' && payload.payload.order) {
                rzpOrderId = payload.payload.order.entity.id;
            } else if (payload.payload.payment) {
                rzpOrderId = payload.payload.payment.entity.order_id;
            }

            if (rzpOrderId) {
                const order = await Order.findOne({ razorpayOrderId: rzpOrderId });
                
                if (order && order.payment.status !== 'paid') {
                    order.payment.status = 'paid';
                    order.status = 'paid';
                    await order.save();
                    
                    try {
                        const srResponse = await shipRocketService.createOrder(order._id);
                        if (srResponse && srResponse.status_code === 1) {
                            order.status = 'processing';
                        }
                        if (srResponse && srResponse.awb_code) {
                            order.shipping.status = 'manifested';
                            order.shipment = {
                                awbCode: srResponse.awb_code,
                                courierName: srResponse.courier_name || 'System Auto Assign'
                            };
                            order.status = 'processing';
                        }
                        await order.save();
                    } catch (shipErr) {
                        console.error('ShipRocket creation failed from webhook:', shipErr);
                    }
                }
            }
        }

        if (event === 'payment.failed') {
            let rzpOrderId = payload.payload.payment.entity.order_id;
            if (rzpOrderId) {
                const order = await Order.findOne({ razorpayOrderId: rzpOrderId });
                if (order && order.payment.status !== 'paid') {
                    order.payment.status = 'payment_failed';
                    order.status = 'payment_failed';
                    await order.save();
                }
            }
        }

        res.status(200).send('Webhook OK');
    } catch (err) {
        console.error('Webhook processing error:', err);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;
