const mongoose = require('mongoose');

const pageConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, 
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  description: { type: String },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('PageConfig', pageConfigSchema);
