const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Store name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    logo: {
      type: String, // path to uploaded logo image
      default: null,
    },
    // Owner (User with role=owner) who manages this store
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    whatsapp: {
      type: String,
      trim: true,
      default: '',
    },
    // CallMeBot API key for owner's WhatsApp notifications
    whatsappApiKey: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Store', storeSchema);
