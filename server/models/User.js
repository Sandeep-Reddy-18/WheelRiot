const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  label: { type: String, required: true },
  fullName: { type: String, required: true },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zip: { type: String, required: true },
  country: { type: String, default: 'India' },
  phone: { type: String, required: true },
  isDefault: { type: Boolean, default: false }
});

const userSchema = new mongoose.Schema({
  fullName: { type: String }, 
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String }, 
  
  googleId: { type: String, sparse: true }, 
  
  isVerified: { type: Boolean, default: false }, 
  resetOtp: { type: String }, 
  resetOtpExpiry: { type: Date },
  
  role: { 
    type: String, 
    enum: ['user', 'admin', 'co-owner'], 
    default: 'user' 
  },
  addresses: [addressSchema],

  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }], 
  cart: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, default: 1 }
  }],
  orderHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
