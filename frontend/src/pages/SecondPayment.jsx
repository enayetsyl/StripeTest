// frontend/src/pages/SecondPayment.jsx
import React, { useState } from 'react';
import axios from 'axios';

const SecondPayment = () => {
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  const handlePayment = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
  
    const customerId = localStorage.getItem('stripeCustomerId'); // Retrieve stored customerId
  
    if (!customerId) {
      setError('No Stripe Customer ID found. Please set up your billing first.');
      return;
    }
  
    try {
      // 1. Check if the customer has a default payment method
      const customerRes = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/get-customer-info`,
        {
          params: { customerId },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
  
      if (!customerRes.data.defaultPaymentMethod) {
        setError('Customer has no default payment method. Please add a card first.');
        return;
      }
  
      // 2. Charge the customer
      const amountInCents = parseFloat(amount) * 100;
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/charge`,
        { customerId, amount: Math.round(amountInCents), currency: 'usd' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
  
      setMessage(`Payment successful! PaymentIntent ID: ${res.data.paymentIntent.id}`);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };
  
  
  

  return (
    <div>
      <h1>Second Payment Page</h1>
      <form onSubmit={handlePayment}>
        <input
          type="number"
          step="0.01"
          placeholder="Payment Amount (USD)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button type="submit">Pay Now</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {message && <p style={{ color: 'green' }}>{message}</p>}
    </div>
  );
};

export default SecondPayment;
