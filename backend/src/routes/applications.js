const express = require('express');
const router = express.Router();
const cassandra = require('cassandra-driver');
const client = require('../config/cassandra');
const auth = require('../middleware/authMiddleware');
const roleCheck = require('../middleware/roleMiddleware');

const Uuid = cassandra.types.Uuid;

// GET /api/applications — list all apps
router.get('/', auth, async (req, res) => {
  try {
    const result = await client.execute('SELECT app_id, app_name, server_id FROM applications');
    res.json({ applications: result.rows });
  } catch (err) {
    console.error('List applications error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/applications/:appId — get app details
router.get('/:appId', auth, async (req, res) => {
  try {
    const result = await client.execute(
      'SELECT app_id, app_name, server_id FROM applications WHERE app_id = ?',
      [Uuid.fromString(req.params.appId)],
      { prepare: true }
    );
    if (result.rowLength === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    res.json({ application: result.rows[0] });
  } catch (err) {
    console.error('Get application error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/applications — create new app (admin only)
router.post('/', auth, roleCheck('ADMIN'), async (req, res) => {
  try {
    const { app_name, server_id } = req.body;
    if (!app_name || !server_id) {
      return res.status(400).json({ error: 'app_name and server_id are required' });
    }

    const appId = Uuid.random();
    const serverId = Uuid.fromString(server_id);
    await client.execute(
      'INSERT INTO applications (app_id, app_name, server_id) VALUES (?, ?, ?)',
      [appId, app_name, serverId],
      { prepare: true }
    );

    // Audit trail
    const userId = Uuid.fromString(req.user.userId);
    await client.execute(
      'INSERT INTO audit_by_user (user_id, timestamp, audit_id, action) VALUES (?, ?, ?, ?)',
      [userId, new Date(), Uuid.random(), `Application created: ${app_name}`],
      { prepare: true }
    );

    res.status(201).json({ application: { app_id: appId.toString(), app_name, server_id } });
  } catch (err) {
    console.error('Create application error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
