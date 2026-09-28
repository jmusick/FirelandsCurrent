-- The story an editor pins as the large lead on the front page. Only one story is featured at a time;
-- saving a story as featured clears the flag on the others. With none featured, the newest story leads.
ALTER TABLE news_articles ADD COLUMN featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1));
