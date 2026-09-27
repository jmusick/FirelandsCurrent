-- The media library: every uploaded image, whether it runs in a story or an ad. Files live in the
-- MEDIA R2 bucket under object_key; the library owns them, so deleting a story or ad never deletes a file.
--   width / height: the file's real pixel size.
--   alt: describes the image for screen readers. caption: shown under it in stories.
--   credit: who made it, shown with the caption. source: where it came from and the permission to use it (staff only).
CREATE TABLE media (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  bytes INTEGER NOT NULL DEFAULT 0,
  filename TEXT NOT NULL,
  alt TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL DEFAULT '',
  credit TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT '',
  uploaded_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX media_created_idx ON media(created_at DESC);

-- Existing ad banners join the library. ad_images recorded the banner's display size rather than the
-- file's pixel size, and not its byte size, so those carry over as the closest values available.
INSERT INTO media (id, object_key, content_type, width, height, bytes, filename, credit, source, created_at, updated_at)
SELECT lower(hex(randomblob(16))), i.object_key, i.content_type, i.width, i.height, 0,
  replace(i.object_key, rtrim(i.object_key, replace(i.object_key, '/', '')), ''),
  'Supplied by ' || b.name, 'Advertiser creative', i.created_at, i.created_at
FROM ad_images i JOIN ads a ON a.id = i.ad_id JOIN businesses b ON b.id = a.business_id;

ALTER TABLE ad_images ADD COLUMN media_id TEXT REFERENCES media(id);
UPDATE ad_images SET media_id = (SELECT m.id FROM media m WHERE m.object_key = ad_images.object_key);

ALTER TABLE news_articles ADD COLUMN lead_media_id TEXT REFERENCES media(id) ON DELETE SET NULL;

ALTER TABLE admin_audit_log ADD COLUMN target_media_id TEXT;
CREATE INDEX admin_audit_log_media_idx ON admin_audit_log(target_media_id, created_at DESC);
