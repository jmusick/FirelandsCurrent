CREATE TABLE news_articles (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  headline TEXT NOT NULL,
  summary TEXT NOT NULL,
  body TEXT NOT NULL,
  section TEXT NOT NULL CHECK (section IN ('local', 'government', 'business', 'schools', 'community', 'outdoors')),
  community TEXT NOT NULL,
  byline TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX news_articles_status_published_idx ON news_articles(status, published_at DESC);
CREATE INDEX news_articles_section_published_idx ON news_articles(section, status, published_at DESC);
