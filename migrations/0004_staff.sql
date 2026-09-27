-- Site staff for the admin panel. One role per user:
--   admin     — every admin section
--   editor    — news
--   moderator — Talk of the Town
-- Replaces the forum-only forum_moderators table.
CREATE TABLE staff_roles (
  user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'moderator')),
  created_at INTEGER NOT NULL
);

INSERT INTO staff_roles (user_id, role, created_at)
SELECT user_id, 'moderator', created_at FROM forum_moderators;

DROP TABLE forum_moderators;
