const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  name: { type: String, required: true },
  size: { type: String, enum: ['S', 'M', 'L', 'Regular'], default: 'Regular' },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  notes: { type: String, default: '' },
});

const orderSchema = new mongoose.Schema(
  {
    tokenNumber: { type: Number, required: true },
    tokenDate: { type: String, required: true }, // YYYY-MM-DD for daily reset
    items: [orderItemSchema],
    orderType: {
      type: String,
      enum: ['Dine-in', 'Takeaway', 'Delivery'],
      default: 'Dine-in',
    },
    status: {
      type: String,
      enum: ['pending', 'preparing', 'ready', 'completed', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
    paymentMode: { type: String, enum: ['Cash', 'UPI', 'Card', ''], default: '' },
    subtotal: { type: Number, required: true },
    gst: { type: Number, default: 0 },
    discountType: { type: String, enum: ['flat', 'percent', 'none'], default: 'none' },
    discountValue: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    couponCode: { type: String, default: '' },
    loyaltyPointsUsed: { type: Number, default: 0 },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    total: { type: Number, required: true },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    delivery: {
      assignedBoy: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryBoy', default: null },
      status: {
        type: String,
        enum: ['order-placed', 'assigned', 'picked-up', 'out-for-delivery', 'delivered'],
        default: 'order-placed',
      },
      estimatedMinutes: { type: Number, default: 0 },
      deliveredAt: { type: Date, default: null },
      assignedAt: { type: Date, default: null },
      pickedUpAt: { type: Date, default: null },
      outForDeliveryAt: { type: Date, default: null },
      distanceKm: { type: Number, default: 0 },
      zone: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryZone', default: null },
      charge: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
