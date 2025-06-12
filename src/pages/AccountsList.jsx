// frontend/src/pages/AccountsList.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Navbar from '../components/Navbar';

export default function AccountsList() {
  const [customers, setCustomers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/account/all-accounts');
      setCustomers(res.data.customers);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <Navbar role="banker" />

      <div style={{ maxWidth: 800, margin: 'auto', padding: 20 }}>
        <h2>All Customer Accounts (Banker View)</h2>

        {/* Button to navigate to Create New Customer */}
        <button
          onClick={() => navigate('/banker/create-customer')}
          style={{ marginBottom: 16, padding: '6px 12px' }}
        >
          + Create New Customer
        </button>

        <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f0f0f0' }}>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Balance</th>
              <th>Last Transaction</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => {
              const lastTx = c.lastTransaction;
              return (
                <tr key={c.id}>
                  <td>{c.username}</td>
                  <td>{c.email}</td>
                  <td>₹{parseFloat(c.balance).toFixed(2)}</td>
                  <td>
                    {lastTx
                      ? new Date(lastTx.createdAt).toLocaleString()
                      : '—'}
                  </td>
                </tr>
              );
            })}
            {customers.length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: 12 }}>
                  No customer accounts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
