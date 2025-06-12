import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

export default function BankerRegister() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      const res = await api.post('/auth/banker/register', {
        username,
        email,
        password
      });
      // On successful registration, backend returns { token }
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', 'banker');
      setSuccessMsg('Registration successful! Redirecting...');
      setTimeout(() => {
        navigate('/transactions');
      }, 1000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed.';
      setError(msg);
    }
  };

  return (
    <div style={{ display: "grid", justifyContent: "center"  , width: 400, margin: 'auto', padding: 20, border: "2px solid gray", boxShadow: "5px 5px 10px gray" }}>
      <h2>Banker Registration</h2>

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
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>Email:</label><br />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>Password:</label><br />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>Confirm Password:</label><br />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" style={{ marginTop: 10 }}>
          Register
        </button>
      </form>

      <p style={{ marginTop: 10 }}>
        Already have an account?
        <Link to="/banker-login">
          Login
        </Link>
      </p>
    </div>
  );
}
