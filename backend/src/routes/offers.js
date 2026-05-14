const express = require('express');
const Joi = require('joi');
const Coupon = require('../models/Coupon');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/coupons', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) {
    next(err);
  }
});

router.post('/coupons', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const schema = Joi.object({
      code: Joi.string().uppercase().required(),
      type: Joi.string().valid('flat', 'percent', 'free-item', 'buy-x-get-y').required(),
      value: Joi.number().min(0).required(),
      maxUses: Joi.number().min(0).default(0),
      perCustomerLimit: Joi.number().min(0).default(0),
      minOrderAmount: Joi.number().min(0).default(0),
      validFrom: Joi.date().allow(null),
      expiresAt: Joi.date().allow(null),
      isActive: Joi.boolean().default(true),
      isHappyHour: Joi.boolean().default(false),
      happyHourStart: Joi.string().allow(''),
      happyHourEnd: Joi.string().allow(''),
      comboItems: Joi.array().items(Joi.string()).default([]),
      comboPrice: Joi.number().min(0).default(0),
      freeItem: Joi.object({ item: Joi.string().allow(null, ''), quantity: Joi.number().min(1).default(1) }).default({}),
      buyXGetY: Joi.object({
        buyItem: Joi.string().allow(null, ''),
        buyQty: Joi.number().min(0).default(0),
        getItem: Joi.string().allow(null, ''),
        getQty: Joi.number().min(0).default(0),
      }).default({}),
    });

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const coupon = await Coupon.create(value);
    res.status(201).json(coupon);
  } catch (err) {
    next(err);
  }
});

router.put('/coupons/:id', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    res.json(coupon);
  } catch (err) {
    next(err);
  }
});

router.delete('/coupons/:id', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

router.patch('/coupons/:id/deactivate', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    res.json(coupon);
  } catch (err) {
    next(err);
  }
});

router.get('/analytics/coupons', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const data = await Coupon.find().sort({ usedCount: -1 }).select('code type usedCount totalDiscountGiven isActive');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
