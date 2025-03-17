import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import axios from "axios";
import { useState } from "react";

const Pay = () => {
  const [billingData, setBillingData] = useState({
    address: '',
    city: '',
    state: '',
    postalCode: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  // Step state: 1 = billing info, 2 = card/payment, 3 = confirmation
  const [step, setStep] = useState(1);
  const [amount] = useState(100); // $100 payment

  const stripe = useStripe();
  const elements = useElements();

  const token = localStorage.getItem('token');
  const customerId = localStorage.getItem('stripeCustomerId');

  // Step 1: Submit Billing Info -> Create or Update Stripe Customer
  const handleBillingSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/create-customer`,
        { billing_info: billingData },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      localStorage.setItem('stripeCustomerId', res.data.stripeCustomerId);
      setMessage(`Stripe customer created: ${res.data.stripeCustomerId}`);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  // Step 2: Charge the customer $100 and save card info in one click
  const handlePayment = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!stripe || !elements) return;
    if (!customerId) {
      setError('No Stripe Customer ID found. Please set up your billing first.');
      return;
    }

    try {
      // 1. Create a PaymentIntent with setup_future_usage to save the card for future payments.
      const paymentIntentRes = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/create-payment-intent`,
        { customerId, amount: amount * 100, currency: 'usd' }, // Amount in cents
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { clientSecret } = paymentIntentRes.data;

      // 2. Confirm the payment with card details.
      const cardElement = elements.getElement(CardElement);
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardElement },
      });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      // 3. Extract the PaymentMethod ID and call backend to attach it as default.
      const paymentMethodId = result.paymentIntent.payment_method;
      const saveResponse = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/save-payment-method`,
        { customerId, paymentMethodId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage(`Payment successful! Card saved. Last 4 digits: ${saveResponse.data.last4}`);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  return (
    <div>
      <h1>Pay $100 and Save Card</h1>
      {step === 1 && (
        <form onSubmit={handleBillingSubmit}>
          <h2>Billing Info</h2>
          <input
            placeholder="Address"
            value={billingData.address}
            onChange={(e) => setBillingData({ ...billingData, address: e.target.value })}
            required
          />
          <input
            placeholder="City"
            value={billingData.city}
            onChange={(e) => setBillingData({ ...billingData, city: e.target.value })}
            required
          />
          <input
            placeholder="State"
            value={billingData.state}
            onChange={(e) => setBillingData({ ...billingData, state: e.target.value })}
            required
          />
          <input
            placeholder="Postal Code"
            value={billingData.postalCode}
            onChange={(e) => setBillingData({ ...billingData, postalCode: e.target.value })}
            required
          />
          <button type="submit">Save Billing Info</button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handlePayment}>
          <h2>Enter Card Details & Pay $100</h2>
          <CardElement />
          <button type="submit">Pay $100</button>
        </form>
      )}

      {step === 3 && (
        <div>
          <h2>Payment Completed</h2>
          <p>{message}</p>
        </div>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {message && step !== 3 && <p style={{ color: 'green' }}>{message}</p>}
    </div>
  );
};

export default Pay;
