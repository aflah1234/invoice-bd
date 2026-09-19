const mongoose = require('mongoose');
const app = require('../src/server');

let connectionPromise = null;

const connectToDatabase = () => {
  if (connectionPromise) return connectionPromise;
  connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  }).catch((err) => {
    // Reset so next request retries
    connectionPromise = null;
    return Promise.reject(err);
  });
  return connectionPromise;
};

module.exports = async (req, res) => {
  // ── CORS preflight ──────────────────────────────────────
  const origin = req.headers.origin || '';
  const isAllowed =
    !origin ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
    /^https:\/\/.*\.vercel\.app$/.test(origin) ||
    (process.env.FRONTEND_URL || '').split(',').map(s => s.trim()).includes(origin);

  if (isAllowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // ── Restore full URL so Express routing works ───────────
  // Vercel rewrites /api/(.*) → this function, but passes
  // the ORIGINAL URL in req.url unchanged in v2 rewrites.
  // Ensure it always starts with /api so route matching works.
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }

  // ── Connect to MongoDB ──────────────────────────────────
  try {
    await connectToDatabase();
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Database connection failed',
      detail: process.env.NODE_ENV !== 'production' ? err.message : undefined,
    });
  }

  // ── Hand off to Express ─────────────────────────────────
  return app(req, res);
};
