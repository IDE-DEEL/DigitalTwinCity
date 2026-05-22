#!/usr/bin/env bash
set -euo pipefail

require_env() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "Missing required environment variable: ${name}" >&2
    exit 1
  fi
}

require_env POSTGRES_USER
require_env POSTGRES_DB
require_env DT_PG_DEVELOPER_USER
require_env DT_PG_DEVELOPER_PASS
require_env DT_PG_MONITOR_USER
require_env DT_PG_MONITOR_PASS

echo "=================================================="
echo " Initializing Database Roles & Groups (ACL)"
echo " Database: $POSTGRES_DB"
echo "=================================================="

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  -v app_db="$POSTGRES_DB" \
  -v developer_user="$DT_PG_DEVELOPER_USER" \
  -v developer_pass="$DT_PG_DEVELOPER_PASS" \
  -v monitor_user="$DT_PG_MONITOR_USER" \
  -v monitor_pass="$DT_PG_MONITOR_PASS" \
  <<'EOSQL'

-- Connect to the application database
\connect :app_db

-- ==========================================
-- 1. READ-ONLY ROLE
-- ==========================================
DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'readonly_role') THEN CREATE ROLE readonly_role; END IF; END $$;

GRANT CONNECT ON DATABASE :"app_db" TO readonly_role;
GRANT USAGE ON SCHEMA public TO readonly_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly_role;

-- ==========================================
-- 2. SENSOR ROLE (For MQTT/IoT data insertion)
-- ==========================================
DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'sensor_role') THEN CREATE ROLE sensor_role; END IF; END $$;

GRANT CONNECT ON DATABASE :"app_db" TO sensor_role;
GRANT USAGE ON SCHEMA public TO sensor_role;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA public TO sensor_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT ON TABLES TO sensor_role;

GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO sensor_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO sensor_role;

-- ==========================================
-- 3. BACKEND ROLE (Full CRUD operations)
-- ==========================================
DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'backend_role') THEN CREATE ROLE backend_role; END IF; END $$;

GRANT CONNECT ON DATABASE :"app_db" TO backend_role;
GRANT USAGE ON SCHEMA public TO backend_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO backend_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO backend_role;

GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO backend_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO backend_role;

-- ==========================================
-- 4. DEVELOPER ROLE (Schema Admin - Create/Alter tables)
-- ==========================================
DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'developer_role') THEN CREATE ROLE developer_role; END IF; END $$;

GRANT CONNECT ON DATABASE :"app_db" TO developer_role;
GRANT USAGE, CREATE ON SCHEMA public TO developer_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO developer_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO developer_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO developer_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO developer_role;

-- ==========================================
-- 5. MONITORING ROLE (PostgreSQL exporter)
-- ==========================================
DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'monitoring_role') THEN CREATE ROLE monitoring_role; END IF; END $$;

GRANT CONNECT ON DATABASE :"app_db" TO monitoring_role;
GRANT USAGE ON SCHEMA public TO monitoring_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitoring_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO monitoring_role;
GRANT pg_monitor TO monitoring_role;

-- ==========================================
-- 6. LOGIN USERS
-- ==========================================
SELECT format('CREATE ROLE %I WITH LOGIN PASSWORD %L', :'developer_user', :'developer_pass')
WHERE NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = :'developer_user') \gexec
SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'developer_user', :'developer_pass') \gexec
GRANT developer_role TO :"developer_user";

SELECT format('CREATE ROLE %I WITH LOGIN PASSWORD %L', :'monitor_user', :'monitor_pass')
WHERE NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = :'monitor_user') \gexec
SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'monitor_user', :'monitor_pass') \gexec
GRANT monitoring_role TO :"monitor_user";

-- Objects created by the developer/backend login should still be usable by
-- the operational roles.
ALTER DEFAULT PRIVILEGES FOR ROLE :"developer_user" IN SCHEMA public GRANT SELECT ON TABLES TO readonly_role;
ALTER DEFAULT PRIVILEGES FOR ROLE :"developer_user" IN SCHEMA public GRANT SELECT ON TABLES TO monitoring_role;
ALTER DEFAULT PRIVILEGES FOR ROLE :"developer_user" IN SCHEMA public GRANT SELECT, INSERT ON TABLES TO sensor_role;
ALTER DEFAULT PRIVILEGES FOR ROLE :"developer_user" IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO backend_role;
ALTER DEFAULT PRIVILEGES FOR ROLE :"developer_user" IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO sensor_role;
ALTER DEFAULT PRIVILEGES FOR ROLE :"developer_user" IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO backend_role;

EOSQL

echo "Database groups and login users configured successfully."
