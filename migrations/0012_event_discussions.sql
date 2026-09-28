-- Every published (or cancelled) event gets a Talk of the Town discussion, like stories do (see 0010).
-- The discussion is started by the "newsroom" account and takes its title and summary from the event.
ALTER TABLE forum_threads ADD COLUMN event_id TEXT REFERENCES events(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX forum_threads_event_idx ON forum_threads(event_id) WHERE event_id IS NOT NULL;

INSERT INTO forum_threads (id, author_id, title, body, event_id, created_at, updated_at, last_activity_at)
SELECT lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(6))),
       'newsroom', e.title, e.summary, e.id, e.created_at, e.created_at, e.created_at
FROM events e
WHERE e.status != 'draft';
