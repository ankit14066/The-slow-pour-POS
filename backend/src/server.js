require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const billingRoutes = require('./routes/billing');
const dashboardRoutes = require('./routes/dashboard');
const reportsRoutes = require('./routes/reports');
const inventoryRoutes = require('./routes/inventory');
const customerRoutes = require('./routes/customers');
const feedbackRoutes = require('./routes/feedback');
const deliveryRoutes = require('./routes/delivery');
const offersRoutes = require('./routes/offers');
const notificationRoutes = require('./routes/notifications');
const settingsRoutes = require('./routes/settings');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000', 'https://the-slow-pour-pos.vercel.app'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
});

// Make io accessible in routes via req.app.get('io')
app.set('io', io);

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ 
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://the-slow-pour-pos.vercel.app'],
  credentials: true
}));
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/uploads', express.static('backend/uploads'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ── Error handler ───────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Socket.io ───────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`🔌 Socket disconnected: ${socket.id}`));
});

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});
