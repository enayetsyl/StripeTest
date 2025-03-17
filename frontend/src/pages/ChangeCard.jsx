// frontend/src/pages/ChangeCard.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const ChangeCard = () => {
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [cardSaved, setCardSaved] = useState(false);
  const token = localStorage.getItem('token');

  const stripe = useStripe();
  const elements = useElements();

  // 1. Request a new SetupIntent
  const createSetupIntent = async () => {
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/create-setup-intent`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setClientSecret(res.data.clientSecret);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!stripe || !elements) return;

    try {
      // Confirm the new card
      const cardElement = elements.getElement(CardElement);
      const result = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: cardElement },
      });
      if (result.error) {
        setError(result.error.message);
      } else {
        // Retrieve PaymentMethod to get last4
        const pmId = result.setupIntent.payment_method;
        await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/retrieve-payment-method`,
          { paymentMethodId: pmId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessage('New card saved successfully!');
        setCardSaved(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  return (
    <div>
      <h1>Change Card Info</h1>
      {!clientSecret && !cardSaved && (
        <button onClick={createSetupIntent}>Start Changing Card</button>
      )}

      {clientSecret && !cardSaved && (
        <form onSubmit={handleSubmit}>
          <CardElement />
          <button type="submit">Save New Card</button>
        </form>
      )}

      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default ChangeCard;
