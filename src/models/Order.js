const mongoose = require('mongoose');

// Each line item in the order
const orderItemSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true,
    },
    name: { type: String, required: true },  // snapshot at time of order
    price: { type: Number, required: true },
    unit: { type: String, default: 'pcs' },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    subtotal: { type: Number, required: true }, // price * quantity
    image: { type: String, default: null },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    // Auto-generated order/quotation number
    orderNumber: {
      type: String,
      unique: true,
    },

    // Customer who placed the order
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    customerWhatsapp: { type: String, default: '' },
    customerEmail: { type: String, default: '' },

    // Store this order is placed at
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
    },
    storeName: { type: String, required: true },

    // Owner of the store
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Line items
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: 'Order must have at least one item',
      },
    },

    // Totals
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },

    // Order status
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'completed', 'cancelled'],
      default: 'pending',
    },

    // Notes
    customerNote: { type: String, default: '' },
    ownerNote: { type: String, default: '' },

    // Delivery info
    deliveryAddress: { type: String, default: '' },

    // Notification flags
    quotationSentToCustomer: { type: Boolean, default: false },
    invoiceSentToCustomer: { type: Boolean, default: false },
    notificationSentToOwner: { type: Boolean, default: false },

    // Paths to generated files
    quotationPdfPath: { type: String, default: null },
    quotationExcelPath: { type: String, default: null },
    invoicePdfPath: { type: String, default: null },

    // Customer quotation response
    quotationAccepted: { type: Boolean, default: false },
    editRequested: { type: Boolean, default: false },
    editRequestNote: { type: String, default: '' },
    quotationSentByOwner: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto-generate order number before saving
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    this.orderNumber = `ORD-${year}${month}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
