const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ShopConfig = require('../models/ShopConfig');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

const uploadDir = path.join(process.cwd(), 'backend', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`),
});

const upload = multer({ storage });

const getSingleton = async () => {
  let config = await ShopConfig.findOne();
  if (!config) config = await ShopConfig.create({});
  return config;
};

router.get('/', protect, async (req, res, next) => {
  try {
    const config = await getSingleton();
    res.json(config);
  } catch (err) {
    next(err);
  }
});

router.put('/', protect, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const current = await getSingleton();
    Object.assign(current, req.body);
    await current.save();
    res.json(current);
  } catch (err) {
    next(err);
  }
});

router.post('/logo', protect, requireRole('owner', 'manager'), upload.single('logo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Logo file is required' });
    const config = await getSingleton();
    config.logoUrl = `/uploads/${req.file.filename}`;
    await config.save();
    res.json(config);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
