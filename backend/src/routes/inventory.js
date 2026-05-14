const express = require('express');
const RawMaterial = require('../models/RawMaterial');
const InventoryLog = require('../models/InventoryLog');
const Notification = require('../models/Notification');
const { protect, requireRole } = require('../middleware/auth');
const router = express.Router();

// Get all raw materials
router.get('/', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const materials = await RawMaterial.find().sort({ name: 1 });
    res.json(materials);
  } catch (error) {
    next(error);
  }
});

// Add a new raw material
router.post('/', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const material = await RawMaterial.create(req.body);
    res.status(201).json(material);
  } catch (error) {
    next(error);
  }
});

// Update a raw material
router.put('/:id', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const material = await RawMaterial.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!material) return res.status(404).json({ message: 'Raw material not found' });
    res.json(material);
  } catch (error) {
    next(error);
  }
});

// Record stock movement (stock-in, wastage, correction)
router.post('/log', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const { materialId, type, quantity, remarks } = req.body;
    const material = await RawMaterial.findById(materialId);
    if (!material) return res.status(404).json({ message: 'Material not found' });

    let stockChange = 0;
    if (type === 'stock-in') stockChange = quantity;
    else if (type === 'wastage') stockChange = -quantity;
    else if (type === 'correction') stockChange = quantity; // could be pos/neg

    material.currentStock += stockChange;
    await material.save();

    const log = await InventoryLog.create({
      materialId,
      type,
      quantity: Math.abs(quantity),
      remarks
    });

    // Check if low stock and emit alert
    if (material.currentStock <= material.minStockAlert) {
      const notif = await Notification.create({
        title: 'Low Stock Alert',
        message: `${material.name} is running low (${material.currentStock} ${material.unit})`,
        type: 'low-stock',
        recipientRoles: ['owner', 'manager'],
        meta: { materialId: material._id },
      });
      req.app.get('io').emit('stock:lowAlert', {
        message: `${material.name} is running low!`,
        material,
      });
      req.app.get('io').emit('notification:new', notif);
    }

    res.status(201).json({ material, log });
  } catch (error) {
    next(error);
  }
});

// Low stock alert API
router.get('/alerts', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const materials = await RawMaterial.find({ $expr: { $lte: ['$currentStock', '$minStockAlert'] } });
    res.json(materials);
  } catch (error) {
    next(error);
  }
});

// Inventory log history
router.get('/logs', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const logs = await InventoryLog.find().populate('materialId', 'name unit').sort({ date: -1 }).limit(100);
    res.json(logs);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
