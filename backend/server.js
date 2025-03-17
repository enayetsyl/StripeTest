// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const User = require('./models/User');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Helper: verify JWT
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]; // Expect "Bearer <token>"
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ========================
//  AUTH ROUTES
// ========================

// Register
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new User({
      name,
      email,
      passwordHash,
    });
    await newUser.save();

    res.json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    // Compare password
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });

    // Create JWT
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    res.json({ token, userId: user._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
//  BILLING / STRIPE ROUTES
// ========================

// Create or update a Stripe customer, store in DB, and store billing info
app.post('/create-customer', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { billing_info } = req.body;

    // If user doesn't have a Stripe customer, create one
    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
      });
      user.stripeCustomerId = customer.id;
    }

    // Save billing info
    user.billingInfo = billing_info;
    await user.save();

    res.json({ stripeCustomerId: user.stripeCustomerId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/create-payment-intent', async (req, res) => {
  const { customerId, amount, currency } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      payment_method_types: ['card'],
      setup_future_usage: 'off_session', // Save the card for future payments
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/save-payment-method', async (req, res) => {
  const { customerId, paymentMethodId } = req.body;

  try {
    // Attach the payment method to the customer
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });

    // Set as default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // Retrieve last 4 digits of the card
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    const last4 = paymentMethod.card.last4;

    res.json({ message: 'Card saved as default', last4 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Create a Setup Intent for saving/updating card details
app.post('/create-setup-intent', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.stripeCustomerId) {
      return res.status(400).json({ error: 'User or Stripe customer not found' });
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: user.stripeCustomerId,
      payment_method_types: ['card'],
    });
    res.json({ clientSecret: setupIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retrieve a PaymentMethod by ID (used after confirming SetupIntent)
app.post('/retrieve-payment-method', authMiddleware, async (req, res) => {
  const { paymentMethodId } = req.body;

  try {
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    
    if (!paymentMethod) {
      return res.status(400).json({ error: 'Invalid payment method ID' });
    }

    // Retrieve user details
    const user = await User.findById(req.userId);
    if (!user || !user.stripeCustomerId) {
      return res.status(400).json({ error: 'User or Stripe customer not found' });
    }

    // Attach the payment method to the customer
    await stripe.paymentMethods.attach(paymentMethodId, { customer: user.stripeCustomerId });

    // Set as default payment method
    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // Save last 4 digits to user profile
    if (paymentMethod.card?.last4) {
      user.last4 = paymentMethod.card.last4;
      await user.save();
    }

    res.json({ message: 'Payment method saved and set as default', last4: user.last4 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Charge the customer using the saved payment method
// Charge the customer using the saved payment method
app.post('/charge', async (req, res) => {
  const { customerId, amount, currency = 'usd' } = req.body;

  try {
    // Step 1: Retrieve the customer to check if they have a default payment method
    const customer = await stripe.customers.retrieve(customerId);
    
    if (!customer.invoice_settings.default_payment_method) {
      return res.status(400).json({ error: "Customer has no default payment method." });
    }

    // Step 2: Use the saved default payment method
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      payment_method: customer.invoice_settings.default_payment_method,
      off_session: true, // Ensures the payment goes through without requiring authentication
      confirm: true,
    });

    res.json({ paymentIntent });
  } catch (error) {
    console.error("Charge Error:", error);
    res.status(500).json({ error: error.message });
  }
});


// Update billing info
app.post('/update-billing-info', authMiddleware, async (req, res) => {
  const { billing_info } = req.body;
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.billingInfo = billing_info;
    await user.save();
    res.json({ message: 'Billing information updated', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user details (for Display Info page)
app.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer info, including default payment method
app.get('/get-customer-info', async (req, res) => {
  const { customerId } = req.query;

  try {
    const customer = await stripe.customers.retrieve(customerId);

    res.json({
      defaultPaymentMethod: customer.invoice_settings.default_payment_method || null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
