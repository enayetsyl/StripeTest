// src/PaymentComponent.js
import React, { useState } from 'react';
import axios from 'axios';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const BillingForm = ({ onCustomerCreated }) => {
  const [billingData, setBillingData] = useState({
    name: '',
    email: '',
    address: '',
    city: '',
    state: '',
    postalCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setBillingData({ ...billingData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Post billing info along with name and email to create a customer
      const response = await axios.post('http://localhost:3001/create-customer', {
        name: billingData.name,
        email: billingData.email,
        billing_info: {
          address: billingData.address,
          city: billingData.city,
          state: billingData.state,
          postalCode: billingData.postalCode
        }
      });
      onCustomerCreated(response.data.customer);
    } catch (err) {
      setError('Error creating customer: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Billing Information</h2>
      <input
        type="text"
        name="name"
        placeholder="Name"
        value={billingData.name}
        onChange={handleChange}
        required
      />
      <input
        type="email"
        name="email"
        placeholder="Email"
        value={billingData.email}
        onChange={handleChange}
        required
      />
      <input
        type="text"
        name="address"
        placeholder="Address"
        value={billingData.address}
        onChange={handleChange}
        required
      />
      <input
        type="text"
        name="city"
        placeholder="City"
        value={billingData.city}
        onChange={handleChange}
        required
      />
      <input
        type="text"
        name="state"
        placeholder="State"
        value={billingData.state}
        onChange={handleChange}
        required
      />
      <input
        type="text"
        name="postalCode"
        placeholder="Postal Code"
        value={billingData.postalCode}
        onChange={handleChange}
        required
      />
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit Billing Info'}
      </button>
    </form>
  );
};

const CardSetupForm = ({ customerId }) => {
  const stripe = useStripe();
  const elements = useElements();

  const [clientSecret, setClientSecret] = useState('');
  const [cardSaved, setCardSaved] = useState(false);
  const [last4, setLast4] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Create a Setup Intent as soon as a customerId is available
  React.useEffect(() => {
    const createSetupIntent = async () => {
      try {
        const response = await axios.post('http://localhost:3001/create-setup-intent', { customerId });
        setClientSecret(response.data.clientSecret);
      } catch (err) {
        setError('Error creating setup intent: ' + err.message);
      }
    };
    if (customerId) {
      createSetupIntent();
    }
  }, [customerId]);

  const handleCardSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
  
    setLoading(true);
    setError(null);
  
    const cardElement = elements.getElement(CardElement);
    const result = await stripe.confirmCardSetup(clientSecret, {
      payment_method: { card: cardElement },
    });
  
    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }
  
    // SetupIntent succeeded
    const { setupIntent } = result;
    console.log('SetupIntent', setupIntent);
  
    // If we have a PaymentMethod ID, retrieve the details from our server
    if (setupIntent.status === 'succeeded' && setupIntent.payment_method) {
      try {
        const pmId = setupIntent.payment_method;
        const pmResponse = await axios.post('http://localhost:3001/retrieve-payment-method', {
          paymentMethodId: pmId,
        });
        
        if (pmResponse.data.paymentMethod && pmResponse.data.paymentMethod.card) {
          setLast4(pmResponse.data.paymentMethod.card.last4);
          setCardSaved(true);
        }
      } catch (err) {
        setError('Error retrieving payment method: ' + err.message);
      }
    }
  
    setLoading(false);
  };
  
  

  const cardStyle = {
    style: {
      base: {
        color: "#32325d",
        fontFamily: 'Arial, sans-serif',
        fontSize: "16px",
        "::placeholder": {
          color: "#aab7c4",
        },
      },
      invalid: {
        color: "#fa755a",
      },
    },
  };

  return (
    <div>
      <h2>Card Information</h2>
      {cardSaved ? (
        <div>Card saved: **** **** **** {last4}</div>
      ) : (
        <form onSubmit={handleCardSubmit}>
          <CardElement options={cardStyle}/>
          {error && <div style={{ color: 'red' }}>{error}</div>}
          <button type="submit" disabled={!stripe || loading}>
            {loading ? 'Saving Card...' : 'Save Card'}
          </button>
        </form>
      )}
    </div>
  );
};

const PaymentComponent = () => {
  const [customer, setCustomer] = useState(null);

  return (
    <div>
      {!customer ? (
        <BillingForm onCustomerCreated={setCustomer} />
      ) : (
        <div>
          <h3>Customer Created: {customer.id}</h3>
          <CardSetupForm customerId={customer.id} />
        </div>
      )}
    </div>
  );
};

export default PaymentComponent;
