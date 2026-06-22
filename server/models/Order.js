const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true }, 
    sku: { type: String }, 
    pimg: { type: String }, 
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true }
  }],
  
  totalAmount: { type: Number, required: true },
  
  shippingAddress: {
    fullName: { type: String, required: true },
    label: { type: String },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    country: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String }
  },

  billingAddress: {
    fullName: { type: String },
    street: { type: String },
    city: { type: String },
    state: { type: String },
    zip: { type: String },
    country: { type: String },
    phone: { type: String },
    email: { type: String }
  },
  
  discountApplied: { type: Number, default: 0 },
  couponCode: { type: String },
  
  status: {
    type: String,
    enum: ['pending_payment', 'processing', 'packing', 'waiting_for_pickup', 'shipped', 'out_for_delivery', 'in_transit', 'delivered', 'cancelled', 'rto', 'return_requested', 'returned'],
    default: 'pending_payment'
  },
  
  payment: {
    provider: { type: String, enum: ['Razorpay', 'Stripe', 'COD'], default: 'Razorpay' },
    transactionId: { type: String },
    razorpayOrderId: { type: String }, 
    status: { type: String, enum: ['pending', 'authorized', 'paid', 'payment_failed', 'refunded'], default: 'pending' }
  },
  
  shipping: {
    provider: { type: String, default: 'Shiprocket' },
    method: { type: String },
    cost: { type: Number, default: 0 },
    awbCode: { type: String },
    trackingUrl: { type: String },
    etd: { type: String },
    isCustomTracking: { type: Boolean, default: false },
    status: { type: String }
  },
  
  archived: { type: Boolean, default: false }, 
  adminNotes: { type: String, default: '' }, 
  
  createdAt: { type: Date, default: Date.now }
});

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'payment.razorpayOrderId': 1 });
orderSchema.index({ 'shipping.awbCode': 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
