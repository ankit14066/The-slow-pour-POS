require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Category = require('./models/Category');
const Item = require('./models/Item');
const Coupon = require('./models/Coupon');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Clear existing data
  await User.deleteMany({});
  await Category.deleteMany({});
  await Item.deleteMany({});
  await Coupon.deleteMany({});
  console.log('🧹 Cleared existing data');

  // Create owner user
  const owner = new User({
    name: 'Ankit Kushwah',
    email: 'owner@slowpour.com',
    passwordHash: 'slowpour123',
    pin: '1234',
    role: 'owner',
  });
  await owner.save();
  console.log('👤 Owner created — email: owner@slowpour.com | password: slowpour123 | PIN: 1234');

  // Create staff user
  const staff = new User({
    name: 'Staff User',
    email: 'staff@slowpour.com',
    passwordHash: 'staff123',
    pin: '0000',
    role: 'staff',
  });
  await staff.save();
  console.log('👤 Staff created — email: staff@slowpour.com | password: staff123 | PIN: 0000');

  // Create categories
  const coldCoffee = await Category.create({ name: 'Cold Coffee', slug: 'cold-coffee', order: 1 });
  const coldCoco = await Category.create({ name: 'Cold Coco', slug: 'cold-coco', order: 2 });
  const addons = await Category.create({ name: 'Add-ons', slug: 'add-ons', order: 3 });
  console.log('📂 Categories created');

  // Cold Coffee items (5)
  await Item.insertMany([
    {
      name: 'Classic Cold Brew',
      description: 'Smooth, slow-steeped cold brew with bold coffee notes',
      category: coldCoffee._id,
      basePrice: 180,
      sizes: [{ size: 'S', price: 150 }, { size: 'M', price: 180 }, { size: 'L', price: 220 }],
      imageUrl: '',
      isAvailable: true,
    },
    {
      name: 'Caramel Cold Coffee',
      description: 'Rich cold coffee swirled with silky caramel sauce',
      category: coldCoffee._id,
      basePrice: 200,
      sizes: [{ size: 'S', price: 170 }, { size: 'M', price: 200 }, { size: 'L', price: 240 }],
      imageUrl: '',
      isAvailable: true,
    },
    {
      name: 'Hazelnut Frappe',
      description: 'Blended iced coffee with hazelnut syrup and whipped cream',
      category: coldCoffee._id,
      basePrice: 220,
      sizes: [{ size: 'S', price: 190 }, { size: 'M', price: 220 }, { size: 'L', price: 260 }],
      imageUrl: '',
      isAvailable: true,
    },
    {
      name: 'Mocha Delight',
      description: 'Cold coffee with dark chocolate and espresso shots',
      category: coldCoffee._id,
      basePrice: 210,
      sizes: [{ size: 'S', price: 180 }, { size: 'M', price: 210 }, { size: 'L', price: 250 }],
      imageUrl: '',
      isAvailable: true,
    },
    {
      name: 'Vanilla Latte Chill',
      description: 'Cold espresso latte with Madagascar vanilla flavour',
      category: coldCoffee._id,
      basePrice: 190,
      sizes: [{ size: 'S', price: 160 }, { size: 'M', price: 190 }, { size: 'L', price: 230 }],
      imageUrl: '',
      isAvailable: true,
    },
  ]);
  console.log('☕ Cold Coffee items created');

  // Cold Coco items (5)
  await Item.insertMany([
    {
      name: 'Dark Chocolate Chill',
      description: 'Intense dark chocolate cold beverage with a smooth finish',
      category: coldCoco._id,
      basePrice: 180,
      sizes: [{ size: 'S', price: 150 }, { size: 'M', price: 180 }, { size: 'L', price: 220 }],
      imageUrl: '',
      isAvailable: true,
    },
    {
      name: 'Belgian Cocoa Frappe',
      description: 'Blended Belgian cocoa with ice and whipped cream',
      category: coldCoco._id,
      basePrice: 200,
      sizes: [{ size: 'S', price: 170 }, { size: 'M', price: 200 }, { size: 'L', price: 240 }],
      imageUrl: '',
      isAvailable: true,
    },
    {
      name: 'Mint Chocolate Shake',
      description: 'Cool mint and rich cocoa blended into a chilled shake',
      category: coldCoco._id,
      basePrice: 210,
      sizes: [{ size: 'S', price: 180 }, { size: 'M', price: 210 }, { size: 'L', price: 250 }],
      imageUrl: '',
      isAvailable: true,
    },
    {
      name: 'Nutella Coco Blast',
      description: 'Creamy Nutella blended with cold cocoa milk',
      category: coldCoco._id,
      basePrice: 230,
      sizes: [{ size: 'S', price: 200 }, { size: 'M', price: 230 }, { size: 'L', price: 270 }],
      imageUrl: '',
      isAvailable: true,
    },
    {
      name: 'White Choco Slush',
      description: 'White chocolate milk slush, sweet and velvety',
      category: coldCoco._id,
      basePrice: 190,
      sizes: [{ size: 'S', price: 160 }, { size: 'M', price: 190 }, { size: 'L', price: 230 }],
      imageUrl: '',
      isAvailable: true,
    },
  ]);
  console.log('🍫 Cold Coco items created');

  // Add-ons (3)
  await Item.insertMany([
    {
      name: 'Extra Espresso Shot',
      description: 'An extra shot of rich espresso',
      category: addons._id,
      basePrice: 40,
      sizes: [],
      imageUrl: '',
      isAvailable: true,
    },
    {
      name: 'Whipped Cream',
      description: 'Freshly piped whipped cream topping',
      category: addons._id,
      basePrice: 30,
      sizes: [],
      imageUrl: '',
      isAvailable: true,
    },
    {
      name: 'Caramel Drizzle',
      description: 'Golden caramel sauce drizzled on top',
      category: addons._id,
      basePrice: 25,
      sizes: [],
      imageUrl: '',
      isAvailable: true,
    },
  ]);
  console.log('➕ Add-ons created');

  // Sample coupons
  await Coupon.insertMany([
    { code: 'WELCOME50', type: 'flat', value: 50, maxUses: 100, minOrderAmount: 150 },
    { code: 'SAVE10', type: 'percent', value: 10, maxUses: 0, minOrderAmount: 200 },
  ]);
  console.log('🎟️  Sample coupons created — WELCOME50, SAVE10');

  console.log('\n🚀 Seed complete!');
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
