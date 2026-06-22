const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  sku: { type: String, unique: true, sparse: true }, 
  price: { type: Number, required: true, min: [0, 'Price cannot be negative'] }, 
  mrp: { type: Number, min: [0, 'MRP cannot be negative'] }, 
  discountDisplayLabel: { type: String }, 
  
  stock: { type: Number, required: true, min: [0, 'Stock cannot be negative'], default: 0 },
  description: { type: String }, 
  
  
  manufacturer: { type: String }, 

  attributes: {
    scale: { type: String, default: 'N/A' }, 
    material: { type: String, default: 'Diecast' }, 
    color: { type: String, required: [true, 'Color is required'] }
  },
  
  images: [{ type: String }], 
  
  stats: {
    viewsLastHour: { type: Number, default: 0 },
    inCarts: { type: Number, default: 0 } 
  },
  
  status: { 
    type: String, 
    enum: ['Active', 'Hidden', 'Draft'], 
    default: 'Active' 
  },
  
  features: [{ type: String }],
  discount: { type: Number, default: 0, min: 0, max: 100 }, 
  discountedPrice: { type: Number, min: 0 }, 
  discountPercent: { type: Number, min: 0, max: 100 }, 
  isDiscounted: { type: Boolean, default: false },
  
  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0, min: 0 }
  },
  
  isFeatured: { type: Boolean, default: false },
  soldCount: { type: Number, default: 0 }
}, { timestamps: true });


productSchema.index({ name: 'text', manufacturer: 'text', description: 'text' });
productSchema.index({ status: 1, price: 1 });
productSchema.index({ manufacturer: 1 });
productSchema.index({ slug: 1 });


productSchema.pre('save', function(next) {
  if (this.name) this.name = this.name.replace(/<\/?script>/gi, '').replace(/[<>]/g, '');
  if (this.description) this.description = this.description.replace(/<\/?script>/gi, '');
  if (this.attributes && this.attributes.material) this.attributes.material = this.attributes.material.replace(/<\/?script>/gi, '');
  next();
});

module.exports = mongoose.model('Product', productSchema);
