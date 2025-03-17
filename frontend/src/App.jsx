// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

import Register from './pages/Register';
import Login from './pages/Login';
import Pay from './pages/Pay';
import DisplayInfo from './pages/DisplayInfo';
import SecondPayment from './pages/SecondPayment';
import ChangeCard from './pages/ChangeCard';

const stripePromise = loadStripe(import.meta.env.VITE_APP_STRIPE_PUBLISHABLE_KEY);

function App() {
  return (
    <Router>
      <Elements stripe={stripePromise}>
        <Routes>
          <Route path="/" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/pay" element={<Pay />} />
          <Route path="/display-info" element={<DisplayInfo />} />
          <Route path="/second-payment" element={<SecondPayment />} />
          <Route path="/change-card" element={<ChangeCard />} />
        </Routes>
      </Elements>
    </Router>
  );
}

export default App;
