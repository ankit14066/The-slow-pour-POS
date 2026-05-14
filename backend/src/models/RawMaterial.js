const mongoose = require('mongoose');

const rawMaterialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    unit: { type: String, required: true, enum: ['ml', 'gm', 'pcs'] },
    currentStock: { type: Number, required: true, default: 0 },
    minStockAlert: { type: Number, required: true, default: 10 },
    costPerUnit: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RawMaterial', rawMaterialSchema);
