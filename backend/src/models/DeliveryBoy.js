const mongoose = require('mongoose');

const deliveryBoySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    isAvailable: { type: Boolean, default: true },
    activeOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    totalDeliveries: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DeliveryBoy', deliveryBoySchema);
