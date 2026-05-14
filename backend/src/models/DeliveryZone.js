const mongoose = require('mongoose');

const deliveryZoneSchema = new mongoose.Schema(
  {
    zoneName: { type: String, required: true, trim: true, unique: true },
    minDistance: { type: Number, required: true, min: 0 },
    maxDistance: { type: Number, required: true, min: 0 },
    charge: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DeliveryZone', deliveryZoneSchema);
