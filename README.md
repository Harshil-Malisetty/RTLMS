# RT-LMS — Real-Time Log Management System

A full-stack web application that collects, stores, queries, and visualizes logs in real time. Powered by **Apache Cassandra** (NoSQL), **Node.js/Express** backend, and **React + TailwindCSS** frontend with **Socket.IO** live streaming.

---

## Architecture

```
┌──────────────┐     Socket.IO      ┌──────────────┐     CQL        ┌──────────────┐
│   React UI   │ ◄────────────────► │  Express API │ ◄────────────► │  Cassandra   │
│  (Vite:5173) │     REST/WS        │  (Port:5000) │                │  (Port:9042) │
└──────────────┘                    └──────────────┘                └──────────────┘
```

---

## Prerequisites

You need three things installed. Follow The exact versions below — they are tested to work together.

| Tool | Required Version | Purpose |
|------|-----------------|---------|
| **Node.js** | 18.x LTS (18.17+ recommended) | Backend + Frontend runtime |
| **Docker Desktop** | Any recent version | Runs Apache Cassandra in a container |
| **Git** | Any recent version | Version control |

> **Why Docker instead of installing Cassandra directly?** Cassandra requires Java 8/11, specific Python versions, and heavy configuration. Docker gives you a one-command setup with zero version conflicts.

---

## Fresh Laptop Setup (Windows)

### Step 1 — Install Node.js 18

1. Go to https://nodejs.org/en/download/ 
2. Download the **Windows Installer (.msi)** for **Node.js 18.x LTS**
3. Run the installer — accept all defaults, make sure "Add to PATH" is checked
4. Verify in a **new** PowerShell/CMD window:
   ```powershell
   node --version    # Should print v18.x.x
   npm --version     # Should print 9.x or 10.x
   ```

### Step 2 — Install Docker Desktop

1. Go to https://www.docker.com/products/docker-desktop/
2. Download and install **Docker Desktop for Windows**
3. During install, enable **WSL 2 backend** if prompted
4. After install, **restart your computer**
5. Open Docker Desktop — wait for it to say "Docker Desktop is running"
6. Verify in PowerShell:
   ```powershell
   docker --version   # Should print Docker version 2x.x.x
   ```

### Step 3 — Install Git (if not already installed)

1. Go to https://git-scm.com/download/win
2. Download & install — accept all defaults
3. Verify:
   ```powershell
   git --version
   ```

---

## Getting the App Running (3 Steps)

Open a PowerShell terminal and `cd` to the project root folder.

### Step 1 — Start Cassandra & Seed the Database

```powershell
# 1a. Start Cassandra in Docker (runs in background)
docker run -d --name rtlms-cassandra -p 9042:9042 cassandra:4.1

# 1b. IMPORTANT: Wait ~60 seconds for Cassandra to fully start up
#     You can check if it's ready with:
docker exec rtlms-cassandra cqlsh -e "DESCRIBE KEYSPACES"
#     If you get "Connection refused", wait 15 more seconds and try again.
#     When it prints a list of keyspaces (even if empty), Cassandra is ready.

# 1c. Load the database schema
Get-Content backend/scripts/schema.cql | docker exec -i rtlms-cassandra cqlsh

# 1d. Install backend dependencies and seed the database
cd backend
npm install
node scripts/seed.js
cd ..
```

You should see output like:
```
✓ Connected
✓ All tables created
✓ 3 users seeded
✓ 3 servers seeded
✓ 3 applications seeded
✓ 50 logs seeded
✓ 5 alerts seeded
✓ 10 audit entries seeded
```

### Step 2 — Start the Backend

```powershell
cd backend
npm start
```

You should see:
```
✓ Cassandra connected to keyspace rtlms
✓ RT-LMS backend running on http://localhost:5000
```

**Leave this terminal open.** Open a **second** PowerShell terminal for Step 3.

### Step 3 — Start the Frontend

```powershell
cd frontend
npm install
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in XXXms

  ➜  Local:   http://localhost:5173/
```

**Open http://localhost:5173 in your browser.**

---

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@rtlms.io` | `admin123` |
| **Operator** | `operator@rtlms.io` | `operator123` |
| **Viewer** | `viewer@rtlms.io` | `viewer123` |

---

## (Optional) Live Log Simulation

To see real-time logs flowing into the dashboard, open a **third** terminal:

```powershell
cd backend
node scripts/logGenerator.js
```

This generates random logs every 2–5 seconds. You'll see them appear live on the Dashboard page via Socket.IO. Press `Ctrl+C` to stop.

---

## Project Structure

```
rtlms/
├── backend/
│   ├── src/
│   │   ├── app.js                  # Express + Socket.IO entry point
│   │   ├── config/cassandra.js     # Cassandra DB client
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js   # JWT verification
│   │   │   └── roleMiddleware.js   # RBAC enforcement
│   │   ├── routes/
│   │   │   ├── auth.js             # Login + /me
│   │   │   ├── logs.js             # Log CRUD + ingestion
│   │   │   ├── servers.js          # Server management
│   │   │   ├── applications.js     # Application management
│   │   │   ├── alerts.js           # Alert management + resolve
│   │   │   ├── audit.js            # Audit trail (admin only)
│   │   │   └── stats.js            # Dashboard aggregation
│   │   └── sockets/logStream.js    # Socket.IO real-time push
│   ├── scripts/
│   │   ├── schema.cql              # Full Cassandra schema
│   │   ├── seed.js                 # Database seeder
│   │   └── logGenerator.js         # Continuous log simulator
│   ├── .env                        # Environment config
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── api/axios.js            # Axios instance with JWT interceptors
    │   ├── context/AuthContext.jsx  # Auth state management
    │   ├── hooks/useSocket.js      # Socket.IO React hook
    │   ├── components/             # Reusable UI components
    │   ├── pages/                  # All page views
    │   ├── App.jsx                 # Route definitions
    │   └── main.jsx                # React entry point
    ├── index.html
    ├── tailwind.config.js
    └── package.json
```

---

## API Endpoints

| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| POST | `/api/auth/login` | No | Any | Login, returns JWT |
| GET | `/api/auth/me` | Yes | Any | Current user info |
| GET | `/api/logs/by-server/:id` | Yes | Any | Logs for a server |
| GET | `/api/logs/by-app/:id` | Yes | Any | Logs for an app |
| GET | `/api/logs/by-severity/:sev` | Yes | Any | Logs by severity |
| POST | `/api/logs` | Yes | ADMIN, OPERATOR | Ingest a new log |
| GET | `/api/servers` | Yes | Any | List all servers |
| POST | `/api/servers` | Yes | ADMIN | Create server |
| GET | `/api/applications` | Yes | Any | List all apps |
| POST | `/api/applications` | Yes | ADMIN | Create app |
| GET | `/api/alerts/open` | Yes | Any | Open alerts |
| GET | `/api/alerts/resolved` | Yes | Any | Resolved alerts |
| PATCH | `/api/alerts/:id/resolve` | Yes | ADMIN, OPERATOR | Resolve an alert |
| GET | `/api/audit/by-user/:id` | Yes | ADMIN | User audit trail |
| GET | `/api/audit/users` | Yes | ADMIN | List all users |
| GET | `/api/stats/dashboard` | Yes | Any | Aggregate stats |

---

## RBAC (Role-Based Access Control)

| Feature | ADMIN | OPERATOR | VIEWER |
|---------|-------|----------|--------|
| View Dashboard, Logs, Alerts | ✅ | ✅ | ✅ |
| Resolve Alerts | ✅ | ✅ | ❌ |
| Create Server/App | ✅ | ❌ | ❌ |
| View Audit Page | ✅ | ❌ | ❌ |

---

## Cassandra Schema

The database follows Cassandra's **query-first** design principle — one table per access pattern.

| Table | Partition Key | Clustering | Purpose |
|-------|--------------|------------|---------|
| `users` | `user_id` | — | User lookup by ID |
| `users_by_email` | `email` | — | Login lookup |
| `servers` | `server_id` | — | Server registry |
| `applications` | `app_id` | — | App registry |
| `logs_by_server` | `server_id` | `timestamp DESC, log_id` | Logs per server |
| `logs_by_app` | `app_id` | `timestamp DESC, log_id` | Logs per app |
| `logs_by_severity` | `severity` | `timestamp DESC, log_id` | Logs by severity |
| `alerts_by_log` | `log_id` | `alert_id` | Alerts per log |
| `alerts_by_status` | `status` | `created_at DESC, alert_id` | Open/resolved alerts |
| `audit_by_user` | `user_id` | `timestamp DESC, audit_id` | Audit trail |

---

## Troubleshooting

### Cassandra won't start
```powershell
# Check Docker is running first
docker ps

# If container exists but stopped:
docker start rtlms-cassandra

# If fresh start needed:
docker rm -f rtlms-cassandra
docker run -d --name rtlms-cassandra -p 9042:9042 cassandra:4.1
# Wait 60 seconds before seeding
```

### "Cassandra connection failed" on backend start
Cassandra takes 30-60 seconds to be ready after container start. Wait and retry.

### Schema load fails with "Connection refused"
```powershell
# Cassandra isn't ready yet. Check status:
docker logs rtlms-cassandra --tail 20
# Look for "Starting listening for CQL clients" — then it's ready
```

### Frontend shows "Network Error"
Make sure the backend is running on port 5000. Check the terminal where you ran `npm start`.

### Port already in use
```powershell
# Find what's using port 5000:
netstat -ano | findstr :5000
# Kill the process:
taskkill /PID <PID_NUMBER> /F
```

---

## Stopping Everything

```powershell
# Stop frontend: Ctrl+C in the frontend terminal
# Stop backend: Ctrl+C in the backend terminal
# Stop Cassandra:
docker stop rtlms-cassandra

# To restart Cassandra later:
docker start rtlms-cassandra
```

## Resetting the Database

```powershell
docker exec -i rtlms-cassandra cqlsh -e "DROP KEYSPACE IF EXISTS rtlms"
docker exec -i rtlms-cassandra cqlsh < backend/scripts/schema.cql
cd backend && node scripts/seed.js
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, TailwindCSS 3, Recharts, Lucide Icons |
| Backend | Node.js 18, Express 4, Socket.IO 4 |
| Database | Apache Cassandra 4.1 (Docker) |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Real-time | Socket.IO (WebSocket) |
