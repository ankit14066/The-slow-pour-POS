const express = require('express');
const Notification = require('../models/Notification');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipientRoles: { $in: [req.user.role] } }).sort({ createdAt: -1 }).limit(100);
    const unreadCount = await Notification.countDocuments({ recipientRoles: { $in: [req.user.role] }, isRead: false });
    res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
});

router.post('/', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const notification = await Notification.create({
      title: req.body.title,
      message: req.body.message,
      type: req.body.type || 'system',
      recipientRoles: req.body.recipientRoles || ['owner', 'manager'],
      meta: req.body.meta || {},
    });

    const io = req.app.get('io');
    if (io) io.emit('notification:new', notification);

    res.status(201).json(notification);
  } catch (err) {
    next(err);
  }
});

router.put('/:id/read', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json(notification);
  } catch (err) {
    next(err);
  }
});

router.put('/read-all', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipientRoles: { $in: [req.user.role] }, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({ message: 'All marked as read' });
  } catch (err) {
    next(err);
  }
});

router.delete('/clear-all', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    await Notification.deleteMany({ recipientRoles: { $in: [req.user.role] } });
    res.json({ message: 'Cleared' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
