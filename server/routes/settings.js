const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const auth = require('../middleware/auth');

const getEnvFallback = (dbKey) => {
    const mappings = {
        'shipRocketEmail': 'SHIPROCKET_EMAIL',
        'shipRocketPassword': 'SHIPROCKET_PASSWORD',
        'razorpayKeyId': 'RAZORPAY_KEY_ID',
        'razorpaySecret': 'RAZORPAY_KEY_SECRET'
    };
    if (mappings[dbKey]) return process.env[mappings[dbKey]];
    return null;
}

router.get('/:key', async (req, res) => {
    try {
        const sensitiveKeys = ['shipRocketPassword', 'shipRocketEmail', 'razorpaySecret', 'razorpayWebhookSecret'];
        if (sensitiveKeys.includes(req.params.key)) {
            return res.status(403).json({ error: 'Access denied. Use protected route.' });
        }
        const setting = await Setting.findOne({ key: req.params.key });
        let val = setting ? setting.value : null;
        if (val === null) val = getEnvFallback(req.params.key);
        res.json(val);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/admin/:key', auth.protect, auth.admin, async (req, res) => {
    try {
        const setting = await Setting.findOne({ key: req.params.key });
        let val = setting ? setting.value : null;
        if (val === null) val = getEnvFallback(req.params.key);
        res.json(val);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Setting (Admin Only)
router.put('/:key', auth.protect, auth.admin, async (req, res) => {
    try {
        const setting = await Setting.findOneAndUpdate(
            { key: req.params.key },
            { value: req.body.value },
            { new: true, upsert: true }
        );
        res.json(setting);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Test Discord Webhook (Admin Only)
router.post('/test-discord', auth.protect, auth.admin, async (req, res) => {
    try {
        const { sendDiscordWebhook } = require('../services/discordService');
        const success = await sendDiscordWebhook(null, true);
        if (success) {
            res.json({ success: true, message: 'Test message sent' });
        } else {
            res.status(400).json({ error: 'Failed to dispatch to provided webhook URL' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
