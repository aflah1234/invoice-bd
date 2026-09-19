const User = require('../models/User');
const Store = require('../models/Store');
const Order = require('../models/Order');
const generateToken = require('../utils/generateToken');

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Admin
const getStats = async (req, res) => {
  try {
    const [totalOwners, totalCustomers, totalStores, totalOrders] = await Promise.all([
      User.countDocuments({ role: 'owner' }),
      User.countDocuments({ role: 'customer' }),
      Store.countDocuments(),
      Order.countDocuments(),
    ]);

    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('orderNumber customerName storeName total status createdAt');

    res.json({
      success: true,
      stats: { totalOwners, totalCustomers, totalStores, totalOrders },
      recentOrders,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get all owners
// @route   GET /api/admin/owners
// @access  Admin
const getOwners = async (req, res) => {
  try {
    const owners = await User.find({ role: 'owner' })
      .populate('storeId', 'name logo isActive')
      .sort({ createdAt: -1 });
    res.json({ success: true, owners });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Create a new owner + store
// @route   POST /api/admin/owners
// @access  Admin
const createOwner = async (req, res) => {
  try {
    const {
      name, email, password, phone, whatsapp, whatsappApiKey,
      storeName, storeDescription, storeAddress, storePhone,
      storeWhatsapp, storeWhatsappApiKey, storeCategory,
    } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Create owner user first (without storeId)
    const owner = await User.create({
      name,
      email,
      password,
      phone,
      whatsapp: whatsapp || phone,
      whatsappApiKey: whatsappApiKey || '',
      role: 'owner',
    });

    // Create store and link to owner
    const store = await Store.create({
      name: storeName,
      description: storeDescription || '',
      owner: owner._id,
      address: storeAddress || '',
      phone: storePhone || phone,
      whatsapp: storeWhatsapp || whatsapp || phone,
      whatsappApiKey: storeWhatsappApiKey || '',
      category: storeCategory || 'General',
      logo: req.file ? req.file.filename : null,
    });

    // Link store back to owner
    owner.storeId = store._id;
    await owner.save();

    res.status(201).json({
      success: true,
      message: 'Owner and store created successfully',
      owner: owner.toJSON(),
      store,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update owner info
// @route   PUT /api/admin/owners/:id
// @access  Admin
const updateOwner = async (req, res) => {
  try {
    const { name, phone, whatsapp, whatsappApiKey, isActive } = req.body;
    const owner = await User.findById(req.params.id);

    if (!owner || owner.role !== 'owner') {
      return res.status(404).json({ success: false, message: 'Owner not found' });
    }

    if (name) owner.name = name;
    if (phone) owner.phone = phone;
    if (whatsapp !== undefined) owner.whatsapp = whatsapp;
    if (whatsappApiKey !== undefined) owner.whatsappApiKey = whatsappApiKey;
    if (isActive !== undefined) owner.isActive = isActive;

    await owner.save();

    // Sync store active status
    if (isActive !== undefined && owner.storeId) {
      await Store.findByIdAndUpdate(owner.storeId, { isActive });
    }

    res.json({ success: true, message: 'Owner updated', owner: owner.toJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Delete owner (deactivate, not hard delete)
// @route   DELETE /api/admin/owners/:id
// @access  Admin
const deleteOwner = async (req, res) => {
  try {
    const owner = await User.findById(req.params.id);
    if (!owner || owner.role !== 'owner') {
      return res.status(404).json({ success: false, message: 'Owner not found' });
    }

    owner.isActive = false;
    await owner.save();

    if (owner.storeId) {
      await Store.findByIdAndUpdate(owner.storeId, { isActive: false });
    }

    res.json({ success: true, message: 'Owner deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Reset owner password
// @route   PUT /api/admin/owners/:id/reset-password
// @access  Admin
const resetOwnerPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    const owner = await User.findById(req.params.id).select('+password');
    if (!owner || owner.role !== 'owner') {
      return res.status(404).json({ success: false, message: 'Owner not found' });
    }
    owner.password = password;
    await owner.save();
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get all customers
// @route   GET /api/admin/customers
// @access  Admin
const getCustomers = async (req, res) => {
  try {
    const customers = await User.find({ role: 'customer' }).sort({ createdAt: -1 });
    res.json({ success: true, customers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get all orders (admin view)
// @route   GET /api/admin/orders
// @access  Admin
const getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = status ? { status } : {};
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

module.exports = {
  getStats,
  getOwners,
  createOwner,
  updateOwner,
  deleteOwner,
  resetOwnerPassword,
  getCustomers,
  getAllOrders,
};
