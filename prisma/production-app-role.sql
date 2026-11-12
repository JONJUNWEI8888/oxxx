-- Least-privilege role for the running admin API.
-- Run as the database OWNER after `prisma migrate deploy`.
-- Migrations use the owner (DATABASE_MIGRATION_URL). The API uses oxxx_app (DATABASE_URL).
--
-- Replace CHANGE_ME with the application password, then:
--   psql "$DATABASE_MIGRATION_URL" -f prisma/production-app-role.sql
-- If oxxx_app already exists, skip CREATE ROLE and run ALTER ROLE instead.
--
-- oxxx_app does not own audit_logs, so it cannot DROP or DISABLE triggers.
-- It may only INSERT and SELECT that table.

CREATE ROLE oxxx_app LOGIN PASSWORD 'CHANGE_ME';
-- ALTER ROLE oxxx_app WITH LOGIN PASSWORD 'CHANGE_ME';

DO $body$
DECLARE
  db name := current_database();
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO oxxx_app', db);
END
$body$;

GRANT USAGE ON SCHEMA public TO oxxx_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO oxxx_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO oxxx_app;

REVOKE ALL ON TABLE audit_logs FROM oxxx_app;
GRANT SELECT, INSERT ON TABLE audit_logs TO oxxx_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO oxxx_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO oxxx_app;
