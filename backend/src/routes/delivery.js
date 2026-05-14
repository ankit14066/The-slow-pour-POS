const express = require('express');
const Joi = require('joi');
const DeliveryBoy = require('../models/DeliveryBoy');
const DeliveryZone = require('../models/DeliveryZone');
const Order = require('../models/Order');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

const DELIVERY_FLOW = ['order-placed', 'assigned', 'picked-up', 'out-for-delivery', 'delivered'];

// Delivery boys CRUD
router.get('/boys', protect, requireRole('owner', 'manager', 'staff'), async (req, res, next) => {
  try {
    const boys = await DeliveryBoy.find().sort({ createdAt: -1 });
    res.json(boys);
  } catch (err) {
    next(err);
  }
});

router.post('/boys', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const schema = Joi.object({
      name: Joi.string().min(2).required(),
      phone: Joi.string().min(8).required(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const boy = await DeliveryBoy.create(value);
    res.status(201).json(boy);
  } catch (err) {
    next(err);
  }
});

router.put('/boys/:id', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const boy = await DeliveryBoy.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!boy) return res.status(404).json({ message: 'Delivery boy not found' });
    res.json(boy);
  } catch (err) {
    next(err);
  }
});

router.delete('/boys/:id', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    await DeliveryBoy.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

// Delivery zones CRUD
router.get('/zones', protect, requireRole('owner', 'manager', 'staff'), async (req, res, next) => {
  try {
    const zones = await DeliveryZone.find().sort({ minDistance: 1 });
    res.json(zones);
  } catch (err) {
    next(err);
  }
});

router.post('/zones', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const schema = Joi.object({
      zoneName: Joi.string().required(),
      minDistance: Joi.number().min(0).required(),
      maxDistance: Joi.number().min(0).required(),
      charge: Joi.number().min(0).required(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const zone = await DeliveryZone.create(value);
    res.status(201).json(zone);
  } catch (err) {
    next(err);
  }
});

router.put('/zones/:id', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const zone = await DeliveryZone.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!zone) return res.status(404).json({ message: 'Zone not found' });
    res.json(zone);
  } catch (err) {
    next(err);
  }
});

router.delete('/zones/:id', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    await DeliveryZone.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

// Assign delivery boy
router.put('/orders/:orderId/assign', protect, requireRole('owner', 'manager', 'staff'), async (req, res, next) => {
  try {
    const schema = Joi.object({
      deliveryBoyId: Joi.string().required(),
      estimatedMinutes: Joi.number().integer().min(0).default(0),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const boy = await DeliveryBoy.findById(value.deliveryBoyId);
    if (!boy) return res.status(404).json({ message: 'Delivery boy not found' });

    order.delivery.assignedBoy = boy._id;
    order.delivery.status = 'assigned';
    order.delivery.estimatedMinutes = value.estimatedMinutes;
    order.delivery.assignedAt = new Date();
    await order.save();

    if (!boy.activeOrders.find((id) => id.toString() === order._id.toString())) {
      boy.activeOrders.push(order._id);
    }
    boy.isAvailable = false;
    await boy.save();

    const io = req.app.get('io');
    if (io) io.emit('delivery:update', order);

    res.json(order);
  } catch (err) {
    next(err);
  }
});

// Update delivery status
router.put('/orders/:orderId/status', protect, requireRole('owner', 'manager', 'staff'), async (req, res, next) => {
  try {
    const schema = Joi.object({ status: Joi.string().valid(...DELIVERY_FLOW).required() });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.delivery.status = value.status;
    if (value.status === 'picked-up') order.delivery.pickedUpAt = new Date();
    if (value.status === 'out-for-delivery') order.delivery.outForDeliveryAt = new Date();
    if (value.status === 'delivered') {
      order.delivery.deliveredAt = new Date();
      order.status = 'completed';
      if (order.delivery.assignedBoy) {
        const boy = await DeliveryBoy.findById(order.delivery.assignedBoy);
        if (boy) {
          boy.activeOrders = boy.activeOrders.filter((o) => o.toString() !== order._id.toString());
          boy.totalDeliveries += 1;
          boy.isAvailable = boy.activeOrders.length === 0;
          await boy.save();
        }
      }
    }

    await order.save();
    const io = req.app.get('io');
    if (io) io.emit('delivery:update', order);
    if (io) io.emit('order:statusUpdate', order);

    res.json(order);
  } catch (err) {
    next(err);
  }
});

// Delivery performance report
router.get('/performance', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo) : new Date();

    const deliveredOrders = await Order.find({
      orderType: 'Delivery',
      'delivery.deliveredAt': { $gte: dateFrom, $lte: dateTo },
      'delivery.assignedBoy': { $ne: null },
    }).populate('delivery.assignedBoy', 'name phone');

    const byBoy = {};
    deliveredOrders.forEach((o) => {
      const id = o.delivery.assignedBoy?._id?.toString();
      if (!id) return;
      if (!byBoy[id]) {
        byBoy[id] = {
          deliveryBoyId: id,
          name: o.delivery.assignedBoy.name,
          phone: o.delivery.assignedBoy.phone,
          deliveries: 0,
          avgMinutes: 0,
          totalMinutes: 0,
          perDay: {},
        };
      }

      byBoy[id].deliveries += 1;
      const start = o.delivery.outForDeliveryAt || o.delivery.assignedAt || o.createdAt;
      const end = o.delivery.deliveredAt || o.updatedAt;
      const minutes = Math.max(0, Math.round((new Date(end) - new Date(start)) / (1000 * 60)));
      byBoy[id].totalMinutes += minutes;

      const day = new Date(o.delivery.deliveredAt).toISOString().slice(0, 10);
      byBoy[id].perDay[day] = (byBoy[id].perDay[day] || 0) + 1;
    });

    const result = Object.values(byBoy).map((r) => ({
      ...r,
      avgMinutes: r.deliveries > 0 ? parseFloat((r.totalMinutes / r.deliveries).toFixed(2)) : 0,
    }));

    res.json(result.sort((a, b) => b.deliveries - a.deliveries));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
