const User = require('../models/User');
const Store = require('../models/Store');
const generateToken = require('../utils/generateToken');

// @desc    Register a new customer
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, password, phone, whatsapp, whatsappApiKey } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      whatsapp: whatsapp || phone,
      whatsappApiKey: whatsappApiKey || '',
      role: 'customer',
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        whatsapp: user.whatsapp,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Login user (any role)
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    // If owner, include storeId
    let storeData = null;
    if (user.role === 'owner' && user.storeId) {
      storeData = await Store.findById(user.storeId).select('_id name');
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        whatsapp: user.whatsapp,
        whatsappApiKey: user.whatsappApiKey,
        role: user.role,
        storeId: user.storeId,
        store: storeData,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get current logged-in user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    let storeData = null;
    if (user.role === 'owner' && user.storeId) {
      storeData = await Store.findById(user.storeId).select('_id name logo');
    }
    res.json({ success: true, user: { ...user.toJSON(), store: storeData } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update profile (phone, whatsapp, whatsappApiKey, password)
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, phone, whatsapp, whatsappApiKey, password } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (whatsapp !== undefined) user.whatsapp = whatsapp;
    if (whatsappApiKey !== undefined) user.whatsappApiKey = whatsappApiKey;
    if (password) user.password = password;

    await user.save();

    res.json({ success: true, message: 'Profile updated', user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { register, login, getMe, updateProfile };
