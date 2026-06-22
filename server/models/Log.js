const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  type: { 
    type: String, 
    required: true, 
    enum: ['SECURITY', 'ADMIN_ACTION', 'ECOMMERCE', 'SYSTEM'] 
  },
  action: { type: String, required: true }, 
  
  actor: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: { type: String }, 
    ipAddress: { type: String },
    device: { type: String }
  },
  
  details: { type: mongoose.Schema.Types.Mixed }, 
  
  timestamp: { type: Date, default: Date.now, expires: '90d' } 
});

module.exports = mongoose.model('Log', logSchema);
