const axios = require('axios');
const Setting = require('../models/Setting');

const sendDiscordWebhook = async (order = null, testMessage = null) => {
    try {
        const webhookUrlObj = await Setting.findOne({ key: 'discordWebhookUrl' });
        const webhookContentObj = await Setting.findOne({ key: 'discordWebhookContent' });

        if (!webhookUrlObj || !webhookUrlObj.value) return false;

        let contentText = webhookContentObj ? webhookContentObj.value.replace(/&lt;/g, '<').replace(/&gt;/g, '>') : "A new order has been received!";
        
        if (contentText.length > 1500) {
            contentText = contentText.substring(0, 1500) + '...';
        }

        if (testMessage) {
            contentText = "**This is a Test Message.**\n" + contentText;
        } else if (order) {
            const qty = order.items ? order.items.reduce((acc, i) => acc + i.quantity, 0) : 0;
            const email = order.shippingAddress?.email || (order.user && order.user.email) || 'N/A';
            const details = `**Order-ID:** ${order._id.toString().slice(-6).toUpperCase()}\n**Name:** ${order.shippingAddress?.fullName || 'N/A'}\n**Email:** ${email}\n**Total Price:** ₹${order.totalAmount}\n**Total Qty:** ${qty}\n\n`;
            
            contentText = details + contentText;
        }

        await axios.post(webhookUrlObj.value, {
            content: contentText
        });

        return true;
    } catch (err) {
        console.error("Discord Webhook dispatch failed:", err.message);
        return false;
    }
};

module.exports = { sendDiscordWebhook };
