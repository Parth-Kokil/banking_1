// frontend/src/components/Navbar.jsx
import { useNavigate } from 'react-router-dom';

export default function Navbar({ role }) {
  const navigate = useNavigate();

    const handleHome = () => {
    if (role === 'banker') {
      navigate('/banker/accounts');
    } else {
      navigate('/transactions');
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    if (role === 'banker') {
      navigate('/banker-login');
    } else {
      navigate('/customer-login');
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 20px',
      borderBottom: '1px solid #ccc',
      marginBottom: 20
    }}>
      <div onClick={handleHome} style={{ cursor: 'pointer' }}>
        <strong style={{ fontSize: 18 }}>🏦 BankApp</strong>
      </div>
      <button
        onClick={handleLogout}
        style={{
          padding: '6px 12px',
          backgroundColor: '#e74c3c',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer'
        }}
      >
        Logout
      </button>
    </div>
  );
}
