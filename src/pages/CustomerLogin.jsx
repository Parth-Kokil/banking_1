import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

export default function CustomerLogin(props) {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/customer/login', {
        usernameOrEmail,
        password
      });
      localStorage.setItem('token', res.data.token);
      props?.setToken(res?.data?.token)
      props?.setRole('customer')
      localStorage.setItem('role', 'customer');
      navigate('/transactions');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.');
    }
  };

  return (
    <div style={{ display: "grid", justifyContent: "center"  , width: 400, margin: 'auto', padding: 20, border: "2px solid gray", boxShadow: "5px 5px 10px gray" }}>
      <h2>Customer Login</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>Username or Email:</label><br />
          <input
            type="text"
            value={usernameOrEmail}
            onChange={(e) => setUsernameOrEmail(e.target.value)}
            required
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <label>Password:</label><br />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" style={{ marginTop: 20 }}>Log In</button>
      </form>
      <p style={{ marginTop: 10 }}>
        Don’t have an account?
        <Link to="/customer-register">
          Register here
        </Link>
      </p>
      <p style={{ marginTop: 10 }}>
        Are you a banker? <a href="/banker-login">Login as Banker</a>
      </p>
    </div>
  );
}
