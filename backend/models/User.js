// backend/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  stripeCustomerId: { type: String, default: null },
  billingInfo: {
    address: String,
    city: String,
    state: String,
    postalCode: String,
  },
  last4: { type: String, default: null }, // For convenience if you want to store last 4 digits
});

module.exports = mongoose.model('User', userSchema);
