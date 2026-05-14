const express = require('express');
const Joi = require('joi');
const Category = require('../models/Category');
const Item = require('../models/Item');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

// ─── CATEGORIES ────────────────────────────────────────────────────────────────

// GET /api/menu/categories
router.get('/categories', protect, async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ order: 1, name: 1 });
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

// POST /api/menu/categories
router.post('/categories', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const schema = Joi.object({
      name: Joi.string().min(2).required(),
      slug: Joi.string().lowercase().optional(),
      order: Joi.number().optional(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    value.slug = value.slug || value.name.toLowerCase().replace(/\s+/g, '-');
    const category = await Category.create(value);
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
});

// PUT /api/menu/categories/:id
router.put('/categories/:id', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/menu/categories/:id
router.delete('/categories/:id', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const itemCount = await Item.countDocuments({ category: req.params.id });
    if (itemCount > 0)
      return res.status(400).json({ message: 'Cannot delete category with existing items' });
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
});

// ─── ITEMS ─────────────────────────────────────────────────────────────────────

// GET /api/menu/items
router.get('/items', protect, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.available === 'true') filter.isAvailable = true;
    const items = await Item.find(filter).populate('category', 'name slug').sort({ name: 1 });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

// POST /api/menu/items
router.post('/items', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const schema = Joi.object({
      name: Joi.string().min(2).required(),
      description: Joi.string().allow('').optional(),
      category: Joi.string().required(),
      basePrice: Joi.number().positive().required(),
      sizes: Joi.array()
        .items(
          Joi.object({
            size: Joi.string().valid('S', 'M', 'L').required(),
            price: Joi.number().positive().required(),
          })
        )
        .optional(),
      imageUrl: Joi.string().uri().allow('').optional(),
      isAvailable: Joi.boolean().optional(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const item = await Item.create(value);
    const populated = await item.populate('category', 'name slug');
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
});

// PUT /api/menu/items/:id
router.put('/items/:id', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const item = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate(
      'category',
      'name slug'
    );
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/menu/items/:id
router.delete('/items/:id', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/menu/items/:id/toggle  (availability)
router.patch('/items/:id/toggle', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    item.isAvailable = !item.isAvailable;
    await item.save();
    res.json({ id: item._id, isAvailable: item.isAvailable });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
