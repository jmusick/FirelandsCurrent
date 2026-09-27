-- Local Events calendar, entered by staff. Dates and times are local (Eastern) wall-clock values rather
-- than instants, since that's how events are announced and a 7 p.m. concert stays at 7 p.m. across DST.
--   starts_on / ends_on: YYYY-MM-DD. ends_on is NULL for a single-day event.
--   start_time / end_time: HH:MM, 24-hour. start_time NULL means all day; end_time is optional.
--   description: Markdown, rendered like a story body. image_media_id: optional media library image.
--   status: draft (staff only), published, or cancelled (still listed, marked as cancelled).
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('community', 'arts', 'music', 'family', 'food', 'sports', 'outdoors', 'meetings', 'classes')),
  starts_on TEXT NOT NULL,
  start_time TEXT,
  ends_on TEXT,
  end_time TEXT,
  venue TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  community TEXT NOT NULL,
  organizer TEXT NOT NULL DEFAULT '',
  cost TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '',
  image_media_id TEXT REFERENCES media(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX events_status_starts_idx ON events(status, starts_on);
