const express = require('express');
const Joi = require('joi');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Item = require('../models/Item');
const Coupon = require('../models/Coupon');
const Customer = require('../models/Customer');
const RawMaterial = require('../models/RawMaterial');
const InventoryLog = require('../models/InventoryLog');
const DeliveryZone = require('../models/DeliveryZone');
const ShopConfig = require('../models/ShopConfig');
const Notification = require('../models/Notification');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();
const GST_RATE = 0.05;
const toMinutes = (hhmm) => {
  const [h, m] = (hhmm || '').split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

// Helper: get today's date string YYYY-MM-DD
const todayStr = () => new Date().toISOString().slice(0, 10);

// Helper: get next token number for today
const getNextToken = async () => {
  const today = todayStr();
  const last = await Order.findOne({ tokenDate: today }).sort({ tokenNumber: -1 });
  return last ? last.tokenNumber + 1 : 1;
};

// Helper: compute bill totals
const computeTotals = (items, coupon, discountType, discountValue) => {
  const subtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const gst = parseFloat((subtotal * GST_RATE).toFixed(2));
  let discountAmount = 0;
  if (discountType === 'flat') discountAmount = Math.min(discountValue, subtotal);
  else if (discountType === 'percent') discountAmount = parseFloat(((subtotal * discountValue) / 100).toFixed(2));
  const total = parseFloat((subtotal + gst - discountAmount).toFixed(2));
  return { subtotal: parseFloat(subtotal.toFixed(2)), gst, discountAmount, total };
};

// GET /api/orders
router.get('/', protect, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.date) filter.tokenDate = req.query.date;
    else filter.tokenDate = todayStr(); // default: today
    const orders = await Order.find(filter)
      .populate('items.item', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id
router.get('/:id', protect, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.item', 'name imageUrl')
      .populate('createdBy', 'name');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// POST /api/orders  — create a new order
router.post('/', protect, async (req, res, next) => {
  try {
    const schema = Joi.object({
      items: Joi.array()
        .items(
          Joi.object({
            item: Joi.string().required(),
            size: Joi.string().valid('S', 'M', 'L', 'Regular').default('Regular'),
            quantity: Joi.number().integer().min(1).required(),
            notes: Joi.string().allow('').optional(),
          })
        )
        .min(1)
        .required(),
      orderType: Joi.string().valid('Dine-in', 'Takeaway', 'Delivery').default('Dine-in'),
      couponCode: Joi.string().allow('').optional(),
      discountType: Joi.string().valid('flat', 'percent', 'none').default('none'),
      discountValue: Joi.number().min(0).default(0),
      notes: Joi.string().allow('').optional(),
      paymentMode: Joi.string().valid('Cash', 'UPI', 'Card', '').default(''),
      customerId: Joi.string().allow(null, '').optional(),
      loyaltyPointsUsed: Joi.number().min(0).default(0),
      deliveryDistanceKm: Joi.number().min(0).default(0),
      deliveryZoneId: Joi.string().allow(null, '').optional(),
      estimatedDeliveryMinutes: Joi.number().min(0).default(0),
    });

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    // Resolve items from DB
    const resolvedItems = [];
    for (const orderItem of value.items) {
      const dbItem = await Item.findById(orderItem.item);
      if (!dbItem) return res.status(404).json({ message: `Item ${orderItem.item} not found` });
      if (!dbItem.isAvailable) return res.status(400).json({ message: `${dbItem.name} is currently unavailable` });

      let price = dbItem.basePrice;
      if (orderItem.size !== 'Regular' && dbItem.sizes.length > 0) {
        const sizeObj = dbItem.sizes.find((s) => s.size === orderItem.size);
        if (sizeObj) price = sizeObj.price;
      }
      resolvedItems.push({
        item: dbItem._id,
        name: dbItem.name,
        size: orderItem.size,
        price,
        quantity: orderItem.quantity,
        notes: orderItem.notes || '',
      });
    }

    const config = (await ShopConfig.findOne()) || (await ShopConfig.create({}));

    // Validate coupon if provided
    let coupon = null;
    let freeItem = null;
    if (value.couponCode) {
      coupon = await Coupon.findOne({ code: value.couponCode.toUpperCase(), isActive: true });
      if (!coupon) return res.status(400).json({ message: 'Invalid or expired coupon' });
      if (coupon.validFrom && coupon.validFrom > new Date()) return res.status(400).json({ message: 'Coupon not yet active' });
      if (coupon.expiresAt && coupon.expiresAt < new Date())
        return res.status(400).json({ message: 'Coupon has expired' });
      if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses)
        return res.status(400).json({ message: 'Coupon usage limit reached' });
      if (coupon.minOrderAmount > 0 && resolvedItems.reduce((a, i) => a + i.price * i.quantity, 0) < coupon.minOrderAmount) {
        return res.status(400).json({ message: `Minimum order value is ${coupon.minOrderAmount}` });
      }

      if (coupon.perCustomerLimit > 0 && value.customerId) {
        const u = coupon.customerUsage.find((cu) => cu.customerId?.toString() === value.customerId.toString());
        if (u && u.count >= coupon.perCustomerLimit) {
          return res.status(400).json({ message: 'Per customer coupon usage limit reached' });
        }
      }

      // Override discount with coupon values
      if (coupon.type === 'flat' || coupon.type === 'percent') {
        value.discountType = coupon.type;
        value.discountValue = coupon.value;
      } else if (coupon.type === 'free-item' && coupon.freeItem?.item) {
        const fi = await Item.findById(coupon.freeItem.item);
        if (fi) freeItem = { item: fi._id, name: fi.name, size: 'Regular', price: 0, quantity: coupon.freeItem.quantity || 1, notes: 'Free Item Coupon' };
      }
    }

    // Happy hour auto coupon
    if (!coupon) {
      const now = new Date();
      const nowM = now.getHours() * 60 + now.getMinutes();
      const hhCoupons = await Coupon.find({ isActive: true, isHappyHour: true });
      const activeHH = hhCoupons.find((c) => {
        const s = toMinutes(c.happyHourStart);
        const e = toMinutes(c.happyHourEnd);
        return s !== null && e !== null && nowM >= s && nowM <= e;
      });
      if (activeHH && (activeHH.type === 'flat' || activeHH.type === 'percent')) {
        coupon = activeHH;
        value.discountType = activeHH.type;
        value.discountValue = activeHH.value;
      }
    }

    // Combo deals (best match by max discount)
    const comboCoupons = await Coupon.find({ isActive: true, comboItems: { $exists: true, $ne: [] }, comboPrice: { $gt: 0 } });
    const cartItemIds = value.items.map((it) => it.item.toString());
    let comboDiscount = 0;
    comboCoupons.forEach((cc) => {
      const needed = cc.comboItems.map((id) => id.toString());
      const match = needed.every((id) => cartItemIds.includes(id));
      if (match) {
        const comboActual = resolvedItems.filter((ri) => needed.includes(ri.item.toString())).reduce((a, i) => a + i.price * i.quantity, 0);
        comboDiscount = Math.max(comboDiscount, Math.max(0, comboActual - cc.comboPrice));
      }
    });

    const { subtotal, gst, discountAmount, total } = computeTotals(
      resolvedItems,
      coupon,
      value.discountType,
      value.discountValue
    );

    if (freeItem) resolvedItems.push(freeItem);

    // Apply loyalty discount if used
    let finalTotal = total;
    let loyaltyDiscount = 0;
    if (value.loyaltyPointsUsed > 0 && value.customerId) {
      const customer = await Customer.findById(value.customerId);
      if (customer && customer.loyaltyPoints >= value.loyaltyPointsUsed) {
        loyaltyDiscount = value.loyaltyPointsUsed; // 10 points = ₹10 means 1 point = 1 INR discount based on user req, wait: "10 points = ₹10 discount" so 1 pt = ₹1
        finalTotal -= loyaltyDiscount;
        if (finalTotal < 0) finalTotal = 0;
      }
    }
    finalTotal = Math.max(0, finalTotal - comboDiscount);

    // Delivery charge
    let deliveryCharge = 0;
    let matchedZone = null;
    if (value.orderType === 'Delivery') {
      if (config.deliveryChargeMode === 'zone') {
        const dist = value.deliveryDistanceKm || 0;
        matchedZone = await DeliveryZone.findOne({ minDistance: { $lte: dist }, maxDistance: { $gte: dist } });
        deliveryCharge = matchedZone ? matchedZone.charge : 0;
      } else {
        deliveryCharge = config.flatDeliveryFee || 0;
      }
      finalTotal += deliveryCharge;
    }

    const tokenNumber = await getNextToken();

    const order = await Order.create({
      tokenNumber,
      tokenDate: todayStr(),
      items: resolvedItems,
      orderType: value.orderType,
      status: 'pending',
      paymentStatus: 'unpaid',
      paymentMode: value.paymentMode,
      subtotal,
      gst,
      discountType: value.discountType,
      discountValue: value.discountValue,
      discountAmount,
      couponCode: value.couponCode || '',
      loyaltyPointsUsed: value.loyaltyPointsUsed,
      customer: value.customerId || null,
      total: finalTotal,
      notes: value.notes || '',
      createdBy: req.user._id,
      delivery: {
        status: 'order-placed',
        estimatedMinutes: value.estimatedDeliveryMinutes || 0,
        distanceKm: value.deliveryDistanceKm || 0,
        zone: matchedZone?._id || value.deliveryZoneId || null,
        charge: deliveryCharge || 0,
      },
    });

    // Increment coupon usage
    if (coupon) {
      coupon.usedCount += 1;
      coupon.totalDiscountGiven += discountAmount + comboDiscount;
      if (value.customerId && coupon.perCustomerLimit > 0) {
        const idx = coupon.customerUsage.findIndex((cu) => cu.customerId?.toString() === value.customerId.toString());
        if (idx >= 0) coupon.customerUsage[idx].count += 1;
        else coupon.customerUsage.push({ customerId: value.customerId, count: 1 });
      }
      await coupon.save();
    }

    // Auto-deduct inventory
    for (const orderItem of value.items) {
      const dbItem = await Item.findById(orderItem.item);
      if (dbItem && dbItem.recipe && dbItem.recipe.length > 0) {
        for (const ing of dbItem.recipe) {
          if (!ing?.material || !mongoose.isValidObjectId(ing.material) || !Number.isFinite(ing.quantity) || ing.quantity <= 0) {
            continue;
          }
          const deduction = ing.quantity * orderItem.quantity;
          const material = await RawMaterial.findById(ing.material);
          if (material) {
            material.currentStock -= deduction;
            await material.save();
            await InventoryLog.create({
              materialId: material._id,
              type: 'auto-deduct',
              quantity: deduction,
              remarks: `Order #${tokenNumber}`
            });
            // Low stock alert
            if (material.currentStock <= material.minStockAlert) {
              const io = req.app.get('io');
              if (io) io.emit('stock:lowAlert', { message: `${material.name} is running low!`, material });
            }
          }
        }
      }
    }

    // Update Customer
    if (value.customerId) {
      const customer = await Customer.findById(value.customerId);
      if (customer) {
        customer.totalOrders += 1;
        customer.totalSpent += finalTotal;
        customer.loyaltyPoints = Math.max(0, customer.loyaltyPoints - value.loyaltyPointsUsed);
        // Earn 1 point per ₹10 spent
        const pointsEarned = Math.floor(finalTotal / 10);
        customer.loyaltyPoints += pointsEarned;
        await customer.save();
      }
    }

    // Emit socket event
    const io = req.app.get('io');
    if (io) io.emit('order:new', order);

    const notification = await Notification.create({
      title: 'New Order Placed',
      message: `Order #${order.tokenNumber} placed (${order.orderType})`,
      type: 'new-order',
      recipientRoles: ['owner', 'manager'],
      meta: { orderId: order._id },
    });
    if (io) io.emit('notification:new', notification);

    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

// PUT /api/orders/:id/status
router.put('/:id/status', protect, requireRole('owner', 'manager', 'staff'), async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const io = req.app.get('io');
    if (io) io.emit('order:statusUpdate', order);

    if (status === 'preparing') {
      setTimeout(async () => {
        try {
          const latest = await Order.findById(order._id);
          if (latest && latest.status === 'preparing') {
            const notif = await Notification.create({
              title: 'Order Delayed',
              message: `Order #${latest.tokenNumber} is preparing for more than 15 minutes`,
              type: 'order-delayed',
              recipientRoles: ['owner', 'manager'],
              meta: { orderId: latest._id },
            });
            const io2 = req.app.get('io');
            if (io2) io2.emit('notification:new', notif);
          }
        } catch (e) {
          // swallow delayed notifier errors
        }
      }, 15 * 60 * 1000);
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
});

// PUT /api/orders/:id/cancel
router.put('/:id/cancel', protect, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status === 'completed') return res.status(400).json({ message: 'Cannot cancel a completed order' });

    order.status = 'cancelled';
    await order.save();

    const io = req.app.get('io');
    if (io) io.emit('order:statusUpdate', order);

    res.json(order);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
