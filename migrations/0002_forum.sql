CREATE TABLE forum_threads (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_activity_at INTEGER NOT NULL
);

CREATE INDEX forum_threads_status_activity_idx ON forum_threads(status, last_activity_at DESC);
CREATE INDEX forum_threads_author_created_idx ON forum_threads(author_id, created_at DESC);

CREATE TABLE forum_replies (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX forum_replies_thread_created_idx ON forum_replies(thread_id, created_at);
CREATE INDEX forum_replies_author_created_idx ON forum_replies(author_id, created_at DESC);

CREATE TABLE forum_reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  thread_id TEXT REFERENCES forum_threads(id) ON DELETE CASCADE,
  reply_id TEXT REFERENCES forum_replies(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'dismissed', 'resolved')),
  created_at INTEGER NOT NULL,
  resolved_at INTEGER,
  CHECK ((thread_id IS NOT NULL AND reply_id IS NULL) OR (thread_id IS NULL AND reply_id IS NOT NULL))
);

CREATE INDEX forum_reports_status_created_idx ON forum_reports(status, created_at DESC);
CREATE UNIQUE INDEX forum_reports_thread_once_idx ON forum_reports(reporter_id, thread_id) WHERE thread_id IS NOT NULL AND status = 'open';
CREATE UNIQUE INDEX forum_reports_reply_once_idx ON forum_reports(reporter_id, reply_id) WHERE reply_id IS NOT NULL AND status = 'open';

CREATE TABLE forum_moderators (
  user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);
