-- Replies to replies. parent_id is NULL for a comment made directly on the discussion. If a parent is ever
-- deleted (only when its author's account is), its replies stay and move up to the top level.
ALTER TABLE forum_replies ADD COLUMN parent_id TEXT REFERENCES forum_replies(id) ON DELETE SET NULL;
CREATE INDEX forum_replies_parent_idx ON forum_replies(parent_id);
