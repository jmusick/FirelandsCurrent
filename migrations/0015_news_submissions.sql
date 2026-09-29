CREATE TABLE news_submissions (
  id TEXT PRIMARY KEY,
  submitter_user_id TEXT REFERENCES "user" (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  credit_requested INTEGER NOT NULL DEFAULT 0 CHECK (credit_requested IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'reviewed', 'declined', 'converted')),
  article_id TEXT REFERENCES news_articles (id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX news_submissions_status_created_idx ON news_submissions(status, created_at DESC);
CREATE INDEX news_submissions_user_idx ON news_submissions(submitter_user_id);
