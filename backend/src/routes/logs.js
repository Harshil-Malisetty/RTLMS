const express = require('express');
const router = express.Router();
const cassandra = require('cassandra-driver');
const client = require('../config/cassandra');
const auth = require('../middleware/authMiddleware');
const roleCheck = require('../middleware/roleMiddleware');

const Uuid = cassandra.types.Uuid;

// GET /api/logs/by-server/:serverId
router.get('/by-server/:serverId', auth, async (req, res) => {
  try {
    const { serverId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const options = { prepare: true, fetchSize: limit };
    if (req.query.pageState) {
      options.pageState = req.query.pageState;
    }

    const result = await client.execute(
      'SELECT server_id, timestamp, log_id, severity, message, app_id FROM logs_by_server WHERE server_id = ?',
      [Uuid.fromString(serverId)],
      options
    );

    res.json({ logs: result.rows, nextPageState: result.pageState || null });
  } catch (err) {
    console.error('Logs by server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/logs/by-app/:appId
router.get('/by-app/:appId', auth, async (req, res) => {
  try {
    const { appId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const options = { prepare: true, fetchSize: limit };
    if (req.query.pageState) {
      options.pageState = req.query.pageState;
    }

    const result = await client.execute(
      'SELECT app_id, timestamp, log_id, severity, message, server_id FROM logs_by_app WHERE app_id = ?',
      [Uuid.fromString(appId)],
      options
    );

    res.json({ logs: result.rows, nextPageState: result.pageState || null });
  } catch (err) {
    console.error('Logs by app error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/logs/by-severity/:severity
router.get('/by-severity/:severity', auth, async (req, res) => {
  try {
    const { severity } = req.params;
    const validSeverities = ['INFO', 'WARN', 'ERROR', 'CRITICAL'];
    if (!validSeverities.includes(severity.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid severity. Must be one of: INFO, WARN, ERROR, CRITICAL' });
    }

    const limit = parseInt(req.query.limit) || 50;
    const options = { prepare: true, fetchSize: limit };
    if (req.query.pageState) {
      options.pageState = req.query.pageState;
    }

    const result = await client.execute(
      'SELECT severity, timestamp, log_id, server_id, app_id, message FROM logs_by_severity WHERE severity = ?',
      [severity.toUpperCase()],
      options
    );

    res.json({ logs: result.rows, nextPageState: result.pageState || null });
  } catch (err) {
    console.error('Logs by severity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/logs — ingest a new log entry
router.post('/', auth, roleCheck('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const { server_id, app_id, severity, message } = req.body;
    if (!server_id || !app_id || !severity || !message) {
      return res.status(400).json({ error: 'server_id, app_id, severity, and message are required' });
    }

    const validSeverities = ['INFO', 'WARN', 'ERROR', 'CRITICAL'];
    if (!validSeverities.includes(severity.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid severity' });
    }

    const logId = Uuid.random();
    const timestamp = new Date();
    const serverId = Uuid.fromString(server_id);
    const appId = Uuid.fromString(app_id);
    const sev = severity.toUpperCase();

    // Insert into all 3 log tables
    await Promise.all([
      client.execute(
        'INSERT INTO logs_by_server (server_id, timestamp, log_id, severity, message, app_id) VALUES (?, ?, ?, ?, ?, ?)',
        [serverId, timestamp, logId, sev, message, appId],
        { prepare: true }
      ),
      client.execute(
        'INSERT INTO logs_by_app (app_id, timestamp, log_id, severity, message, server_id) VALUES (?, ?, ?, ?, ?, ?)',
        [appId, timestamp, logId, sev, message, serverId],
        { prepare: true }
      ),
      client.execute(
        'INSERT INTO logs_by_severity (severity, timestamp, log_id, server_id, app_id, message) VALUES (?, ?, ?, ?, ?, ?)',
        [sev, timestamp, logId, serverId, appId, message],
        { prepare: true }
      ),
    ]);

    const logData = {
      log_id: logId.toString(),
      server_id: server_id,
      app_id: app_id,
      severity: sev,
      message,
      timestamp: timestamp.toISOString(),
    };

    // Auto-generate alert for ERROR / CRITICAL
    if (sev === 'ERROR' || sev === 'CRITICAL') {
      const alertId = Uuid.random();
      const alertType = sev === 'CRITICAL' ? 'CRITICAL_ALERT' : 'ERROR_ALERT';
      await Promise.all([
        client.execute(
          'INSERT INTO alerts_by_log (log_id, alert_id, alert_type, status) VALUES (?, ?, ?, ?)',
          [logId, alertId, alertType, 'OPEN'],
          { prepare: true }
        ),
        client.execute(
          'INSERT INTO alerts_by_status (status, created_at, alert_id, log_id, alert_type) VALUES (?, ?, ?, ?, ?)',
          ['OPEN', timestamp, alertId, logId, alertType],
          { prepare: true }
        ),
      ]);
      logData.alert = { alert_id: alertId.toString(), alert_type: alertType, status: 'OPEN' };
    }

    // Emit real-time event via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('new_log', logData);
    }

    res.status(201).json(logData);
  } catch (err) {
    console.error('Log ingestion error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
