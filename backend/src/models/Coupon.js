const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['flat', 'percent', 'free-item', 'buy-x-get-y'], required: true },
    value: { type: Number, required: true },
    freeItem: {
      item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
      quantity: { type: Number, default: 1 },
    },
    buyXGetY: {
      buyItem: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
      buyQty: { type: Number, default: 0 },
      getItem: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
      getQty: { type: Number, default: 0 },
    },
    maxUses: { type: Number, default: 0 }, // 0 = unlimited
    usedCount: { type: Number, default: 0 },
    perCustomerLimit: { type: Number, default: 0 },
    customerUsage: [
      {
        customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
        count: { type: Number, default: 0 },
      },
    ],
    minOrderAmount: { type: Number, default: 0 },
    validFrom: { type: Date, default: null },
    expiresAt: { type: Date },
    totalDiscountGiven: { type: Number, default: 0 },
    isHappyHour: { type: Boolean, default: false },
    happyHourStart: { type: String, default: '' }, // HH:mm
    happyHourEnd: { type: String, default: '' }, // HH:mm
    comboItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }],
    comboPrice: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Coupon', couponSchema);
