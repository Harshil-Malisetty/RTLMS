/**
 * RT-LMS Log Generator
 * Continuously generates simulated logs by POSTing to the backend API.
 * Run: node scripts/logGenerator.js
 * Requires the backend to be running on PORT 5000.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const http = require('http');

const API_BASE = `http://127.0.0.1:${process.env.PORT || 5000}`;

// Seed server and app IDs (must match seed.js)
const SERVER_IDS = [
  '660e8400-e29b-41d4-a716-446655440001',
  '660e8400-e29b-41d4-a716-446655440002',
  '660e8400-e29b-41d4-a716-446655440003',
];
const APP_IDS = [
  '770e8400-e29b-41d4-a716-446655440001',
  '770e8400-e29b-41d4-a716-446655440002',
  '770e8400-e29b-41d4-a716-446655440003',
];

const MESSAGES = {
  INFO: [
    'Request handled in 32ms',
    'Health check passed — all systems nominal',
    'Cache hit ratio: 94.3%',
    'New connection from client 10.0.3.45',
    'Scheduled cleanup job completed',
    'Configuration reloaded successfully',
    'User session initiated',
    'Database query executed in 8ms',
  ],
  WARN: [
    'Response time exceeded 1500ms threshold',
    'Memory usage at 81% — approaching limit',
    'SSL certificate expires in 7 days',
    'Disk usage at 85% on /dev/sda1',
    'Connection pool nearing capacity (18/20)',
    'Retry attempt 3/5 for payment gateway',
  ],
  ERROR: [
    'Failed to connect to database: connection timeout',
    'NullPointerException in OrderService.process()',
    'File not found: /etc/app/config.yaml',
    'Authentication failed for user: unknown@evil.com',
    'Connection refused on port 5432',
  ],
  CRITICAL: [
    'Disk usage exceeded 97% — service degrading',
    'Out of memory: process terminated by OOM killer',
    'Primary database node unreachable — failover initiated',
    'Kernel panic: fatal exception in interrupt handler',
  ],
};

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickSeverity() {
  const r = Math.random();
  if (r < 0.60) return 'INFO';
  if (r < 0.80) return 'WARN';
  if (r < 0.95) return 'ERROR';
  return 'CRITICAL';
}

function postJSON(url, data, token) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': `Bearer ${token}`,
      },
    };
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(responseData)); }
        catch { resolve(responseData); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function login() {
  console.log('Logging in as operator...');
  const result = await postJSON(`${API_BASE}/api/auth/login`, {
    email: 'operator@rtlms.io',
    password: 'operator123',
  }, '');
  if (!result.token) {
    throw new Error('Login failed: ' + JSON.stringify(result));
  }
  console.log('✓ Authenticated');
  return result.token;
}

async function generateLog(token) {
  const severity = pickSeverity();
  const message = randomItem(MESSAGES[severity]);
  const server_id = randomItem(SERVER_IDS);
  const app_id = randomItem(APP_IDS);

  const log = { server_id, app_id, severity, message };
  const result = await postJSON(`${API_BASE}/api/logs`, log, token);

  const time = new Date().toISOString().split('T')[1].slice(0, 8);
  const sevColor = { INFO: '\x1b[34m', WARN: '\x1b[33m', ERROR: '\x1b[31m', CRITICAL: '\x1b[35m' };
  console.log(`[${time}] ${sevColor[severity]}${severity}\x1b[0m  ${message}`);

  return result;
}

async function main() {
  const token = await login();

  console.log('\n══ RT-LMS Log Generator Started ══');
  console.log('Generating logs every 2-5 seconds. Press Ctrl+C to stop.\n');

  const generate = async () => {
    try {
      await generateLog(token);
    } catch (err) {
      console.error('Error generating log:', err.message);
    }
    const delay = 2000 + Math.floor(Math.random() * 3000);
    setTimeout(generate, delay);
  };

  generate();
}

main().catch(err => {
  console.error('Log generator failed:', err.message);
  process.exit(1);
});
