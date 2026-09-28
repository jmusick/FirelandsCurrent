-- Every published story gets a Talk of the Town discussion (forum_threads.article_id), and threads and replies
-- can be voted up or down. Story discussions are started by the "newsroom" account, which has no sign-in
-- (no account row), so it can't be used to post and the thread survives any staff member's account being deleted.
-- A story's discussion takes its title and summary from the story; the copies in title/body only satisfy NOT NULL.
INSERT OR IGNORE INTO "user" (id, name, email, emailVerified, image, createdAt, updatedAt)
VALUES ('newsroom', 'Firelands Current', 'newsroom@firelandscurrent.com', 1, NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

ALTER TABLE forum_threads ADD COLUMN article_id TEXT REFERENCES news_articles(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX forum_threads_article_idx ON forum_threads(article_id) WHERE article_id IS NOT NULL;

-- value: 1 for an upvote, -1 for a downvote. One row per voter and item; removing a vote deletes the row.
CREATE TABLE forum_thread_votes (
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  value INTEGER NOT NULL CHECK (value IN (1, -1)),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (thread_id, user_id)
);
CREATE INDEX forum_thread_votes_user_idx ON forum_thread_votes(user_id);

CREATE TABLE forum_reply_votes (
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  reply_id TEXT NOT NULL REFERENCES forum_replies(id) ON DELETE CASCADE,
  value INTEGER NOT NULL CHECK (value IN (1, -1)),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (reply_id, user_id)
);
CREATE INDEX forum_reply_votes_user_idx ON forum_reply_votes(user_id);

-- Discussions for stories that are already published.
INSERT INTO forum_threads (id, author_id, title, body, article_id, created_at, updated_at, last_activity_at)
SELECT lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(6))),
       'newsroom', a.headline, a.summary, a.id, a.published_at, a.published_at, a.published_at
FROM news_articles a
WHERE a.status = 'published' AND a.published_at IS NOT NULL;
