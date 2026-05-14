const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    ratingOverall: { type: Number, required: true, min: 1, max: 5 },
    ratingTaste: { type: Number, required: true, min: 1, max: 5 },
    ratingSpeed: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Feedback', feedbackSchema);
