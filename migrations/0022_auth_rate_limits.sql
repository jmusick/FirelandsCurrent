-- Better Auth request counters shared by every Worker isolate, keyed by client IP and auth path.
-- Rows are short-lived: each counts one fixed window, and the scheduled Worker deletes stale rows.
CREATE TABLE auth_rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);

CREATE INDEX auth_rate_limits_window_start_idx ON auth_rate_limits (window_start);
