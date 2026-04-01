-- RT-LMS: Real-Time Log Management System
-- Apache Cassandra Schema

CREATE KEYSPACE IF NOT EXISTS rtlms
  WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

USE rtlms;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  user_id   UUID PRIMARY KEY,
  name      TEXT,
  role      TEXT,
  email     TEXT,
  password  TEXT
);

-- Users lookup by email (for login)
CREATE TABLE IF NOT EXISTS users_by_email (
  email     TEXT PRIMARY KEY,
  user_id   UUID,
  name      TEXT,
  role      TEXT,
  password  TEXT
);

-- Servers table
CREATE TABLE IF NOT EXISTS servers (
  server_id  UUID PRIMARY KEY,
  hostname   TEXT,
  ip_address TEXT,
  location   TEXT
);

-- Applications table
CREATE TABLE IF NOT EXISTS applications (
  app_id    UUID PRIMARY KEY,
  app_name  TEXT,
  server_id UUID
);

-- Logs by server (primary query pattern: get logs for a server, latest first)
CREATE TABLE IF NOT EXISTS logs_by_server (
  server_id  UUID,
  timestamp  TIMESTAMP,
  log_id     UUID,
  severity   TEXT,
  message    TEXT,
  app_id     UUID,
  PRIMARY KEY ((server_id), timestamp, log_id)
) WITH CLUSTERING ORDER BY (timestamp DESC);

-- Logs by application
CREATE TABLE IF NOT EXISTS logs_by_app (
  app_id     UUID,
  timestamp  TIMESTAMP,
  log_id     UUID,
  severity   TEXT,
  message    TEXT,
  server_id  UUID,
  PRIMARY KEY ((app_id), timestamp, log_id)
) WITH CLUSTERING ORDER BY (timestamp DESC);

-- Logs by severity (for filtering by ERROR, WARN, etc.)
CREATE TABLE IF NOT EXISTS logs_by_severity (
  severity   TEXT,
  timestamp  TIMESTAMP,
  log_id     UUID,
  server_id  UUID,
  app_id     UUID,
  message    TEXT,
  PRIMARY KEY ((severity), timestamp, log_id)
) WITH CLUSTERING ORDER BY (timestamp DESC);

-- Alerts linked to logs
CREATE TABLE IF NOT EXISTS alerts_by_log (
  log_id     UUID,
  alert_id   UUID,
  alert_type TEXT,
  status     TEXT,
  PRIMARY KEY ((log_id), alert_id)
);

-- All active alerts (for dashboard overview)
CREATE TABLE IF NOT EXISTS alerts_by_status (
  status     TEXT,
  created_at TIMESTAMP,
  alert_id   UUID,
  log_id     UUID,
  alert_type TEXT,
  PRIMARY KEY ((status), created_at, alert_id)
) WITH CLUSTERING ORDER BY (created_at DESC);

-- Audit logs per user
CREATE TABLE IF NOT EXISTS audit_by_user (
  user_id   UUID,
  timestamp TIMESTAMP,
  audit_id  UUID,
  action    TEXT,
  PRIMARY KEY ((user_id), timestamp, audit_id)
) WITH CLUSTERING ORDER BY (timestamp DESC);
