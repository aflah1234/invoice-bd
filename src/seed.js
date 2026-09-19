/**
 * Run once to create the default admin user.
 * Usage: node src/seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const existing = await User.findOne({ email: 'admin@platform.com' });
  if (existing) {
    console.log('Admin already exists:', existing.email);
    process.exit(0);
  }

  const admin = await User.create({
    name: 'Super Admin',
    email: 'admin@platform.com',
    password: 'Admin@1234',
    phone: '0000000000',
    whatsapp: '0000000000',
    role: 'admin',
  });

  console.log('✅ Admin created:', admin.email, '/ password: Admin@1234');
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
