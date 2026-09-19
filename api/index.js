const mongoose = require('mongoose');
const app = require('../src/server');

let connectionPromise;

const connectToDatabase = () => {
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI);
  }
  return connectionPromise;
};

const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

module.exports = async (req, res) => {
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + req.url;
  }

  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    const isAllowed = !origin
      || allowedOrigins.includes(origin)
      || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      || /^https:\/\/.*\.vercel\.app$/.test(origin);

    if (isAllowed && origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).end();
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
