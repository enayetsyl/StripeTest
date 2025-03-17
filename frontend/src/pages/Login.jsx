// frontend/src/pages/Login.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/login`, formData);
      
      // Store JWT token and user ID
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('userId', res.data.userId);
  
      // Fetch user profile to get `stripeCustomerId`
      const profileRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/profile`, {
        headers: { Authorization: `Bearer ${res.data.token}` },
      });
  
      if (profileRes.data.user.stripeCustomerId) {
        console.log("profile", profileRes.data.user.stripeCustomerId)
        localStorage.setItem('stripeCustomerId', profileRes.data.user.stripeCustomerId);
      } else {
        console.warn("Stripe Customer ID not found for user.");
      }
  
      navigate('/pay');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };
  

  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <input name="email" type="email" placeholder="Email" onChange={handleChange} required />
        <input name="password" type="password" placeholder="Password" onChange={handleChange} required />
        <button type="submit">Login</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default Login;
