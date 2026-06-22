const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  
  rating: { 
    type: Number, 
    required: true,
    min: 0.5,
    max: 5,
    validate: {
      validator: function(v) {
        
        return (v * 2) % 1 === 0;
      },
      message: props => `${props.value} is not a valid rating. Must be in 0.5 increments.`
    }
  },
  
  text: { type: String, maxlength: 1000 },
  images: [{ type: String }], 
  
  isVisible: { type: Boolean, default: true }
}, { timestamps: true });

reviewSchema.index({ user: 1, product: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
