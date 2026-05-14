const express = require('express');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../models/User');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const getActiveShift = (user) => [...(user.shifts || [])].reverse().find((s) => !s.end) || null;

const serializeUser = (user) => {
  const activeShift = getActiveShift(user);
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    activeShiftStart: activeShift ? activeShift.start : null,
  };
};

// POST /api/auth/register  (first-time owner setup or owner adding staff)
router.post('/register', async (req, res, next) => {
  try {
    const schema = Joi.object({
      name: Joi.string().min(2).required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required(),
      pin: Joi.string().length(4).pattern(/^\d+$/).optional(),
      role: Joi.string().valid('owner', 'manager', 'staff').default('staff'),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const exists = await User.findOne({ email: value.email });
    if (exists) return res.status(409).json({ message: 'Email already registered' });

    const user = new User({
      name: value.name,
      email: value.email,
      passwordHash: value.password,
      pin: value.pin || null,
      role: value.role,
    });
    await user.save();

    res.status(201).json({
      token: generateToken(user._id),
      user: serializeUser(user),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login  (email + password)
router.post('/login', async (req, res, next) => {
  try {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const user = await User.findOne({ email: value.email });
    if (!user || !(await user.matchPassword(value.password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (!user.isActive) return res.status(403).json({ message: 'Account deactivated' });

    res.json({
      token: generateToken(user._id),
      user: serializeUser(user),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/pin-login  (4-digit PIN for quick staff login)
router.post('/pin-login', async (req, res, next) => {
  try {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      pin: Joi.string().length(4).pattern(/^\d+$/).required(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const user = await User.findOne({ email: value.email });
    if (!user || !user.pin) return res.status(401).json({ message: 'PIN not set for this user' });
    if (!(await user.matchPin(value.pin))) return res.status(401).json({ message: 'Invalid PIN' });
    if (!user.isActive) return res.status(403).json({ message: 'Account deactivated' });

    res.json({
      token: generateToken(user._id),
      user: serializeUser(user),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  res.json({ user: serializeUser(req.user) });
});

// POST /api/auth/shift/start
router.post('/shift/start', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const openShift = getActiveShift(user);
    if (openShift) return res.status(400).json({ message: 'Shift already active' });

    user.shifts.push({ start: new Date() });
    await user.save();
    const activeShift = getActiveShift(user);
    res.json({ message: 'Shift started', shift: activeShift, user: serializeUser(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/shift/end
router.post('/shift/end', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const openShift = getActiveShift(user);
    if (!openShift) return res.status(400).json({ message: 'No active shift found' });
    openShift.end = new Date();
    await user.save();

    const durationMs = new Date(openShift.end).getTime() - new Date(openShift.start).getTime();
    const durationHours = parseFloat((durationMs / (1000 * 60 * 60)).toFixed(2));

    res.json({ message: 'Shift ended', shift: openShift, durationHours, user: serializeUser(user) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/users  (owner/manager only)
router.get('/users', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const users = await User.find().select('-passwordHash -pin');
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/staff  (owner/manager only)
router.get('/staff', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const staff = await User.find({ role: 'staff' })
      .select('-passwordHash -pin')
      .sort({ createdAt: -1 });
    res.json(staff);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/staff  (owner/manager only)
router.post('/staff', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const schema = Joi.object({
      name: Joi.string().min(2).required(),
      email: Joi.string().email().required(),
      pin: Joi.string().length(4).pattern(/^\d+$/).required(),
      password: Joi.string().min(6).optional(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const exists = await User.findOne({ email: value.email.toLowerCase() });
    if (exists) return res.status(409).json({ message: 'Email already registered' });

    const user = new User({
      name: value.name,
      email: value.email.toLowerCase(),
      passwordHash: value.password || `staff${value.pin}`,
      pin: value.pin,
      role: 'staff',
    });

    await user.save();
    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/auth/staff/:id  (owner/manager only)
router.delete('/staff/:id', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Staff not found' });
    if (user.role !== 'staff') return res.status(400).json({ message: 'Only staff can be deleted from this route' });
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Staff deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
