-- TRUNCATE does not fire row-level DELETE triggers, so block it on its own.
CREATE TRIGGER audit_logs_no_truncate
BEFORE TRUNCATE ON audit_logs
FOR EACH STATEMENT
EXECUTE FUNCTION reject_audit_log_mutation();
