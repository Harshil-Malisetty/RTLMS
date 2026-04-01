const express = require('express');
const router = express.Router();
const cassandra = require('cassandra-driver');
const client = require('../config/cassandra');
const auth = require('../middleware/authMiddleware');
const roleCheck = require('../middleware/roleMiddleware');

const Uuid = cassandra.types.Uuid;

// GET /api/servers — list all servers
router.get('/', auth, async (req, res) => {
  try {
    const result = await client.execute('SELECT server_id, hostname, ip_address, location FROM servers');
    res.json({ servers: result.rows });
  } catch (err) {
    console.error('List servers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/servers/:serverId — get server details
router.get('/:serverId', auth, async (req, res) => {
  try {
    const result = await client.execute(
      'SELECT server_id, hostname, ip_address, location FROM servers WHERE server_id = ?',
      [Uuid.fromString(req.params.serverId)],
      { prepare: true }
    );
    if (result.rowLength === 0) {
      return res.status(404).json({ error: 'Server not found' });
    }
    res.json({ server: result.rows[0] });
  } catch (err) {
    console.error('Get server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/servers — create new server (admin only)
router.post('/', auth, roleCheck('ADMIN'), async (req, res) => {
  try {
    const { hostname, ip_address, location } = req.body;
    if (!hostname || !ip_address || !location) {
      return res.status(400).json({ error: 'hostname, ip_address, and location are required' });
    }

    const serverId = Uuid.random();
    await client.execute(
      'INSERT INTO servers (server_id, hostname, ip_address, location) VALUES (?, ?, ?, ?)',
      [serverId, hostname, ip_address, location],
      { prepare: true }
    );

    // Audit trail
    const userId = Uuid.fromString(req.user.userId);
    await client.execute(
      'INSERT INTO audit_by_user (user_id, timestamp, audit_id, action) VALUES (?, ?, ?, ?)',
      [userId, new Date(), Uuid.random(), `Server created: ${hostname} (${ip_address})`],
      { prepare: true }
    );

    res.status(201).json({ server: { server_id: serverId.toString(), hostname, ip_address, location } });
  } catch (err) {
    console.error('Create server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
