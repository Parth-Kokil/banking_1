// backend/routes/account.js

const express = require('express');
const router = express.Router();
const { User, Account, sequelize } = require('../db');
const { authenticateJWT } = require('./auth');
const { Op } = require('sequelize');
const bcrypt = require('bcrypt');

// SALT_ROUNDS for hashing customer passwords (banker passwords are seeded)
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '10', 10);

/**
 * GET /api/account/transactions?start=YYYY-MM-DD&end=YYYY-MM-DD&page=&size=
 * Returns: { balance, totalCount, transactions: [ { id, type, amount, createdAt } ] }
 * If start/end provided, filters by createdAt range.
 * Pagination via page (default 1) and size (default 10).
 */
router.get('/transactions', authenticateJWT, async (req, res) => {
  try {
    // 1) Parse pagination params
    const pageNum = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.size, 10) || 10;
    if (pageNum < 1 || pageSize < 1) {
      return res.status(400).json({ message: 'Invalid page or size parameter.' });
    }
    const limit = pageSize;
    const offset = (pageNum - 1) * pageSize;

    // 2) Build date filter if provided
    const { start, end } = req.query;
    let dateFilter = {};
    if (start) {
      dateFilter[Op.gte] = new Date(`${start}T00:00:00Z`);
    }
    if (end) {
      dateFilter[Op.lte] = new Date(`${end}T23:59:59Z`);
    }

    // 3) Fetch user's balance
    const user = await User.findByPk(req.userId, {
      attributes: ['id', 'username', 'balance'],
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // 4) Build where clause for transactions
    const whereClause = { userId: req.userId };
    if (start || end) {
      whereClause.createdAt = dateFilter;
    }

    // 5) Paginate transactions
    const { count: totalCount, rows } = await Account.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      attributes: ['id', 'type', 'amount', 'createdAt'],
    });

    const txs = rows.map(tx => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      createdAt: tx.createdAt,
    }));

    return res.json({
      balance: user.balance,
      totalCount,
      transactions: txs,
    });
  } catch (err) {
    console.error('Error fetching paginated transactions:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

/**
 * GET /api/account/transactions/csv
 * Returns CSV file of all transactions for the authenticated user.
 */
router.get('/transactions/csv', authenticateJWT, async (req, res) => {
  try {
    const txs = await Account.findAll({
      where: { userId: req.userId },
      order: [['createdAt', 'DESC']],
      attributes: ['type', 'amount', 'createdAt'],
    });

    let csv = 'Type,Amount,Date\n';
    txs.forEach(tx => {
      const dateStr = tx.createdAt.toISOString();
      csv += `${tx.type},${tx.amount},${dateStr}\n`;
    });

    const user = await User.findByPk(req.userId);
    const username = user ? user.username : 'user';

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="statement-${username}.csv"`
    );
    return res.send(csv);
  } catch (err) {
    console.error('CSV generation error:', err);
    return res.status(500).json({ message: 'Server error generating CSV.' });
  }
});

/**
 * POST /api/account/deposit
 * Body: { amount }
 * Increments user balance and logs a deposit transaction.
 */
router.post('/deposit', authenticateJWT, async (req, res) => {
  const { amount } = req.body;
  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ message: 'Invalid amount.' });
  }

  try {
    await User.increment('balance', { by: amount, where: { id: req.userId } });
    await Account.create({
      userId: req.userId,
      type: 'deposit',
      amount,
    });
    return res.json({ message: 'Deposit successful.' });
  } catch (err) {
    console.error('Deposit error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

/**
 * POST /api/account/withdraw
 * Body: { amount }
 * Deducts from user balance if sufficient and logs a withdrawal transaction.
 */
router.post('/withdraw', authenticateJWT, async (req, res) => {
  const { amount } = req.body;
  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ message: 'Invalid amount.' });
  }

  try {
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    if (parseFloat(amount) > parseFloat(user.balance)) {
      return res.status(400).json({ message: 'Insufficient Funds.' });
    }

    await User.decrement('balance', { by: amount, where: { id: req.userId } });
    await Account.create({
      userId: req.userId,
      type: 'withdrawal',
      amount,
    });
    return res.json({ message: 'Withdrawal successful.' });
  } catch (err) {
    console.error('Withdrawal error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

/**
 * POST /api/account/transfer
 * Body: { toUsernameOrEmail, amount }
 * Transfers amount from authenticated customer to another customer.
 */
router.post('/transfer', authenticateJWT, async (req, res) => {
  const { toUsernameOrEmail, amount } = req.body;

  if (!toUsernameOrEmail || !amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ message: 'Provide valid recipient and amount.' });
  }

  try {
    const sender = await User.findByPk(req.userId);
    if (!sender) {
      return res.status(404).json({ message: 'Sender not found.' });
    }
    if (sender.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can initiate transfers.' });
    }
    if (parseFloat(amount) > parseFloat(sender.balance)) {
      return res.status(400).json({ message: 'Insufficient Funds.' });
    }

    const recipient = await User.findOne({
      where: {
        role: 'customer',
        [Op.or]: [
          { username: toUsernameOrEmail },
          { email: toUsernameOrEmail },
        ],
      },
    });
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient customer not found.' });
    }
    if (recipient.id === sender.id) {
      return res.status(400).json({ message: 'Cannot transfer to yourself.' });
    }

    // Perform transfer in a DB transaction
    await sequelize.transaction(async (tx) => {
      await User.decrement('balance', {
        by: amount,
        where: { id: sender.id },
        transaction: tx,
      });
      await User.increment('balance', {
        by: amount,
        where: { id: recipient.id },
        transaction: tx,
      });
      await Account.create({
        userId: sender.id,
        type: 'withdrawal',
        amount,
      }, { transaction: tx });
      await Account.create({
        userId: recipient.id,
        type: 'deposit',
        amount,
      }, { transaction: tx });
    });

    const updatedSender = await User.findByPk(sender.id);
    return res.json({
      message: `Transferred ₹${amount} to ${recipient.username}.`,
      newBalance: updatedSender.balance,
    });
  } catch (err) {
    console.error('Transfer error:', err);
    return res.status(500).json({ message: 'Server error during transfer.' });
  }
});

/**
 * GET /api/account/all-accounts
 * Banker-only: Returns all customer accounts with balance and last transaction.
 */
router.get('/all-accounts', authenticateJWT, async (req, res) => {
  try {
    if (req.userRole !== 'banker') {
      return res.status(403).json({ message: 'Forbidden: bankers only.' });
    }

    const customers = await User.findAll({
      where: { role: 'customer' },
      attributes: ['id', 'username', 'email', 'balance'],
      include: [{
        model: Account,
        as: 'transactions',
        attributes: ['type', 'amount', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: 1,
      }],
    });

    const result = customers.map(c => {
      const lastTx = c.transactions[0];
      return {
        id: c.id,
        username: c.username,
        email: c.email,
        balance: c.balance,
        lastTransaction: lastTx
          ? { type: lastTx.type, amount: lastTx.amount, createdAt: lastTx.createdAt }
          : null,
      };
    });

    return res.json({ customers: result });
  } catch (err) {
    console.error('Error fetching all accounts:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

/**
 * POST /api/account/create-customer
 * Body: { username, email, password, initialBalance (optional) }
 * Banker-only: Creates a new customer with hashed password and initial balance.
 */
router.post('/create-customer', authenticateJWT, async (req, res) => {
  try {
    // 1) Only bankers can create new customers
    if (req.userRole !== 'banker') {
      return res.status(403).json({ message: 'Forbidden: bankers only.' });
    }

    const { username, email, password, initialBalance } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Provide username, email, and password.' });
    }

    // 2) Check if username or email already exists (any role)
    const existing = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email }],
      },
    });
    if (existing) {
      return res.status(409).json({ message: 'Username or email already in use.' });
    }

    // 3) Hash the password
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    // 4) Create the new customer
    const newCustomer = await User.create({
      username,
      email,
      passwordHash: hashed,
      role: 'customer',
      balance: initialBalance && !isNaN(initialBalance) && initialBalance > 0
        ? initialBalance
        : 0.0,
    });

    return res.status(201).json({
      message: 'Customer created.',
      customer: {
        id: newCustomer.id,
        username: newCustomer.username,
        email: newCustomer.email,
        balance: newCustomer.balance,
      },
    });
  } catch (err) {
    console.error('Error creating customer:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
