const express = require('express');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const { protect } = require('../middleware/auth');
const router = express.Router();

// Get all customers (with optional search query)
router.get('/', protect, async (req, res, next) => {
  try {
    const { q } = req.query;
    let filter = {};
    if (q) {
      filter = {
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { phone: { $regex: q, $options: 'i' } },
        ],
      };
    }
    const customers = await Customer.find(filter).sort({ totalSpent: -1 }).limit(50);
    res.json(customers);
  } catch (error) {
    next(error);
  }
});

// Find or Create customer by phone (used during billing)
router.post('/find-or-create', protect, async (req, res, next) => {
  try {
    const { phone, name, email } = req.body;
    let customer = await Customer.findOne({ phone });
    if (!customer) {
      if (!name) return res.status(400).json({ message: 'Name is required for new customer' });
      customer = await Customer.create({ phone, name, email });
    }
    res.json(customer);
  } catch (error) {
    next(error);
  }
});

// Get customer order history
router.get('/:id/orders', protect, async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.params.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
