ALTER TABLE news_articles ADD COLUMN author_id TEXT REFERENCES "user"(id) ON DELETE SET NULL;
CREATE INDEX news_articles_author_published_idx ON news_articles(author_id, status, published_at DESC);

-- Assign the existing archive to JD without changing story URLs or publication dates.
UPDATE news_articles
SET author_id = (SELECT id FROM "user" WHERE lower(email) = 'jd@orboro.net'), byline = 'JD'
WHERE EXISTS (SELECT 1 FROM "user" WHERE lower(email) = 'jd@orboro.net');
