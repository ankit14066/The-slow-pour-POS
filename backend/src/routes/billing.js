const express = require('express');
const Joi = require('joi');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();
const GST_RATE = 0.05;

// POST /api/billing/validate-coupon
router.post('/validate-coupon', protect, async (req, res, next) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) return res.status(400).json({ message: 'Coupon code required' });

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) return res.status(404).json({ message: 'Invalid or expired coupon' });
    if (coupon.expiresAt && coupon.expiresAt < new Date())
      return res.status(400).json({ message: 'Coupon has expired' });
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses)
      return res.status(400).json({ message: 'Coupon usage limit reached' });
    if (coupon.minOrderAmount > 0 && subtotal < coupon.minOrderAmount)
      return res.status(400).json({ message: `Minimum order amount ₹${coupon.minOrderAmount} required` });

    let discountAmount = 0;
    if (coupon.type === 'flat') discountAmount = Math.min(coupon.value, subtotal);
    else discountAmount = parseFloat(((subtotal * coupon.value) / 100).toFixed(2));

    res.json({
      valid: true,
      coupon: { code: coupon.code, type: coupon.type, value: coupon.value },
      discountAmount,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/calculate
router.post('/calculate', protect, async (req, res, next) => {
  try {
    const schema = Joi.object({
      items: Joi.array()
        .items(Joi.object({ price: Joi.number().required(), quantity: Joi.number().required() }))
        .required(),
      discountType: Joi.string().valid('flat', 'percent', 'none').default('none'),
      discountValue: Joi.number().min(0).default(0),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const subtotal = parseFloat(
      value.items.reduce((acc, i) => acc + i.price * i.quantity, 0).toFixed(2)
    );
    const gst = parseFloat((subtotal * GST_RATE).toFixed(2));
    let discountAmount = 0;
    if (value.discountType === 'flat') discountAmount = Math.min(value.discountValue, subtotal);
    else if (value.discountType === 'percent')
      discountAmount = parseFloat(((subtotal * value.discountValue) / 100).toFixed(2));
    const total = parseFloat((subtotal + gst - discountAmount).toFixed(2));

    res.json({ subtotal, gst, discountAmount, total });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/billing/orders/:id/pay  — mark as paid
router.patch('/orders/:id/pay', protect, async (req, res, next) => {
  try {
    const { paymentMode } = req.body;
    if (!['Cash', 'UPI', 'Card'].includes(paymentMode))
      return res.status(400).json({ message: 'Invalid payment mode' });

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { paymentStatus: 'paid', paymentMode, status: 'completed' },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const io = req.app.get('io');
    if (io) io.emit('order:statusUpdate', order);

    res.json(order);
  } catch (err) {
    next(err);
  }
});

// GET /api/billing/orders/:id/bill  — bill data for printing
router.get('/orders/:id/bill', protect, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('createdBy', 'name');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // WhatsApp receipt link
    const lines = [
      `*The Slow Pour — Bill*`,
      `Token: #${order.tokenNumber}`,
      `Date: ${new Date(order.createdAt).toLocaleString('en-IN')}`,
      `Type: ${order.orderType}`,
      ``,
      `*Items:*`,
      ...order.items.map((i) => `${i.name} (${i.size}) x${i.quantity} = ₹${(i.price * i.quantity).toFixed(2)}`),
      ``,
      `Subtotal: ₹${order.subtotal.toFixed(2)}`,
      `GST (5%): ₹${order.gst.toFixed(2)}`,
      order.discountAmount > 0 ? `Discount: -₹${order.discountAmount.toFixed(2)}` : null,
      `*Total: ₹${order.total.toFixed(2)}*`,
      `Payment: ${order.paymentMode || 'Pending'}`,
    ]
      .filter(Boolean)
      .join('\n');

    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(lines)}`;

    res.json({ order, whatsappLink, receiptText: lines });
  } catch (err) {
    next(err);
  }
});

// ── Coupon CRUD (owner/manager) ─────────────────────────────────────────────

// GET /api/billing/coupons
router.get('/coupons', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/coupons
router.post('/coupons', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const schema = Joi.object({
      code: Joi.string().min(3).uppercase().required(),
      type: Joi.string().valid('flat', 'percent').required(),
      value: Joi.number().positive().required(),
      maxUses: Joi.number().min(0).default(0),
      minOrderAmount: Joi.number().min(0).default(0),
      expiresAt: Joi.date().optional(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const coupon = await Coupon.create(value);
    res.status(201).json(coupon);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/billing/coupons/:id
router.delete('/coupons/:id', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ message: 'Coupon deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

