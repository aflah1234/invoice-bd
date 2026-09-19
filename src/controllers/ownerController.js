const Store = require('../models/Store');
const Item = require('../models/Item');
const Order = require('../models/Order');
const User = require('../models/User');
const generatePDF = require('../utils/generatePDF');
const generateExcel = require('../utils/generateExcel');
const path = require('path');
const fs = require('fs');

// ── Store ─────────────────────────────────────────────────────────────────────

// @desc    Get owner's store
// @route   GET /api/owner/store
// @access  Owner
const getMyStore = async (req, res) => {
  try {
    const store = await Store.findOne({ owner: req.user._id });
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }
    res.json({ success: true, store });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update store info
// @route   PUT /api/owner/store
// @access  Owner
const updateStore = async (req, res) => {
  try {
    const { name, description, address, phone, whatsapp, whatsappApiKey, category } = req.body;
    const store = await Store.findOne({ owner: req.user._id });
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    if (name) store.name = name;
    if (description !== undefined) store.description = description;
    if (address !== undefined) store.address = address;
    if (phone !== undefined) store.phone = phone;
    if (whatsapp !== undefined) store.whatsapp = whatsapp;
    if (whatsappApiKey !== undefined) store.whatsappApiKey = whatsappApiKey;
    if (category !== undefined) store.category = category;
    if (req.file) store.logo = req.file.filename;

    await store.save();
    res.json({ success: true, message: 'Store updated', store });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Items ─────────────────────────────────────────────────────────────────────

// @desc    Get all items for owner's store
// @route   GET /api/owner/items
// @access  Owner
const getItems = async (req, res) => {
  try {
    const store = await Store.findOne({ owner: req.user._id });
    if (!store) return res.status(404).json({ success: false, message: 'Store not found' });

    const items = await Item.find({ store: store._id }).sort({ createdAt: -1 });
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Create item
// @route   POST /api/owner/items
// @access  Owner
const createItem = async (req, res) => {
  try {
    const store = await Store.findOne({ owner: req.user._id });
    if (!store) return res.status(404).json({ success: false, message: 'Store not found' });

    const { name, description, price, unit, category, stock, sku } = req.body;

    const images = req.files ? req.files.map((f) => f.filename) : [];

    const item = await Item.create({
      name,
      description: description || '',
      price: parseFloat(price),
      unit: unit || 'pcs',
      images,
      store: store._id,
      owner: req.user._id,
      category: category || 'General',
      stock: parseInt(stock) || 0,
      sku: sku || '',
    });

    res.status(201).json({ success: true, message: 'Item created', item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update item
// @route   PUT /api/owner/items/:id
// @access  Owner
const updateItem = async (req, res) => {
  try {
    const item = await Item.findOne({ _id: req.params.id, owner: req.user._id });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    const { name, description, price, unit, category, stock, sku, isAvailable } = req.body;

    if (name) item.name = name;
    if (description !== undefined) item.description = description;
    if (price !== undefined) item.price = parseFloat(price);
    if (unit !== undefined) item.unit = unit;
    if (category !== undefined) item.category = category;
    if (stock !== undefined) item.stock = parseInt(stock);
    if (sku !== undefined) item.sku = sku;
    if (isAvailable !== undefined) item.isAvailable = isAvailable === 'true' || isAvailable === true;

    // Add new images
    if (req.files && req.files.length > 0) {
      item.images = [...item.images, ...req.files.map((f) => f.filename)];
    }

    await item.save();
    res.json({ success: true, message: 'Item updated', item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Delete item
// @route   DELETE /api/owner/items/:id
// @access  Owner
const deleteItem = async (req, res) => {
  try {
    const item = await Item.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    // Remove image files from disk
    item.images.forEach((img) => {
      const imgPath = path.join(__dirname, '../../uploads', img);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    });

    res.json({ success: true, message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Delete a specific image from an item
// @route   DELETE /api/owner/items/:id/image/:filename
// @access  Owner
const deleteItemImage = async (req, res) => {
  try {
    const item = await Item.findOne({ _id: req.params.id, owner: req.user._id });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    const filename = req.params.filename;
    item.images = item.images.filter((img) => img !== filename);
    await item.save();

    const imgPath = path.join(__dirname, '../../uploads', filename);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);

    res.json({ success: true, message: 'Image removed', item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Orders ────────────────────────────────────────────────────────────────────

// @desc    Get orders for owner's store
// @route   GET /api/owner/orders
// @access  Owner
const getOrders = async (req, res) => {
  try {
    const store = await Store.findOne({ owner: req.user._id });
    if (!store) return res.status(404).json({ success: false, message: 'Store not found' });

    const { status, page = 1, limit = 20 } = req.query;
    const query = { store: store._id };
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

// @desc    Get single order
// @route   GET /api/owner/orders/:id
// @access  Owner
const getOrder = async (req, res) => {
  try {
    const store = await Store.findOne({ owner: req.user._id });
    const order = await Order.findOne({ _id: req.params.id, store: store._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update order status + optional note
// @route   PUT /api/owner/orders/:id/status
// @access  Owner
const updateOrderStatus = async (req, res) => {
  try {
    const { status, ownerNote } = req.body;
    const store = await Store.findOne({ owner: req.user._id });
    const order = await Order.findOne({ _id: req.params.id, store: store._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (status) order.status = status;
    if (ownerNote !== undefined) order.ownerNote = ownerNote;
    await order.save();

    res.json({ success: true, message: 'Order updated', order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Owner edits tax/discount, regenerates quotation, visible on customer profile
// @route   POST /api/owner/orders/:id/invoice
// @access  Owner
const createAndSendInvoice = async (req, res) => {
  try {
    const { ownerNote, tax = 0, discount = 0 } = req.body;
    const store = await Store.findOne({ owner: req.user._id });
    const order = await Order.findOne({ _id: req.params.id, store: store._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Apply tax / discount and recalculate total
    if (ownerNote !== undefined) order.ownerNote = ownerNote;
    order.tax      = parseFloat(tax)      || 0;
    order.discount = parseFloat(discount) || 0;
    order.total    = order.subtotal + order.tax - order.discount;
    order.status   = 'confirmed';

    // Regenerate quotation PDF + Excel with updated totals
    // (customer downloads these from their profile)
    const [pdfPath, excelPath] = await Promise.all([
      generatePDF(order, 'quotation'),
      generateExcel(order, 'quotation'),
    ]);
    order.quotationPdfPath   = pdfPath;
    order.quotationExcelPath = excelPath;

    // Also generate an invoice PDF for the owner's own records
    const invoicePdfPath = await generatePDF(order, 'invoice');
    order.invoicePdfPath = invoicePdfPath;

    order.invoiceSentToCustomer = true; // marks that owner has finalised
    order.quotationSentByOwner = true;
    order.editRequested = false; // clear any prior edit request
    await order.save();

    res.json({
      success: true,
      message: 'Quotation updated and now visible on customer profile',
      order,
      quotationPdfUrl:  `/uploads/docs/${path.basename(pdfPath)}`,
      quotationExcelUrl: `/uploads/docs/${path.basename(excelPath)}`,
      invoicePdfUrl:    `/uploads/docs/${path.basename(invoicePdfPath)}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Download invoice PDF
// @route   GET /api/owner/orders/:id/invoice/download
// @access  Owner
const downloadInvoice = async (req, res) => {
  try {
    const store = await Store.findOne({ owner: req.user._id });
    const order = await Order.findOne({ _id: req.params.id, store: store._id });
    if (!order || !order.invoicePdfPath) {
      return res.status(404).json({ success: false, message: 'Invoice not found, generate it first' });
    }
    res.download(order.invoicePdfPath, `invoice-${order.orderNumber}.pdf`);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getMyStore,
  updateStore,
  getItems,
  createItem,
  updateItem,
  deleteItem,
  deleteItemImage,
  getOrders,
  getOrder,
  updateOrderStatus,
  createAndSendInvoice,
  downloadInvoice,
};
