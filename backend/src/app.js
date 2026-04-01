require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const setupSocket = require('./sockets/logStream');

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});
setupSocket(io);
app.set('io', io);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/servers', require('./routes/servers'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/stats', require('./routes/stats'));

// Global error handler
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(503).json({ error: 'Service unavailable' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✓ RT-LMS backend running on http://localhost:${PORT}`);
});
