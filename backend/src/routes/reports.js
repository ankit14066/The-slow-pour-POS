const express = require('express');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const User = require('../models/User');
const DeliveryBoy = require('../models/DeliveryBoy');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

const getRange = (q) => {
  const from = q.startDate ? new Date(q.startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const to = q.endDate ? new Date(q.endDate) : new Date();
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  return { from, to };
};

const applyOrderFilters = (q, base = {}) => {
  const f = { ...base };
  if (q.orderType) f.orderType = q.orderType;
  if (q.paymentMode) f.paymentMode = q.paymentMode;
  return f;
};

router.get('/sales', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const { from, to } = getRange(req.query);
    const filter = applyOrderFilters(req.query, {
      createdAt: { $gte: from, $lte: to },
      status: { $ne: 'cancelled' },
    });

    const orders = await Order.find(filter);
    const totalRevenue = orders.reduce((a, o) => a + o.total, 0);
    const totalDiscount = orders.reduce((a, o) => a + o.discountAmount, 0);
    const totalGst = orders.reduce((a, o) => a + o.gst, 0);

    res.json({
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalOrders: orders.length,
      totalDiscount: parseFloat(totalDiscount.toFixed(2)),
      totalGst: parseFloat(totalGst.toFixed(2)),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/items', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const { from, to } = getRange(req.query);
    const orders = await Order.find({ createdAt: { $gte: from, $lte: to }, status: { $ne: 'cancelled' } });
    const map = {};

    orders.forEach((o) => {
      o.items.forEach((i) => {
        if (!map[i.name]) map[i.name] = { item: i.name, quantity: 0, revenue: 0 };
        map[i.name].quantity += i.quantity;
        map[i.name].revenue += i.price * i.quantity;
      });
    });

    res.json(Object.values(map).sort((a, b) => b.quantity - a.quantity));
  } catch (err) {
    next(err);
  }
});

router.get('/staff-performance', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const { from, to } = getRange(req.query);
    const orders = await Order.find({ createdAt: { $gte: from, $lte: to }, status: { $ne: 'cancelled' } }).populate('createdBy', 'name email');
    const map = {};

    orders.forEach((o) => {
      const id = o.createdBy?._id?.toString() || 'unknown';
      if (!map[id]) map[id] = { staff: o.createdBy?.name || 'Unknown', ordersHandled: 0, revenue: 0 };
      map[id].ordersHandled += 1;
      map[id].revenue += o.total;
    });

    res.json(Object.values(map).sort((a, b) => b.revenue - a.revenue));
  } catch (err) {
    next(err);
  }
});

router.get('/coupon-effectiveness', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const coupons = await Coupon.find().select('code type usedCount totalDiscountGiven isActive');
    res.json(coupons);
  } catch (err) {
    next(err);
  }
});

router.get('/delivery', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const { from, to } = getRange(req.query);
    const orders = await Order.find({
      orderType: 'Delivery',
      'delivery.deliveredAt': { $gte: from, $lte: to },
      'delivery.assignedBoy': { $ne: null },
    }).populate('delivery.assignedBoy', 'name');

    let onTime = 0;
    let totalMin = 0;
    const rank = {};

    orders.forEach((o) => {
      const planned = o.delivery.estimatedMinutes || 0;
      const start = o.delivery.outForDeliveryAt || o.delivery.assignedAt || o.createdAt;
      const end = o.delivery.deliveredAt || o.updatedAt;
      const actualMin = Math.max(0, Math.round((new Date(end) - new Date(start)) / (1000 * 60)));
      totalMin += actualMin;
      if (planned > 0 && actualMin <= planned) onTime += 1;

      const boy = o.delivery.assignedBoy?.name || 'Unknown';
      if (!rank[boy]) rank[boy] = { deliveryBoy: boy, deliveries: 0, avgMinutes: 0, _min: 0 };
      rank[boy].deliveries += 1;
      rank[boy]._min += actualMin;
    });

    const ranking = Object.values(rank)
      .map((r) => ({ ...r, avgMinutes: parseFloat((r._min / Math.max(1, r.deliveries)).toFixed(2)) }))
      .sort((a, b) => b.deliveries - a.deliveries)
      .map(({ _min, ...rest }) => rest);

    res.json({
      totalDeliveries: orders.length,
      onTimePercent: orders.length ? parseFloat(((onTime / orders.length) * 100).toFixed(2)) : 0,
      avgDeliveryTime: orders.length ? parseFloat((totalMin / orders.length).toFixed(2)) : 0,
      ranking,
    });
  } catch (err) {
    next(err);
  }
});

const exportCSV = (res, filename, rows) => {
  const fields = rows.length ? Object.keys(rows[0]) : ['message'];
  const parser = new Parser({ fields });
  const csv = parser.parse(rows.length ? rows : [{ message: 'No data' }]);
  res.header('Content-Type', 'text/csv');
  res.attachment(filename);
  res.send(csv);
};

const exportPDF = (res, title, rows) => {
  const doc = new PDFDocument({ margin: 30, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${title.toLowerCase().replace(/\s+/g, '_')}.pdf"`);
  doc.pipe(res);

  doc.fontSize(16).text(title, { underline: true });
  doc.moveDown();

  if (!rows.length) {
    doc.fontSize(12).text('No data');
    doc.end();
    return;
  }

  const keys = Object.keys(rows[0]);
  doc.fontSize(10).text(keys.join(' | '));
  doc.moveDown(0.5);
  rows.forEach((r) => doc.text(keys.map((k) => String(r[k] ?? '')).join(' | ')));
  doc.end();
};

router.get('/export/csv', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const type = req.query.type || 'sales';
    const { from, to } = getRange(req.query);
    const orders = await Order.find({ createdAt: { $gte: from, $lte: to }, status: { $ne: 'cancelled' } }).populate('createdBy', 'name');

    let rows = [];
    if (type === 'sales') {
      rows = orders.map((o) => ({ token: o.tokenNumber, date: o.createdAt.toISOString(), orderType: o.orderType, paymentMode: o.paymentMode, total: o.total }));
    } else if (type === 'staff') {
      rows = orders.map((o) => ({ token: o.tokenNumber, staff: o.createdBy?.name || 'Unknown', revenue: o.total }));
    } else if (type === 'delivery') {
      rows = orders.filter((o) => o.orderType === 'Delivery').map((o) => ({ token: o.tokenNumber, status: o.delivery.status, etaMin: o.delivery.estimatedMinutes, charge: o.delivery.charge }));
    }

    exportCSV(res, `${type}_report.csv`, rows);
  } catch (err) {
    next(err);
  }
});

router.get('/export/pdf', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const type = req.query.type || 'sales';
    const { from, to } = getRange(req.query);
    const orders = await Order.find({ createdAt: { $gte: from, $lte: to }, status: { $ne: 'cancelled' } }).populate('createdBy', 'name');

    let rows = [];
    if (type === 'sales') {
      rows = orders.map((o) => ({ token: o.tokenNumber, date: o.createdAt.toISOString().slice(0, 19), type: o.orderType, payment: o.paymentMode, total: o.total }));
    } else if (type === 'staff') {
      rows = orders.map((o) => ({ token: o.tokenNumber, staff: o.createdBy?.name || 'Unknown', total: o.total }));
    } else if (type === 'delivery') {
      rows = orders.filter((o) => o.orderType === 'Delivery').map((o) => ({ token: o.tokenNumber, deliveryStatus: o.delivery.status, etaMin: o.delivery.estimatedMinutes, charge: o.delivery.charge }));
    }

    exportPDF(res, `${type.toUpperCase()} REPORT`, rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
