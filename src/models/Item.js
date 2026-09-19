const mongoose = require('mongoose');
const { normalizeCloudinaryUrl } = require('../utils/cloudinary');

const itemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    unit: {
      type: String,
      trim: true,
      default: 'pcs', // pcs, kg, liter, box, etc.
    },
    // Image path(s)
    images: {
      type: [String],
      default: [],
    },
    // Which store this item belongs to
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
    },
    // Owner who created this item
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    sku: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

// Virtual for primary image URL
itemSchema.virtual('imageUrl').get(function () {
  if (this.images && this.images.length > 0) {
    return normalizeCloudinaryUrl(this.images[0]);
  }
  return null;
});

itemSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Item', itemSchema);
