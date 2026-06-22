const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  
  discountType: { type: String, enum: ['PERCENTAGE', 'FIXED'], required: true },
  value: { type: Number, required: true }, 
  
  applicableType: { type: String, enum: ['ALL', 'BRAND', 'MANUFACTURER', 'SCALE', 'MODEL'], default: 'ALL' },
  applicableValues: [String],
  
  minOrderValue: { type: Number, default: 0 },
  maxDiscountAmount: { type: Number }, 
  
  expiryDate: { type: Date },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
