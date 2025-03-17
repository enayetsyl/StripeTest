// frontend/src/pages/DisplayInfo.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const DisplayInfo = () => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(res.data.user);
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      }
    };
    fetchProfile();
  }, [token]);

  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!user) return <p>Loading...</p>;

  return (
    <div>
      <h1>Display Card & Billing Info</h1>
      <p>Name: {user.name}</p>
      <p>Email: {user.email}</p>
      <h3>Billing Info:</h3>
      <p>Address: {user.billingInfo?.address}</p>
      <p>City: {user.billingInfo?.city}</p>
      <p>State: {user.billingInfo?.state}</p>
      <p>Postal Code: {user.billingInfo?.postalCode}</p>
      <h3>Card Info:</h3>
      <p>Last 4 Digits: {user.last4 || 'Not available'}</p>
    </div>
  );
};

export default DisplayInfo;
