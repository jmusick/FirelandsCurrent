CREATE TABLE corrections (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('news', 'event')),
  article_id TEXT REFERENCES news_articles (id) ON DELETE SET NULL,
  event_id TEXT REFERENCES events (id) ON DELETE SET NULL,
  -- Snapshots, so the queue still reads sensibly if the story or event is later renamed or deleted.
  item_title TEXT NOT NULL,
  item_slug TEXT NOT NULL,
  submitter_user_id TEXT REFERENCES "user" (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  details TEXT NOT NULL,
  suggested_fix TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'corrected', 'declined')),
  resolution_note TEXT NOT NULL DEFAULT '',
  resolved_by TEXT REFERENCES "user" (id) ON DELETE SET NULL,
  resolved_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX corrections_status_created_idx ON corrections(status, created_at DESC);
CREATE INDEX corrections_article_idx ON corrections(article_id, status);
CREATE INDEX corrections_event_idx ON corrections(event_id, status);
