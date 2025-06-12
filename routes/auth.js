require('dotenv').config();
const express = require('express');
const { User } = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const router = express.Router();

// Grab from .env
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '10', 10);

// Helper: sign a JWT for a given user payload
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// POST /api/auth/customer/register
//   Body: { username, email, password }
router.post('/customer/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Provide username, email, and password.' });
  }

  try {
    // Check if username or email already exists
    const existing = await User.findOne({
      where: {
        role: 'customer',
        [Op.or]: [
          { username },
          { email }
        ]
      }
    });
    if (existing) {
      return res.status(409).json({ message: 'Username or email already in use.' });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    // Create new customer with default balance = 0
    const newUser = await User.create({
      username,
      email,
      passwordHash: hashed,
      role: 'customer',
      balance: 0.0
    });

    // Sign a JWT immediately so the user is logged in after registering
    const token = signToken({ id: newUser.id, role: newUser.role });
    return res.status(201).json({ token });
  } catch (err) {
    console.error('Error in customer registration:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

router.post('/banker/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Provide username, email, and password.' });
  }

  try {
    // Check if username or email already exists
    const existing = await User.findOne({
      where: {
        role: 'banker',
        [Op.or]: [
          { username },
          { email }
        ]
      }
    });
    if (existing) {
      return res.status(409).json({ message: 'Username or email already in use.' });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    // Create new customer with default balance = 0
    const newUser = await User.create({
      username,
      email,
      passwordHash: hashed,
      role: 'banker',
      balance: 0.0
    });

    // Sign a JWT immediately so the user is logged in after registering
    const token = signToken({ id: newUser.id, role: newUser.role });
    return res.status(201).json({ token });
  } catch (err) {
    console.error('Error in banker registration:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/auth/customer/login
router.post('/customer/login', async (req, res) => {
  const { usernameOrEmail, password } = req.body;
  if (!usernameOrEmail || !password) {
    return res.status(400).json({ message: 'Provide username/email and password.' });
  }

  try {
    const user = await User.findOne({
      where: {
        role: 'customer',
        [Op.or]: [
          { username: usernameOrEmail },
          { email: usernameOrEmail }
        ]
      }
    });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Sign a JWT containing user ID and role
    const token = signToken({ id: user.id, role: user.role });
    return res.json({ token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/auth/banker/login
router.post('/banker/login', async (req, res) => {
  const { usernameOrEmail, password } = req.body;
  if (!usernameOrEmail || !password) {
    return res.status(400).json({ message: 'Provide username/email and password.' });
  }

  try {
    const user = await User.findOne({
      where: {
        role: 'banker',
        [Op.or]: [
          { username: usernameOrEmail },
          { email: usernameOrEmail }
        ]
      }
    });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Sign a JWT containing user ID and role
    const token = signToken({ id: user.id, role: user.role });
    return res.json({ token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// Middleware to protect routes: verifies “Bearer <token>”
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Unauthorized: no token.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }
    // decoded contains { id, role, iat, exp }
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  });
}

module.exports = {
  router,
  authenticateJWT,
};
