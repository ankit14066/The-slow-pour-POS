const express = require('express');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Feedback = require('../models/Feedback');
const RawMaterial = require('../models/RawMaterial');
const { protect } = require('../middleware/auth');

const router = express.Router();

const todayStr = () => new Date().toISOString().slice(0, 10);

// GET /api/dashboard
router.get('/', protect, async (req, res, next) => {
  try {
    const today = todayStr();

    const todayOrders = await Order.find({ tokenDate: today, status: { $ne: 'cancelled' } }).populate(
      'items.item',
      'name'
    );

    const totalRevenue = todayOrders
      .filter((o) => o.paymentStatus === 'paid')
      .reduce((acc, o) => acc + o.total, 0);

    const totalOrders = todayOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Best selling item
    const itemSales = {};
    for (const order of todayOrders) {
      for (const oi of order.items) {
        const key = oi.name;
        itemSales[key] = (itemSales[key] || 0) + oi.quantity;
      }
    }
    const bestSeller =
      Object.entries(itemSales).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Recent 10 orders
    const recentOrders = await Order.find({ tokenDate: today })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('createdBy', 'name');

    // Low Stock Alerts
    const lowStockAlerts = await RawMaterial.find({ $expr: { $lte: ['$currentStock', '$minStockAlert'] } }).limit(10);

    // Customer Stats (today)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const newCustomersToday = await Customer.countDocuments({ createdAt: { $gte: startOfToday } });

    // Returning customers: ordered today but created before today
    const customerIdsToday = [...new Set(todayOrders.filter(o => o.customer).map(o => o.customer.toString()))];
    const returningCustomersToday = await Customer.countDocuments({
      _id: { $in: customerIdsToday },
      createdAt: { $lt: startOfToday }
    });

    // Average rating this week
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    const recentFeedbacks = await Feedback.find({ createdAt: { $gte: startOfWeek } });
    const avgRating = recentFeedbacks.length > 0
      ? recentFeedbacks.reduce((acc, f) => acc + f.ratingOverall, 0) / recentFeedbacks.length
      : 0;

    // Top 5 customers by spend
    const topCustomers = await Customer.find().sort({ totalSpent: -1 }).limit(5);

    // Upcoming birthdays (next 7 days)
    const todayMonth = new Date().getMonth();
    const todayDate = new Date().getDate();
    // Rough match for birthdays (simplification for dashboard)
    const upcomingBirthdays = await Customer.find({
      $expr: {
        $and: [
          { $eq: [{ $month: '$birthday' }, todayMonth + 1] },
          { $gte: [{ $dayOfMonth: '$birthday' }, todayDate] },
          { $lte: [{ $dayOfMonth: '$birthday' }, todayDate + 7] }
        ]
      }
    }).limit(5);

    res.json({
      today,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalOrders,
      avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
      bestSeller,
      recentOrders,
      lowStockAlerts,
      customerStats: { new: newCustomersToday, returning: returningCustomersToday },
      avgRating: parseFloat(avgRating.toFixed(1)),
      topCustomers,
      upcomingBirthdays
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
