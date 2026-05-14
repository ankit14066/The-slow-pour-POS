const mongoose = require('mongoose');

const workingHourSchema = new mongoose.Schema(
  {
    day: { type: String, required: true },
    open: { type: String, default: '09:00' },
    close: { type: String, default: '22:00' },
    isClosed: { type: Boolean, default: false },
  },
  { _id: false }
);

const shopConfigSchema = new mongoose.Schema(
  {
    shopName: { type: String, default: 'The Slow Pour' },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    gstNumber: { type: String, default: '' },
    logoUrl: { type: String, default: '' },

    gstPercent: { type: Number, default: 5 },
    taxMode: { type: String, enum: ['inclusive', 'exclusive'], default: 'exclusive' },

    receiptHeader: { type: String, default: 'Thank you for visiting The Slow Pour' },
    receiptFooter: { type: String, default: 'Visit again!' },
    showFields: {
      orderType: { type: Boolean, default: true },
      token: { type: Boolean, default: true },
      cashier: { type: Boolean, default: true },
      gst: { type: Boolean, default: true },
    },

    workingHours: {
      type: [workingHourSchema],
      default: () => [
        { day: 'Monday' },
        { day: 'Tuesday' },
        { day: 'Wednesday' },
        { day: 'Thursday' },
        { day: 'Friday' },
        { day: 'Saturday' },
        { day: 'Sunday' },
      ],
    },

    printer: {
      paperSize: { type: String, enum: ['58mm', '80mm'], default: '80mm' },
      autoPrint: { type: Boolean, default: false },
    },

    deliveryChargeMode: { type: String, enum: ['flat', 'zone'], default: 'flat' },
    flatDeliveryFee: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ShopConfig', shopConfigSchema);
