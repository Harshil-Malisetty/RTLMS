const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cassandra = require('cassandra-driver');
const client = require('../config/cassandra');
const auth = require('../middleware/authMiddleware');

const Uuid = cassandra.types.Uuid;

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await client.execute(
      'SELECT user_id, name, role, password FROM users_by_email WHERE email = ?',
      [email],
      { prepare: true }
    );

    if (result.rowLength === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.user_id.toString(), name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Write audit entry for login
    await client.execute(
      'INSERT INTO audit_by_user (user_id, timestamp, audit_id, action) VALUES (?, ?, ?, ?)',
      [user.user_id, new Date(), Uuid.random(), `User logged in: ${email}`],
      { prepare: true }
    );

    res.json({
      token,
      user: { userId: user.user_id.toString(), name: user.name, role: user.role }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    res.json({ userId: req.user.userId, name: req.user.name, role: req.user.role });
  } catch (err) {
    console.error('Auth/me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
