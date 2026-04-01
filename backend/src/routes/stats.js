const express = require('express');
const router = express.Router();
const client = require('../config/cassandra');
const auth = require('../middleware/authMiddleware');

// GET /api/stats/dashboard — aggregate dashboard statistics
router.get('/dashboard', auth, async (req, res) => {
  try {
    const severities = ['INFO', 'WARN', 'ERROR', 'CRITICAL'];

    // Count logs per severity
    const countPromises = severities.map(sev =>
      client.execute(
        'SELECT COUNT(*) as count FROM logs_by_severity WHERE severity = ?',
        [sev],
        { prepare: true }
      )
    );

    const [openAlertsResult, serversResult, ...sevCounts] = await Promise.all([
      client.execute(
        'SELECT COUNT(*) as count FROM alerts_by_status WHERE status = ?',
        ['OPEN'],
        { prepare: true }
      ),
      client.execute('SELECT COUNT(*) as count FROM servers'),
      ...countPromises,
    ]);

    const severityDistribution = {};
    let totalLogs = 0;
    severities.forEach((sev, i) => {
      const c = Number(sevCounts[i].rows[0].count);
      severityDistribution[sev] = c;
      totalLogs += c;
    });

    // Critical logs in last 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const criticalRecentResult = await client.execute(
      'SELECT COUNT(*) as count FROM logs_by_severity WHERE severity = ? AND timestamp > ?',
      ['CRITICAL', twentyFourHoursAgo],
      { prepare: true }
    );

    res.json({
      totalLogs,
      openAlerts: Number(openAlertsResult.rows[0].count),
      activeServers: Number(serversResult.rows[0].count),
      criticalLast24h: Number(criticalRecentResult.rows[0].count),
      severityDistribution,
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
