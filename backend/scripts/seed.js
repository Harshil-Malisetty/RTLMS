/**
 * RT-LMS Seed Script
 * Populates Cassandra with initial data: users, servers, apps, logs, alerts, audit entries.
 * Run: node scripts/seed.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const cassandra = require('cassandra-driver');
const bcrypt = require('bcryptjs');

const Uuid = cassandra.types.Uuid;

// Connect WITHOUT keyspace first to create it
const setupClient = new cassandra.Client({
  contactPoints: [process.env.CASSANDRA_HOST || '127.0.0.1'],
  localDataCenter: process.env.CASSANDRA_DC || 'datacenter1',
});

// Fixed UUIDs for reproducible seed data
const USERS = {
  admin:    Uuid.fromString('550e8400-e29b-41d4-a716-446655440001'),
  operator: Uuid.fromString('550e8400-e29b-41d4-a716-446655440002'),
  viewer:   Uuid.fromString('550e8400-e29b-41d4-a716-446655440003'),
};

const SERVERS = {
  webProd:  Uuid.fromString('660e8400-e29b-41d4-a716-446655440001'),
  apiProd:  Uuid.fromString('660e8400-e29b-41d4-a716-446655440002'),
  dbProd:   Uuid.fromString('660e8400-e29b-41d4-a716-446655440003'),
};

const APPS = {
  nginx:    Uuid.fromString('770e8400-e29b-41d4-a716-446655440001'),
  payment:  Uuid.fromString('770e8400-e29b-41d4-a716-446655440002'),
  userAuth: Uuid.fromString('770e8400-e29b-41d4-a716-446655440003'),
};

const LOG_MESSAGES = [
  { severity: 'INFO',     message: 'Request processed successfully in 45ms' },
  { severity: 'INFO',     message: 'Health check passed' },
  { severity: 'INFO',     message: 'Connection pool initialized with 10 connections' },
  { severity: 'INFO',     message: 'Cache refresh completed' },
  { severity: 'INFO',     message: 'Scheduled job executed successfully' },
  { severity: 'INFO',     message: 'User session created' },
  { severity: 'INFO',     message: 'Backup completed successfully' },
  { severity: 'INFO',     message: 'Configuration reloaded' },
  { severity: 'WARN',     message: 'Response time exceeded 2000ms threshold' },
  { severity: 'WARN',     message: 'Memory usage at 78% — approaching limit' },
  { severity: 'WARN',     message: 'SSL certificate expires in 14 days' },
  { severity: 'WARN',     message: 'Retry attempt 2/3 for external API call' },
  { severity: 'WARN',     message: 'Disk usage at 82% on /dev/sda1' },
  { severity: 'ERROR',    message: 'Failed to connect to database: ETIMEDOUT' },
  { severity: 'ERROR',    message: 'Null pointer exception in PaymentProcessor.process()' },
  { severity: 'ERROR',    message: 'Unauthorized access attempt from IP 192.168.1.105' },
  { severity: 'ERROR',    message: 'File not found: /var/log/app.conf' },
  { severity: 'ERROR',    message: 'Connection refused on port 3306' },
  { severity: 'CRITICAL', message: 'Disk usage exceeded 95% — immediate action required' },
  { severity: 'CRITICAL', message: 'Out of memory: process killed by OOM killer' },
  { severity: 'CRITICAL', message: 'Primary database node unreachable' },
];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomTimestamp(hoursBack = 48) {
  const now = Date.now();
  const offset = Math.floor(Math.random() * hoursBack * 60 * 60 * 1000);
  return new Date(now - offset);
}

async function seed() {
  console.log('Connecting to Cassandra...');
  await setupClient.connect();
  console.log('✓ Connected');

  // Create keyspace
  console.log('Creating keyspace rtlms...');
  await setupClient.execute(`
    CREATE KEYSPACE IF NOT EXISTS rtlms
    WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}
  `);

  // Create tables
  console.log('Creating tables...');
  const tables = [
    `CREATE TABLE IF NOT EXISTS rtlms.users (
      user_id UUID PRIMARY KEY, name TEXT, role TEXT, email TEXT, password TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS rtlms.users_by_email (
      email TEXT PRIMARY KEY, user_id UUID, name TEXT, role TEXT, password TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS rtlms.servers (
      server_id UUID PRIMARY KEY, hostname TEXT, ip_address TEXT, location TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS rtlms.applications (
      app_id UUID PRIMARY KEY, app_name TEXT, server_id UUID
    )`,
    `CREATE TABLE IF NOT EXISTS rtlms.logs_by_server (
      server_id UUID, timestamp TIMESTAMP, log_id UUID, severity TEXT, message TEXT, app_id UUID,
      PRIMARY KEY ((server_id), timestamp, log_id)
    ) WITH CLUSTERING ORDER BY (timestamp DESC)`,
    `CREATE TABLE IF NOT EXISTS rtlms.logs_by_app (
      app_id UUID, timestamp TIMESTAMP, log_id UUID, severity TEXT, message TEXT, server_id UUID,
      PRIMARY KEY ((app_id), timestamp, log_id)
    ) WITH CLUSTERING ORDER BY (timestamp DESC)`,
    `CREATE TABLE IF NOT EXISTS rtlms.logs_by_severity (
      severity TEXT, timestamp TIMESTAMP, log_id UUID, server_id UUID, app_id UUID, message TEXT,
      PRIMARY KEY ((severity), timestamp, log_id)
    ) WITH CLUSTERING ORDER BY (timestamp DESC)`,
    `CREATE TABLE IF NOT EXISTS rtlms.alerts_by_log (
      log_id UUID, alert_id UUID, alert_type TEXT, status TEXT,
      PRIMARY KEY ((log_id), alert_id)
    )`,
    `CREATE TABLE IF NOT EXISTS rtlms.alerts_by_status (
      status TEXT, created_at TIMESTAMP, alert_id UUID, log_id UUID, alert_type TEXT,
      PRIMARY KEY ((status), created_at, alert_id)
    ) WITH CLUSTERING ORDER BY (created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS rtlms.audit_by_user (
      user_id UUID, timestamp TIMESTAMP, audit_id UUID, action TEXT,
      PRIMARY KEY ((user_id), timestamp, audit_id)
    ) WITH CLUSTERING ORDER BY (timestamp DESC)`,
  ];

  for (const ddl of tables) {
    await setupClient.execute(ddl);
  }
  console.log('✓ All tables created');

  // Now connect to the keyspace
  const client = new cassandra.Client({
    contactPoints: [process.env.CASSANDRA_HOST || '127.0.0.1'],
    localDataCenter: process.env.CASSANDRA_DC || 'datacenter1',
    keyspace: 'rtlms',
  });
  await client.connect();

  // ── Seed Users ──
  console.log('Seeding users...');
  const passwordHash = bcrypt.hashSync('admin123', 10);
  const operatorHash = bcrypt.hashSync('operator123', 10);
  const viewerHash = bcrypt.hashSync('viewer123', 10);

  const users = [
    { id: USERS.admin,    name: 'Alice Admin',    role: 'ADMIN',    email: 'admin@rtlms.io',    pw: passwordHash },
    { id: USERS.operator, name: 'Bob Operator',   role: 'OPERATOR', email: 'operator@rtlms.io', pw: operatorHash },
    { id: USERS.viewer,   name: 'Charlie Viewer',  role: 'VIEWER',   email: 'viewer@rtlms.io',   pw: viewerHash },
  ];

  for (const u of users) {
    await client.execute(
      'INSERT INTO users (user_id, name, role, email, password) VALUES (?, ?, ?, ?, ?)',
      [u.id, u.name, u.role, u.email, u.pw], { prepare: true }
    );
    await client.execute(
      'INSERT INTO users_by_email (email, user_id, name, role, password) VALUES (?, ?, ?, ?, ?)',
      [u.email, u.id, u.name, u.role, u.pw], { prepare: true }
    );
  }
  console.log('✓ 3 users seeded');

  // ── Seed Servers ──
  console.log('Seeding servers...');
  const servers = [
    { id: SERVERS.webProd, hostname: 'web-prod-01', ip: '10.0.1.10', location: 'US-East-1' },
    { id: SERVERS.apiProd, hostname: 'api-prod-02', ip: '10.0.1.20', location: 'US-West-2' },
    { id: SERVERS.dbProd,  hostname: 'db-prod-03',  ip: '10.0.2.10', location: 'EU-West-1' },
  ];
  for (const s of servers) {
    await client.execute(
      'INSERT INTO servers (server_id, hostname, ip_address, location) VALUES (?, ?, ?, ?)',
      [s.id, s.hostname, s.ip, s.location], { prepare: true }
    );
  }
  console.log('✓ 3 servers seeded');

  // ── Seed Applications ──
  console.log('Seeding applications...');
  const apps = [
    { id: APPS.nginx,    name: 'nginx-proxy',      serverId: SERVERS.webProd },
    { id: APPS.payment,  name: 'payment-service',   serverId: SERVERS.webProd },
    { id: APPS.userAuth, name: 'user-auth-api',     serverId: SERVERS.apiProd },
  ];
  for (const a of apps) {
    await client.execute(
      'INSERT INTO applications (app_id, app_name, server_id) VALUES (?, ?, ?)',
      [a.id, a.name, a.serverId], { prepare: true }
    );
  }
  console.log('✓ 3 applications seeded');

  // ── Seed Logs (50) ──
  console.log('Seeding 50 logs...');
  const serverIds = Object.values(SERVERS);
  const appIds = Object.values(APPS);
  const alertLogs = []; // track ERROR/CRITICAL logs for alerts

  for (let i = 0; i < 50; i++) {
    const logId = Uuid.random();
    const logEntry = randomItem(LOG_MESSAGES);
    const serverId = randomItem(serverIds);
    const appId = randomItem(appIds);
    const timestamp = randomTimestamp(48);

    await Promise.all([
      client.execute(
        'INSERT INTO logs_by_server (server_id, timestamp, log_id, severity, message, app_id) VALUES (?, ?, ?, ?, ?, ?)',
        [serverId, timestamp, logId, logEntry.severity, logEntry.message, appId], { prepare: true }
      ),
      client.execute(
        'INSERT INTO logs_by_app (app_id, timestamp, log_id, severity, message, server_id) VALUES (?, ?, ?, ?, ?, ?)',
        [appId, timestamp, logId, logEntry.severity, logEntry.message, serverId], { prepare: true }
      ),
      client.execute(
        'INSERT INTO logs_by_severity (severity, timestamp, log_id, server_id, app_id, message) VALUES (?, ?, ?, ?, ?, ?)',
        [logEntry.severity, timestamp, logId, serverId, appId, logEntry.message], { prepare: true }
      ),
    ]);

    if ((logEntry.severity === 'ERROR' || logEntry.severity === 'CRITICAL') && alertLogs.length < 5) {
      alertLogs.push({ logId, severity: logEntry.severity, timestamp, message: logEntry.message });
    }
  }
  console.log('✓ 50 logs seeded');

  // ── Seed Alerts (5) ──
  console.log('Seeding alerts...');
  for (let i = 0; i < alertLogs.length; i++) {
    const entry = alertLogs[i];
    const alertId = Uuid.random();
    const alertType = entry.severity === 'CRITICAL' ? 'CRITICAL_ALERT' : 'ERROR_ALERT';
    const status = i < 3 ? 'OPEN' : 'RESOLVED';

    await client.execute(
      'INSERT INTO alerts_by_log (log_id, alert_id, alert_type, status) VALUES (?, ?, ?, ?)',
      [entry.logId, alertId, alertType, status], { prepare: true }
    );
    await client.execute(
      'INSERT INTO alerts_by_status (status, created_at, alert_id, log_id, alert_type) VALUES (?, ?, ?, ?, ?)',
      [status, entry.timestamp, alertId, entry.logId, alertType], { prepare: true }
    );
  }
  console.log(`✓ ${alertLogs.length} alerts seeded`);

  // ── Seed Audit Entries (10 for admin) ──
  console.log('Seeding audit entries...');
  const auditActions = [
    'User logged in: admin@rtlms.io',
    'Server created: web-prod-01',
    'Application created: nginx-proxy',
    'Alert resolved: alert-001',
    'User logged in: admin@rtlms.io',
    'Server created: api-prod-02',
    'Application created: payment-service',
    'Alert resolved: alert-002',
    'Server created: db-prod-03',
    'Application created: user-auth-api',
  ];

  for (let i = 0; i < 10; i++) {
    await client.execute(
      'INSERT INTO audit_by_user (user_id, timestamp, audit_id, action) VALUES (?, ?, ?, ?)',
      [USERS.admin, randomTimestamp(72), Uuid.random(), auditActions[i]],
      { prepare: true }
    );
  }
  console.log('✓ 10 audit entries seeded');

  console.log('\n══════════════════════════════════════');
  console.log('  RT-LMS seed complete!');
  console.log('══════════════════════════════════════');
  console.log('Test credentials:');
  console.log('  Admin:    admin@rtlms.io    / admin123');
  console.log('  Operator: operator@rtlms.io / operator123');
  console.log('  Viewer:   viewer@rtlms.io   / viewer123');
  console.log('══════════════════════════════════════\n');

  await client.shutdown();
  await setupClient.shutdown();
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
