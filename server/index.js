require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5000;

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
});
process.on('exit', (code) => {
    console.log(`Process checking out with code: ${code}`);
});

const { trackTraffic, getStats } = require('./middleware/traffic');
app.use('/api/webhooks', express.raw({ type: 'application/json' }), require('./routes/webhooks'));
// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5000, 
  standardHeaders: true, 
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

app.use('/api/', limiter);

app.use(express.json({ limit: '1mb' })); 
app.use(cors());
app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "script-src": ["'self'", "'unsafe-inline'", "https://accounts.google.com/gsi/client", "https://checkout.razorpay.com"],
        "frame-src": ["'self'", "https://accounts.google.com", "https://api.razorpay.com"],
        "connect-src": [
          "'self'", 
          "https://accounts.google.com/gsi/", 
          "https://api.razorpay.com", 
          "https://lumberjack.razorpay.com",
          "https://nominatim.openstreetmap.org"
        ],
        "img-src": ["'self'", "data:", "https://*.razorpay.com", "https://placehold.co"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);
app.use(require('express-mongo-sanitize')());
app.use(require('xss-clean')());
app.use(require('hpp')());
app.use(morgan('dev'));
app.use(trackTraffic);

app.use('/uploads', express.static(require('path').join(__dirname, 'public/uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/users', require('./routes/users'));
app.use('/api/shipping', (req, res, next) => {
    console.log('[DEBUG] Middleware: /api/shipping hit', req.path);
    next();
}, require('./routes/shipping')); 
app.use('/api/brands', require('./routes/brands'));

app.get('/api/stats', async (req, res) => {
    try {
        const stats = await getStats();
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

if (process.env.NODE_ENV === 'production' || true) { 
    app.use(express.static(path.join(__dirname, '../client/dist')));

    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.resolve(__dirname, '../client', 'dist', 'index.html'));
        } else {
            res.status(404).json({ error: 'API route not found' });
        }
    });
} else {
    app.get('/', (req, res) => {
      res.send('Hooligan API Running');
    });
}

// MongoDB Connection
console.log('[DB] Connecting to MongoDB...');
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('[DB] MongoDB Connected Successfully'))
  .catch(err => {
      console.error('[DB] MongoDB Connection Error:', err.message);
      console.error('[DB] Configured URI Prefix:', process.env.MONGO_URI ? process.env.MONGO_URI.substring(0, 15) + '...' : 'UNDEFINED');
  });

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
