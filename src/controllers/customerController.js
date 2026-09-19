const Store = require('../models/Store');
const Item = require('../models/Item');
const Order = require('../models/Order');
const User = require('../models/User');
const generatePDF = require('../utils/generatePDF');
const generateExcel = require('../utils/generateExcel');
const { normalizeCloudinaryUrl } = require('../utils/cloudinary');
const path = require('path');

// @desc    Get all active stores
// @route   GET /api/customer/stores
// @access  Private (customer)
const getStores = async (req, res) => {
  try {
    const { category, search } = req.query;
    const query = { isActive: true };
    if (category) query.category = category;
    if (search) query.name = { $regex: search, $options: 'i' };

    const stores = await Store.find(query)
      .select('name description logo category address phone')
      .sort({ name: 1 });

    res.json({ success: true, stores });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get single store details
// @route   GET /api/customer/stores/:id
// @access  Private (customer)
const getStore = async (req, res) => {
  try {
    const store = await Store.findOne({ _id: req.params.id, isActive: true })
      .select('name description logo category address phone');
    if (!store) return res.status(404).json({ success: false, message: 'Store not found' });
    res.json({ success: true, store });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get items for a specific store
// @route   GET /api/customer/stores/:id/items
// @access  Private (customer)
const getStoreItems = async (req, res) => {
  try {
    const { category, search } = req.query;
    const query = { store: req.params.id, isAvailable: true };
    if (category) query.category = category;
    if (search) query.name = { $regex: search, $options: 'i' };

    const items = await Item.find(query)
      .select('name description price unit images category stock sku')
      .sort({ name: 1 });

    const itemsWithUrls = items.map((item) => {
      const obj = item.toJSON();
      obj.imageUrls = (obj.images || []).map((img) => normalizeCloudinaryUrl(img));
      return obj;
    });

    res.json({ success: true, items: itemsWithUrls });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Submit an order / request quotation
// @route   POST /api/customer/orders
// @access  Private (customer)
const submitOrder = async (req, res) => {
  try {
    const { storeId, items, customerNote, deliveryAddress } = req.body;

    if (!storeId || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Store and items are required' });
    }

    const store = await Store.findById(storeId).populate('owner');
    if (!store || !store.isActive) {
      return res.status(404).json({ success: false, message: 'Store not found or inactive' });
    }

    // Validate and build order items from DB
    const orderItems = [];
    let subtotal = 0;

    for (const cartItem of items) {
      const dbItem = await Item.findOne({ _id: cartItem.itemId, store: storeId, isAvailable: true });
      if (!dbItem) {
        return res.status(400).json({
          success: false,
          message: `Item ${cartItem.itemId} not found or unavailable`,
        });
      }
      const qty = parseInt(cartItem.quantity);
      if (!qty || qty < 1) {
        return res.status(400).json({ success: false, message: 'Invalid quantity' });
      }
      const itemSubtotal = dbItem.price * qty;
      subtotal += itemSubtotal;
      orderItems.push({
        item: dbItem._id,
        name: dbItem.name,
        price: dbItem.price,
        unit: dbItem.unit,
        quantity: qty,
        subtotal: itemSubtotal,
        image: dbItem.images[0] || null,
      });
    }

    const customer = await User.findById(req.user._id);

    const order = await Order.create({
      customer: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerWhatsapp: customer.whatsapp || '',
      customerEmail: customer.email || '',
      store: store._id,
      storeName: store.name,
      owner: store.owner._id,
      items: orderItems,
      subtotal,
      tax: 0,
      discount: 0,
      total: subtotal,
      customerNote: customerNote || '',
      deliveryAddress: deliveryAddress || '',
    });

    // Generate quotation PDF + Excel
    const [pdfPath, excelPath] = await Promise.all([
      generatePDF(order, 'quotation'),
      generateExcel(order, 'quotation'),
    ]);

    order.quotationPdfPath = pdfPath;
    order.quotationExcelPath = excelPath;
    order.quotationSentToCustomer = false;
    order.notificationSentToOwner = false;

    await order.save();

    res.status(201).json({
      success: true,
      message: 'Quotation generated successfully',
      order,
      quotationPdfUrl: `/uploads/docs/${path.basename(pdfPath)}`,
      quotationExcelUrl: `/uploads/docs/${path.basename(excelPath)}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get customer's own orders
// @route   GET /api/customer/orders
// @access  Private (customer)
const getMyOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = { customer: req.user._id };
    if (status) query.status = status;

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Order.countDocuments(query);

    res.json({ success: true, orders, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get single order detail
// @route   GET /api/customer/orders/:id
// @access  Private (customer)
const getOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Download quotation PDF for an order
// @route   GET /api/customer/orders/:id/quotation/pdf
// @access  Private (customer)
const downloadQuotationPDF = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.user._id });
    if (!order || !order.quotationPdfPath) {
      return res.status(404).json({ success: false, message: 'Quotation PDF not available' });
    }
    res.download(order.quotationPdfPath, `quotation-${order.orderNumber}.pdf`);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Download quotation Excel for an order
// @route   GET /api/customer/orders/:id/quotation/excel
// @access  Private (customer)
const downloadQuotationExcel = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.user._id });
    if (!order || !order.quotationExcelPath) {
      return res.status(404).json({ success: false, message: 'Quotation Excel not available' });
    }
    res.download(order.quotationExcelPath, `quotation-${order.orderNumber}.xlsx`);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Customer accepts the quotation → confirms the order
// @route   POST /api/customer/orders/:id/accept
// @access  Private (customer)
const acceptQuotation = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (!order.quotationSentByOwner && !order.invoiceSentToCustomer) {
      return res.status(400).json({ success: false, message: 'No quotation has been sent by the owner yet' });
    }

    order.quotationAccepted = true;
    order.editRequested = false;
    order.editRequestNote = '';
    order.status = 'confirmed';
    await order.save();

    res.json({ success: true, message: 'Quotation accepted! Order is now confirmed.', order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Customer requests an edit on the quotation
// @route   POST /api/customer/orders/:id/request-edit
// @access  Private (customer)
const requestQuotationEdit = async (req, res) => {
  try {
    const { note } = req.body;
    if (!note || !note.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a note describing what to change' });
    }

    const order = await Order.findOne({ _id: req.params.id, customer: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.editRequested = true;
    order.editRequestNote = note.trim();
    order.quotationAccepted = false;
    order.status = 'pending';
    await order.save();

    res.json({ success: true, message: 'Edit request sent to the store owner.', order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getStores,
  getStore,
  getStoreItems,
  submitOrder,
  getMyOrders,
  getOrder,
  downloadQuotationPDF,
  downloadQuotationExcel,
  acceptQuotation,
  requestQuotationEdit,
};
