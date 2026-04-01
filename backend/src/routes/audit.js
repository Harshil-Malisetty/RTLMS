const express = require('express');
const router = express.Router();
const cassandra = require('cassandra-driver');
const client = require('../config/cassandra');
const auth = require('../middleware/authMiddleware');
const roleCheck = require('../middleware/roleMiddleware');

const Uuid = cassandra.types.Uuid;

// GET /api/audit/by-user/:userId — fetch audit trail for a user
router.get('/by-user/:userId', auth, roleCheck('ADMIN'), async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const options = { prepare: true, fetchSize: limit };
    if (req.query.pageState) {
      options.pageState = req.query.pageState;
    }

    const result = await client.execute(
      'SELECT user_id, timestamp, audit_id, action FROM audit_by_user WHERE user_id = ?',
      [Uuid.fromString(userId)],
      options
    );

    res.json({ audits: result.rows, nextPageState: result.pageState || null });
  } catch (err) {
    console.error('Fetch audit error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/audit/users — list all users (for admin dropdown)
router.get('/users', auth, roleCheck('ADMIN'), async (req, res) => {
  try {
    const result = await client.execute('SELECT user_id, name, role, email FROM users');
    res.json({ users: result.rows });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
