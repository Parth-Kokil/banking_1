import { useState, useEffect } from 'react';
import api from '../api';
import Navbar from '../components/Navbar';

export default function Transactions() {
  // 1. Account balance + transactions for the current page
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);

  // 2. Pagination state
  const [page, setPage] = useState(1);
  const [size] = useState(10); // fixed page size of 10
  const [totalCount, setTotalCount] = useState(0); // total number of matching transactions

  // 3. For deposit/withdraw/transfer popups
  const [showPopup, setShowPopup] = useState(false);
  const [mode, setMode] = useState('deposit'); // 'deposit', 'withdraw', or 'transfer'
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 4. Date filtering state
  const [startDate, setStartDate] = useState(''); // YYYY-MM-DD
  const [endDate, setEndDate] = useState('');     // YYYY-MM-DD

  // Whenever page, startDate, or endDate change, re-fetch data
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, startDate, endDate]);

  /**
   * Fetch transactions (paginated + filtered) and current balance.
   * Uses page, size, startDate, endDate query params.
   */
  const fetchData = async () => {
    try {
      const params = {
        page,
        size,
      };
      if (startDate) params.start = startDate;
      if (endDate) params.end = endDate;

      const res = await api.get('/account/transactions', { params });
      setBalance(res.data.balance);
      setTransactions(res.data.transactions);
      setTotalCount(res.data.totalCount);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  };

  /** Open the deposit / withdraw / transfer popup */
  const openPopup = (type) => {
    setMode(type);
    setAmount('');
    setRecipient('');
    setErrorMsg('');
    setShowPopup(true);
  };

  /** Perform the deposit, withdraw, or transfer action */
  const handleAction = async () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setErrorMsg('Enter a valid amount greater than zero.');
      return;
    }
    if ((mode === 'withdraw' || mode === 'transfer') && num > parseFloat(balance)) {
      setErrorMsg('Insufficient Funds.');
      return;
    }

    try {
      if (mode === 'deposit') {
        await api.post('/account/deposit', { amount: num });
      } else if (mode === 'withdraw') {
        await api.post('/account/withdraw', { amount: num });
      } else if (mode === 'transfer') {
        if (!recipient) {
          setErrorMsg('Enter recipient username or email.');
          return;
        }
        await api.post('/account/transfer', {
          toUsernameOrEmail: recipient,
          amount: num,
        });
      }
      setShowPopup(false);
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Operation failed.';
      setErrorMsg(msg);
    }
  };

  /** Download the full CSV statement (unpaginated) */
  const downloadCSV = async () => {
    try {
      const response = await api.get('/account/transactions/csv', {
        responseType: 'blob',
      });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      const disposition = response.headers['content-disposition'];
      let filename = 'statement.csv';
      if (disposition) {
        const match = disposition.match(/filename="(.+)"/);
        if (match && match[1]) {
          filename = match[1];
        }
      }
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('CSV download error:', err);
      alert('Failed to download statement.');
    }
  };

  /** Clear date filters and reset to page 1 */
  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  // Compute how many pages we have
  const totalPages = Math.ceil(totalCount / size);
console.log("first")
  return (
    <div>
      <Navbar role="customer" />

      <div style={{ maxWidth: 700, margin: 'auto', padding: 20 }}>
        <h2>Your Transactions</h2>
        <p>Current Balance: ₹{balance.toFixed(2)}</p>

        {/* ==== Action Buttons ==== */}
        <div style={{ marginBottom: 20 }}>
          <button onClick={() => openPopup('deposit')} style={{ marginRight: 8 }}>
            Deposit
          </button>
          <button onClick={() => openPopup('withdraw')} style={{ marginRight: 8 }}>
            Withdraw
          </button>
          <button onClick={() => openPopup('transfer')} style={{ marginRight: 8 }}>
            Transfer
          </button>
          <button onClick={downloadCSV}>Download Statement</button>
        </div>

        {/* ==== Date Filters ==== */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: 20,
          }}
        >
          <div>
            <label>From:</label><br />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setPage(1);
                setStartDate(e.target.value);
              }}
            />
          </div>
          <div>
            <label>To:</label><br />
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setPage(1);
                setEndDate(e.target.value);
              }}
            />
          </div>
          <button onClick={fetchData} style={{ height: 32 }}>
            Filter
          </button>
          <button
            onClick={() => {
              handleClearFilters();
              fetchData();
            }}
            style={{ height: 32 }}
          >
            Clear
          </button>
        </div>

        {/* ==== Pagination Controls ==== */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <button
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={page <= 1}
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages || 1}
          </span>
          <button
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>

        {/* ==== Transactions Table ==== */}
        <table
          border="1"
          cellPadding="8"
          style={{ width: '100%', borderCollapse: 'collapse' }}
        >
          <thead style={{ background: '#f0f0f0' }}>
            <tr>
              <th>Type</th>
              <th>Amount</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id}>
                <td style={{ textTransform: 'capitalize' }}>{tx.type}</td>
                <td>₹{parseFloat(tx.amount).toFixed(2)}</td>
                <td>{new Date(tx.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center', padding: 12 }}>
                  No transactions to display.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ==== Popup for Deposit/Withdraw/Transfer ==== */}
      {showPopup && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: 20,
              borderRadius: 8,
              minWidth: 320,
            }}
          >
            <h3>
              {mode === 'deposit'
                ? 'Deposit Funds'
                : mode === 'withdraw'
                ? 'Withdraw Funds'
                : 'Transfer Funds'}
            </h3>

            {mode === 'transfer' && (
              <div style={{ marginBottom: 10 }}>
                <label>Recipient (username or email):</label><br />
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="e.g. johndoe or john@example.com"
                  style={{ width: '100%', marginTop: 4 }}
                />
              </div>
            )}

            <p>Available Balance: ₹{balance.toFixed(2)}</p>
            <input
              type="number"
              step="0.01"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ width: '100%', marginBottom: 10 }}
            />

            {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}

            <button onClick={handleAction} style={{ marginRight: 10 }}>
              {mode === 'deposit'
                ? 'Deposit'
                : mode === 'withdraw'
                ? 'Withdraw'
                : 'Transfer'}
            </button>
            <button onClick={() => setShowPopup(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
