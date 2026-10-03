ALTER TABLE events ADD COLUMN performer TEXT NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN performer_type TEXT NOT NULL DEFAULT 'PerformingGroup' CHECK (performer_type IN ('Person', 'PerformingGroup'));
ALTER TABLE events ADD COLUMN ticket_price TEXT NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN ticket_url TEXT NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN ticket_availability TEXT NOT NULL DEFAULT '' CHECK (ticket_availability IN ('', 'InStock', 'SoldOut', 'PreOrder'));
