// src/App.js
import React from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import PaymentForm from './components/PaymentForm';

// Load Stripe with your publishable key from environment variables
const stripePromise = loadStripe(import.meta.env.VITE_APP_STRIPE_PUBLISHABLE_KEY);

function App() {
  // In a real app, you would get the customerId from your auth/session logic.
  const customerId = 'cus_example123'; 
  console.log('Stripe key:', import.meta.env.VITE_APP_STRIPE_PUBLISHABLE_KEY);


  return (
    <div className="App">
      <h1>Stripe Payment Setup</h1>
      <Elements stripe={stripePromise}>
        <PaymentForm customerId={customerId} />
      </Elements>
    </div>
  );
}

export default App;
