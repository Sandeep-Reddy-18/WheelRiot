const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const shipRocketService = require('../services/shipRocketService');
const Order = require('../models/Order');
const Setting = require('../models/Setting');
const nodemailer = require('nodemailer');

// Get Admin Data (Wallet & Pickups)
router.get('/admin-data', auth.protect, auth.admin, async (req, res) => {
    try {
        const data = await shipRocketService.getAdminData();
        res.json(data);
    } catch(err) {
        console.error('Admin Data Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Manual Shiprocket Order Creation (Admin)
router.post('/create-shiprocket/:id', auth.protect, auth.admin, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        
        if (order.shipping?.awbCode) {
            return res.status(400).json({ error: 'ShipRocket order already exists for this order.' });
        }

        const { length, breadth, height, weight } = req.body;
        
        let pickup = 'Primary';
        const pickupSetting = await Setting.findOne({ key: 'shipRocketPickupLocation' });
        if (pickupSetting && pickupSetting.value) pickup = pickupSetting.value;

        const shipRes = await shipRocketService.createOrder(order, null, pickup, weight, length, breadth, height);
        
        order.status = 'waiting_for_pickup';
        order.shipping.status = 'manifested';
        order.shipping.awbCode = shipRes.awb_code;
        order.shipping.shipmentId = shipRes.shipment_id; 
        order.shiprocketOrderId = shipRes.order_id;
        await order.save();

        res.json({ success: true, shipRes, order });
    } catch (err) {
        console.error("Manual Shiprocket Creation Error:", err.message);
        res.status(500).json({ error: err.message || 'Failed to push to Shiprocket' });
    }
});

// Check Serviceability (Public - for product page)
router.post('/serviceability', async (req, res) => {
    console.log('[DEBUG] Hit /serviceability route', req.body);
    try {
        const { pincode, weight = 0.5, cod = 1 } = req.body;
        
        // Get pickup pincode from settings or default
        const pickupPincodeSetting = await Setting.findOne({ key: 'shipRocketPickupPincode' });
        const pickupPincode = pickupPincodeSetting ? pickupPincodeSetting.value : '533001'; // Default Fallback (Kakinada)

        const result = await shipRocketService.checkServiceability(pickupPincode, pincode, weight, cod);
        
        if (result.status === 200 && result.data && result.data.available_courier_companies.length > 0) {
            const couriers = result.data.available_courier_companies;
            const recommended = couriers[0]; 
            
            // High Shipping Cost Alert
            if (recommended.rate > 120) {
                try {
                    await require('../models/Log').create({
                        type: 'SYSTEM',
                        action: 'HIGH_SHIPPING_COST_ALERT',
                        details: { pincode, rate: recommended.rate, courier: recommended.courier_name },
                        actor: { username: 'System' }
                    });
                } catch(err) {
                    console.error('Failed to log high shipping cost:', err);
                }
            }

            res.json({
                deliverable: true,
                etd: recommended.etd, 
                courier_name: recommended.courier_name,
                rates: recommended.rate,
                city: result.data.city || result.data.delivery_city,
                state: result.data.state || result.data.delivery_state,
                all_couriers: couriers.map(c => ({ name: c.courier_name, etd: c.etd, rate: c.rate })) // Optional: send all options
            });
        } else {
            res.json({ deliverable: false });
        }
    } catch (err) {
        console.error('Serviceability Error:', err.message);
        res.json({ deliverable: false, error: err.message });
    }
});



// ShipRocket Webhook
router.post('/webhook', async (req, res) => {
    try {
        const { awb, current_status, shipment_id, etd, tracking_url, order_id, current_status_id } = req.body;
        
        console.log(`\n=== [SHIPROCKET WEBHOOK TRIGGERED] ===`);
        console.log(JSON.stringify(req.body, null, 2)); 
        console.log(`AWB: ${awb} | SR-Order-ID: ${order_id} | Status: ${current_status} (#${current_status_id})`);
        
        // Map ShipRocket Status ID to Our Internal Order Status
        let newStatus = null;
        const srStatusId = Number(current_status_id);
        const srStatus = current_status ? current_status.toUpperCase().trim() : '';

        // Comprehensive Mapping Based on User-Provided Codes
        const mapping = {
            delivered: [7, 26, 41],
            cancelled: [5, 27, 30, 54],
            rto: [9, 15, 16, 17, 45, 46, 55, 68, 87, 90],
            in_transit: [6, 19, 20, 25, 32, 43, 48, 51, 60, 61, 64],
            waiting_for_pickup: [3, 4, 12, 13, 14, 34, 47, 70],
            packing: [69, 75, 76, 81]
        };

        if (mapping.delivered.includes(srStatusId)) {
            newStatus = 'delivered';
        } else if (mapping.cancelled.includes(srStatusId)) {
            newStatus = 'cancelled';
        } else if (mapping.rto.includes(srStatusId)) {
            newStatus = 'rto';
        } else if (mapping.in_transit.includes(srStatusId)) {
            newStatus = 'in_transit';
        } else if (mapping.waiting_for_pickup.includes(srStatusId)) {
            newStatus = 'waiting_for_pickup';
        } else if (mapping.packing.includes(srStatusId)) {
            newStatus = 'packing';
        }
        
        // Secondary Fallback
        if (!newStatus && srStatus) {
            if (srStatus.includes('DELIVERED')) newStatus = 'delivered';
            else if (srStatus.includes('CANCELLED') || srStatus.includes('CANCELED')) newStatus = 'cancelled';
            else if (srStatus.includes('RTO')) newStatus = 'rto';
            else if (['SHIPPED', 'IN TRANSIT', 'PICKED UP', 'MANIFESTED', 'OUT FOR DELIVERY', 'HANDED OVER'].some(s => srStatus.includes(s))) {
                newStatus = 'in_transit';
            }
        }

        let queryConditions = [];
        
        if (order_id && order_id.length === 24) { 
            queryConditions.push({ '_id': order_id });
        }

        if (shipment_id && (typeof shipment_id === 'string' || typeof shipment_id === 'number')) {
            queryConditions.push({ 'shipping.shipmentId': shipment_id.toString() });
        }
        
        if (awb && typeof awb === 'string' && awb.trim() !== '') {
            queryConditions.push({ 'shipping.awbCode': awb });
        }

        if (queryConditions.length > 0) {
             const order = await Order.findOne({ $or: queryConditions });

             if (order) {
                 console.log(`[ShipRocket Webhook] Matched Order WR-${order._id.toString().slice(-6).toUpperCase()}`);
                 
                 // Update Logistics Info
                 if (current_status) order.shipping.status = current_status;
                 if (etd) order.shipping.etd = etd;
                 if (tracking_url) order.shipping.trackingUrl = tracking_url;
                 if (awb) order.shipping.awbCode = awb;
                 
                 const terminalStates = ['delivered', 'cancelled', 'rto'];
                 if (newStatus && !terminalStates.includes(order.status)) {
                     console.log(`[ShipRocket Webhook] YES! Changing status from '${order.status}' -> '${newStatus}'`);
                     order.status = newStatus;
                 }
                 
                 await order.save();

                 // Send Email Update
                 try {
                     const targetEmail = order.billingAddress?.email || order.shippingAddress?.email;
                     if (targetEmail && newStatus) {
                         const transporter = nodemailer.createTransport({
                             service: 'gmail',
                             auth: { user: process.env.NODEMAILER_EMAIL, pass: process.env.NODEMAILER_PASSWORD }
                         });
                         
                         let humanStatus = current_status || newStatus;
                         const tUrl = tracking_url || `https://shiprocket.co/tracking/${awb}`;

                         const mailHtml = `
                             <div style="font-family: Arial, sans-serif; padding: 20px; background: #fff; border: 1px solid #eee;">
                                <h1 style="color: #DB0000;">Tracking Update</h1>
                                <p>Hello ${order.shippingAddress.fullName || 'Valued Customer'},</p>
                                <p>Your order <b>#WR-${order._id.toString().slice(-6).toUpperCase()}</b> has a new tracking update!</p>
                                <div style="background: #fdfdfd; padding: 15px; margin: 20px 0; border-left: 4px solid #DB0000;">
                                    <strong>Current Status:</strong> ${humanStatus}<br/>
                                    <strong>AWB/Tracking Number:</strong> ${awb}<br/>
                                    ${etd ? `<strong>Estimated Delivery:</strong> ${etd}<br/>` : ''}
                                </div>
                                <p>You can track your package directly here: <a href="${tUrl}">${tUrl}</a></p>
                                <p>Best regards,<br/>The WheelRiot Team</p>
                             </div>
                         `;

                         await transporter.sendMail({
                             from: `"WheelRiot Support" <${process.env.NODEMAILER_EMAIL}>`,
                             to: targetEmail,
                             subject: `Tracking Update: Order #WR-${order._id.toString().slice(-6).toUpperCase()} is ${humanStatus}`,
                             html: mailHtml
                         });
                     }
                 } catch (emailErr) {
                     console.error("Webhook Email Dispatch Error:", emailErr);
                 }
             }
        }

        res.json({ status: 'success' });
    } catch (err) {
        console.error('Webhook Error:', err);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

module.exports = router;
