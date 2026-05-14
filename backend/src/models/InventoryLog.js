const mongoose = require('mongoose');

const inventoryLogSchema = new mongoose.Schema(
  {
    materialId: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial', required: true },
    type: { type: String, enum: ['stock-in', 'wastage', 'auto-deduct', 'correction'], required: true },
    quantity: { type: Number, required: true },
    remarks: { type: String, default: '' },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);
