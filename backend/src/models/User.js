const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const shiftSchema = new mongoose.Schema({
  start: { type: Date, required: true },
  end: { type: Date },
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    pin: { type: String, length: 4 }, // hashed 4-digit PIN
    role: { type: String, enum: ['owner', 'manager', 'staff'], default: 'staff' },
    isActive: { type: Boolean, default: true },
    shifts: [shiftSchema],
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (this.isModified('passwordHash')) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  }
  if (this.isModified('pin') && this.pin) {
    this.pin = await bcrypt.hash(this.pin, 10);
  }
  next();
});

userSchema.methods.matchPassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.matchPin = function (pin) {
  return bcrypt.compare(pin, this.pin);
};

module.exports = mongoose.model('User', userSchema);
