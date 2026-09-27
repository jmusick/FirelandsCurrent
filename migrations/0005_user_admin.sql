-- User management in the admin panel.

-- A suspended user can't sign in, and existing sessions are revoked when the suspension starts.
-- expires_at NULL means the suspension lasts until an admin lifts it.
CREATE TABLE user_suspensions (
  user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  suspended_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER
);

-- Every change an admin makes to a user account. No foreign key on the target so the
-- record outlives a deleted account; names are copied in for the same reason.
CREATE TABLE admin_audit_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  target_user_id TEXT,
  target_label TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX admin_audit_log_target_idx ON admin_audit_log(target_user_id, created_at DESC);
CREATE INDEX admin_audit_log_created_idx ON admin_audit_log(created_at DESC);
