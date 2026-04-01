const express = require('express');
const router = express.Router();
const cassandra = require('cassandra-driver');
const client = require('../config/cassandra');
const auth = require('../middleware/authMiddleware');
const roleCheck = require('../middleware/roleMiddleware');

const Uuid = cassandra.types.Uuid;

// GET /api/alerts/open — fetch all OPEN alerts
router.get('/open', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const result = await client.execute(
      'SELECT status, created_at, alert_id, log_id, alert_type FROM alerts_by_status WHERE status = ?',
      ['OPEN'],
      { prepare: true, fetchSize: limit }
    );
    res.json({ alerts: result.rows });
  } catch (err) {
    console.error('Fetch open alerts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/alerts/resolved — fetch all RESOLVED alerts
router.get('/resolved', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const result = await client.execute(
      'SELECT status, created_at, alert_id, log_id, alert_type FROM alerts_by_status WHERE status = ?',
      ['RESOLVED'],
      { prepare: true, fetchSize: limit }
    );
    res.json({ alerts: result.rows });
  } catch (err) {
    console.error('Fetch resolved alerts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/alerts/by-log/:logId — fetch alerts for a specific log
router.get('/by-log/:logId', auth, async (req, res) => {
  try {
    const result = await client.execute(
      'SELECT log_id, alert_id, alert_type, status FROM alerts_by_log WHERE log_id = ?',
      [Uuid.fromString(req.params.logId)],
      { prepare: true }
    );
    res.json({ alerts: result.rows });
  } catch (err) {
    console.error('Fetch alerts by log error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/alerts/:alertId/resolve - resolve an alert
// Body must include: { log_id, created_at, alert_type }
router.patch('/:alertId/resolve', auth, roleCheck('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const { alertId } = req.params;
    const { log_id, created_at, alert_type } = req.body;

    if (!log_id || !created_at || !alert_type) {
      return res.status(400).json({ error: 'log_id, created_at, and alert_type are required in body' });
    }

    const alertUuid = Uuid.fromString(alertId);
    const logUuid = Uuid.fromString(log_id);
    const createdAtDate = new Date(created_at);

    // Delete from alerts_by_status WHERE status='OPEN'
    await client.execute(
      'DELETE FROM alerts_by_status WHERE status = ? AND created_at = ? AND alert_id = ?',
      ['OPEN', createdAtDate, alertUuid],
      { prepare: true }
    );

    // Insert into alerts_by_status with status='RESOLVED'
    await client.execute(
      'INSERT INTO alerts_by_status (status, created_at, alert_id, log_id, alert_type) VALUES (?, ?, ?, ?, ?)',
      ['RESOLVED', createdAtDate, alertUuid, logUuid, alert_type],
      { prepare: true }
    );

    // Update alerts_by_log status
    await client.execute(
      'UPDATE alerts_by_log SET status = ? WHERE log_id = ? AND alert_id = ?',
      ['RESOLVED', logUuid, alertUuid],
      { prepare: true }
    );

    // Audit trail
    const userId = Uuid.fromString(req.user.userId);
    await client.execute(
      'INSERT INTO audit_by_user (user_id, timestamp, audit_id, action) VALUES (?, ?, ?, ?)',
      [userId, new Date(), Uuid.random(), `Alert resolved: ${alertId}`],
      { prepare: true }
    );

    res.json({ message: 'Alert resolved successfully', alert_id: alertId });
  } catch (err) {
    console.error('Resolve alert error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
