// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Global in-memory store for customer details
const customerStore = {};

// Create a new customer and save billing info in the global variable
app.post('/create-customer', async (req, res) => {
  // Expecting: { email, name, billing_info: { address, city, state, postalCode } }
  const { email, name, billing_info } = req.body;
  try {
    const customer = await stripe.customers.create({ email, name });
    // Save the customer details locally
    customerStore[customer.id] = { email, name, billing_info };
    res.json({ customer, storedData: customerStore[customer.id] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retrieve a PaymentMethod by ID
app.post('/retrieve-payment-method', async (req, res) => {
  const { paymentMethodId } = req.body;
  try {
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    res.json({ paymentMethod });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// (Optional) Update billing information for an existing customer
app.post('/update-billing-info', (req, res) => {
  const { customerId, billing_info } = req.body;
  if (!customerStore[customerId]) {
    return res.status(404).json({ error: 'Customer not found in store' });
  }
  customerStore[customerId].billing_info = billing_info;
  res.json({ message: 'Billing information updated', customerData: customerStore[customerId] });
});

// Create a Setup Intent for saving/updating card details
app.post('/create-setup-intent', async (req, res) => {
  const { customerId } = req.body;
  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card']
    });
    res.json({ clientSecret: setupIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// (Optional) Charge the customer using the saved payment method
app.post('/charge', async (req, res) => {
  const { customerId, amount, currency } = req.body;
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount, 
      currency,
      customer: customerId,
      off_session: true,
      confirm: true,
    });
    res.json({ paymentIntent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
