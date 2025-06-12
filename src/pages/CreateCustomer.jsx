// frontend/src/pages/CreateCustomer.jsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Navbar from '../components/Navbar';

export default function CreateCustomer() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!username || !email || !password) {
      setError('Username, email, and password are required.');
      return;
    }

    try {
      const reqBody = {
        username,
        email,
        password,
      };
      // Only include initialBalance if user entered a positive number
      const bal = parseFloat(initialBalance);
      if (!isNaN(bal) && bal > 0) {
        reqBody.initialBalance = bal;
      }

      const res = await api.post('/account/create-customer', reqBody);
      setSuccessMsg('Customer created successfully.');
      setTimeout(() => {
        navigate('/banker/accounts');
      }, 1000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Error creating customer.';
      setError(msg);
    }
  };

  return (
    <div>
      <Navbar role="banker" />

    <div style={{ display: "grid", justifyContent: "center"  , width: 400, margin: 'auto', padding: 20, border: "2px solid gray", boxShadow: "5px 5px 10px gray" }}>
        <h2>Create New Customer</h2>

        {error && <p style={{ color: 'red' }}>{error}</p>}
        {successMsg && <p style={{ color: 'green' }}>{successMsg}</p>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 10 }}>
            <label>Username:</label><br />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{ width: '100%', padding: 6 }}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label>Email:</label><br />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: 6 }}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label>Password:</label><br />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: 6 }}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label>Initial Balance (optional):</label><br />
            <input
              type="number"
              step="0.01"
              min="0"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              placeholder="Defaults to 0.00"
              style={{ width: '100%', padding: 6 }}
            />
          </div>

          <button type="submit" style={{ marginTop: 10, padding: '6px 12px' }}>
            Create Customer
          </button>
        </form>

        <p style={{ marginTop: 12 }}>
          <a href="/banker/accounts">Back to Accounts List</a>
        </p>
      </div>
    </div>
  );
}
