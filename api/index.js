/**
 * Vercel Serverless Entry Point
 * 
 * Environment variables required in Vercel Dashboard:
 *   MONGODB_URI    — MongoDB Atlas connection string
 *   JWT_SECRET     — JWT signing secret
 *   FRONTEND_URL   — Comma-separated list of allowed origins
 */

'use strict';

const mongoose = require('mongoose');

// --- Cached connection (survives warm invocations) -----
let cached = global._mongooseConn;
if (!cached) {
  cached = global._mongooseConn = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set in Vercel dashboard');
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
      })
      .then((m) => {
        console.log('[DB] MongoDB connected');
        return m;
      })
      .catch((err) => {
        cached.promise = null; // allow retry next invocation
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

// --- Load Express app (lazy, once) --------------------
let app;
function getApp() {
  if (!app) {
    // dotenv is a no-op on Vercel but harmless
    try { require('dotenv').config(); } catch (_) {}
    app = require('../src/server');
  }
  return app;
}

// --- Allowed origins helper ---------------------------
function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  if (/^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(origin)) return true;
  const list = (process.env.FRONTEND_URL || '').split(',').map(s => s.trim()).filter(Boolean);
  return list.includes(origin);
}

// --- Serverless handler --------------------------------
module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '';

  // CORS headers on every response
  if (isAllowedOrigin(origin) && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Fix URL — Vercel v2 rewrites keep the original URL,
  // make sure it always starts with /api for Express routing
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }

  // Quick health check (no DB needed)
  if (req.url === '/api/ping') {
    return res.status(200).json({ ok: true, ts: Date.now() });
  }

  // Connect to DB
  try {
    await connectDB();
  } catch (err) {
    console.error('[DB] Connection error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Database connection failed',
      hint: 'Ensure MONGODB_URI is set in Vercel Environment Variables',
      error: err.message,
    });
  }

  // Delegate to Express
  return getApp()(req, res);
};
