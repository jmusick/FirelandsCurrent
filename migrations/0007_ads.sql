-- Ads sold to business clients. An ad belongs to one business; deleting the business deletes its ads.
--   status: draft (not shown), active (shown within its dates), paused (held by staff).
--   placements / sections: JSON arrays of placement keys and news sections; [] means everywhere.
--   starts_on / ends_on: inclusive dates (YYYY-MM-DD, Eastern time); NULL means open-ended.
--   impressions / clicks: lifetime totals, kept alongside ad_stats so serving can check the cap cheaply.
--   terms: price and sales terms, for staff only.
CREATE TABLE ads (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused')),
  headline TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  cta TEXT NOT NULL,
  href TEXT NOT NULL,
  theme_bg TEXT NOT NULL,
  theme_fg TEXT NOT NULL,
  theme_accent TEXT NOT NULL,
  placements TEXT NOT NULL DEFAULT '[]',
  sections TEXT NOT NULL DEFAULT '[]',
  weight INTEGER NOT NULL DEFAULT 5 CHECK (weight BETWEEN 1 AND 10),
  starts_on TEXT,
  ends_on TEXT,
  impression_cap INTEGER,
  terms TEXT,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX ads_business_idx ON ads(business_id);
CREATE INDEX ads_status_idx ON ads(status);

-- Uploaded banner images, one per size. Files live in the MEDIA R2 bucket under object_key.
CREATE TABLE ad_images (
  ad_id TEXT NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  size TEXT NOT NULL CHECK (size IN ('leaderboard', 'mobile', 'rectangle', 'billboard')),
  object_key TEXT NOT NULL,
  content_type TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (ad_id, size)
);

-- Viewable impressions and clicks per ad, per day (Eastern), per placement.
CREATE TABLE ad_stats (
  ad_id TEXT NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  placement TEXT NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ad_id, day, placement)
);

CREATE INDEX ad_stats_day_idx ON ad_stats(day);

-- Each tracking token counts once. Rows older than a day are cleared as new events arrive.
CREATE TABLE ad_event_nonces (
  nonce TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);

CREATE INDEX ad_event_nonces_created_idx ON ad_event_nonces(created_at);

-- Audit entries about an ad also carry its business, so they show on the business's history too.
ALTER TABLE admin_audit_log ADD COLUMN target_ad_id TEXT;
CREATE INDEX admin_audit_log_ad_idx ON admin_audit_log(target_ad_id, created_at DESC);
