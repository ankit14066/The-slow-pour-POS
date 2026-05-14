const mongoose = require('mongoose');

const sizeSchema = new mongoose.Schema({
  size: { type: String, enum: ['S', 'M', 'L'], required: true },
  price: { type: Number, required: true },
});

const recipeIngredientSchema = new mongoose.Schema({
  material: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial', required: true },
  quantity: { type: Number, required: true }, // quantity per serving
});

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    basePrice: { type: Number, required: true },
    sizes: [sizeSchema],
    imageUrl: { type: String, default: '' },
    isAvailable: { type: Boolean, default: true },
    recipe: [recipeIngredientSchema], // added for inventory deduction
  },
  { timestamps: true }
);

module.exports = mongoose.model('Item', itemSchema);
