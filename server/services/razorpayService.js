const Razorpay = require('razorpay');
const crypto = require('crypto');
const Setting = require('../models/Setting');

class RazorpayService {
  constructor() {
    this.razorpay = null;
  }

  async getCredentials() {
      let keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_YOUR_ID';
      let keySecret = process.env.RAZORPAY_KEY_SECRET || 'YOUR_SECRET';
      try {
          const dbKeyId = await Setting.findOne({ key: 'razorpayKeyId' });
          const dbSecret = await Setting.findOne({ key: 'razorpaySecret' });
          if (dbKeyId && dbKeyId.value) keyId = dbKeyId.value;
          if (dbSecret && dbSecret.value) keySecret = dbSecret.value;
      } catch (err) {
          console.error("Error fetching Razorpay credentials from DB:", err);
      }
      return { keyId, keySecret };
  }

  async initialize() {
    const creds = await this.getCredentials();
    this.razorpay = new Razorpay({
      key_id: creds.keyId,
      key_secret: creds.keySecret
    });
  }

  async createOrder(amount, receiptId) {
    if (!this.razorpay) await this.initialize();
    
    const options = {
      amount: Math.round(amount * 100), 
      currency: 'INR',
      receipt: receiptId.toString(),
    };

    try {
      const order = await this.razorpay.orders.create(options);
      return order;
    } catch (error) {
      console.error('Razorpay Create Order Error:', error);
      throw new Error('Failed to create Razorpay Order');
    }
  }

  async verifyPayment(orderId, paymentId, signature) {
    const creds = await this.getCredentials();
    const hmac = crypto.createHmac('sha256', creds.keySecret);
    hmac.update(orderId + "|" + paymentId);
    const generatedSignature = hmac.digest('hex');

    return generatedSignature === signature;
  }

  async issueRefund(paymentId, amount = null) {
      if (!this.razorpay) await this.initialize();
      
      try {
          const options = {};
          if (amount) options.amount = Math.round(amount * 100);
          
          const refund = await this.razorpay.payments.refund(paymentId, options);
          return refund;
      } catch (err) {
          console.error('Razorpay Refund Error:', err);
          throw new Error('Failed to issue refund: ' + err.message);
      }
  }

  async getPayment(paymentId) {
      if (!this.razorpay) await this.initialize();
      try {
          return await this.razorpay.payments.fetch(paymentId);
      } catch (err) {
          console.error("Razorpay Fetch Payment Error:", err);
          return null;
      }
  }
}

module.exports = new RazorpayService();
