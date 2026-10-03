CREATE TABLE facebook_posts (
  article_id TEXT PRIMARY KEY REFERENCES news_articles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('review', 'pending', 'posting', 'posted', 'failed', 'uncertain')),
  page_id TEXT,
  post_id TEXT UNIQUE,
  article_url TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL,
  claim_id TEXT,
  started_at INTEGER,
  posted_at INTEGER,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX facebook_posts_due_idx ON facebook_posts(status, next_attempt_at);

-- The archive may already have been shared by hand. Editors review it before backfilling.
INSERT INTO facebook_posts (article_id, status, next_attempt_at, created_at, updated_at)
SELECT id, 'review', unixepoch() * 1000, unixepoch() * 1000, unixepoch() * 1000
FROM news_articles WHERE status = 'published';

-- Every publishing path, including direct imports, participates in the same outbox.
CREATE TRIGGER news_facebook_insert AFTER INSERT ON news_articles
WHEN NEW.status = 'published'
BEGIN
  INSERT OR IGNORE INTO facebook_posts (article_id, status, next_attempt_at, created_at, updated_at)
  VALUES (NEW.id, 'pending', unixepoch() * 1000, unixepoch() * 1000, unixepoch() * 1000);
END;

CREATE TRIGGER news_facebook_publish AFTER UPDATE OF status ON news_articles
WHEN NEW.status = 'published'
BEGIN
  INSERT OR IGNORE INTO facebook_posts (article_id, status, next_attempt_at, created_at, updated_at)
  VALUES (NEW.id, 'pending', unixepoch() * 1000, unixepoch() * 1000, unixepoch() * 1000);
END;

CREATE TABLE facebook_publisher_health (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_run_at INTEGER,
  last_success_at INTEGER,
  last_error TEXT
);
INSERT INTO facebook_publisher_health (id) VALUES (1);
