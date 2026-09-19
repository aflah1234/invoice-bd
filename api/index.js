const mongoose = require('mongoose');
const app = require('../src/server');

let connectionPromise;

const connectToDatabase = () => {
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI);
  }
  return connectionPromise;
};

module.exports = async (req, res) => {
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + req.url;
  }

  if (req.method === 'OPTIONS') {
    return app(req, res);
  }

  try {
    await connectToDatabase();

    // Vercel strips the matched prefix from req.url — restore it
    // so Express can match /api/auth/login etc.
    return app(req, res);
  } catch (err) {
    console.error('MongoDB error:', err.message);
    return res.status(500).json({ success: false, message: 'Database connection failed' });
  }
};
