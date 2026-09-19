const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const ownerRoutes = require('./routes/owner');
const customerRoutes = require('./routes/customer');
const quotationRoutes = require('./routes/quotation');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/quotation', quotationRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Auto-seed admin
const seedAdmin = async () => {
  try {
    const User = require('./models/User');
    const existing = await User.findOne({ email: 'admin@platform.com' });
    if (!existing) {
      await User.create({
        name: 'Super Admin',
        email: 'admin@platform.com',
        password: 'Admin@1234',
        phone: '0000000000',
        whatsapp: '0000000000',
        role: 'admin',
      });
      console.log('✅ Admin seeded  →  admin@platform.com  /  Admin@1234');
    } else {
      console.log('ℹ️  Admin exists  →  admin@platform.com  /  Admin@1234');
    }
  } catch (e) {
    console.error('Seed error:', e.message);
  }
};

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    await seedAdmin();
    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 ──────────────────────────────────────');
      console.log(`   Server  →  http://localhost:${PORT}`);
      console.log(`   Health  →  http://localhost:${PORT}/api/health`);
      console.log('   Admin   →  admin@platform.com / Admin@1234');
      console.log('─────────────────────────────────────────');
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB error:', err.message);
    process.exit(1);
  });

module.exports = app;
