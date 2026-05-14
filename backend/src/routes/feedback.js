const express = require('express');
const Feedback = require('../models/Feedback');
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const router = express.Router();

// Public route to submit feedback
router.post('/:orderId', async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { ratingOverall, ratingTaste, ratingSpeed, comment } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Check if feedback already exists
    const existing = await Feedback.findOne({ orderId });
    if (existing) return res.status(400).json({ message: 'Feedback already submitted for this order' });

    const feedback = await Feedback.create({
      orderId,
      customerId: order.customer,
      ratingOverall,
      ratingTaste,
      ratingSpeed,
      comment,
    });

    const notif = await Notification.create({
      title: 'New Feedback Received',
      message: `Order #${order.tokenNumber} received a ${ratingOverall}/5 rating`,
      type: 'new-feedback',
      recipientRoles: ['owner', 'manager'],
      meta: { orderId, feedbackId: feedback._id },
    });
    const io = req.app.get('io');
    if (io) io.emit('notification:new', notif);

    res.status(201).json({ message: 'Feedback submitted successfully', feedback });
  } catch (error) {
    next(error);
  }
});

// Protected route to get feedback
const { protect, requireRole } = require('../middleware/auth');
router.get('/', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const feedbacks = await Feedback.find()
      .populate('orderId', 'tokenNumber orderType')
      .populate('customerId', 'name phone')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(feedbacks);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
