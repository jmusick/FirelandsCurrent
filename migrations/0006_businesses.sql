-- Businesses group user accounts: the paper's own team, advertising clients, and others.
-- A user can belong to any number of businesses. Staff roles (staff_roles) stay separate:
-- they control the admin panel, while membership says who someone works for.
CREATE TABLE businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('internal', 'advertiser', 'other')),
  website TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX businesses_name_idx ON businesses(name COLLATE NOCASE);

-- role: owner (the business's main contact, who will manage its members once businesses
-- get a self-service area) or member. title is a free-text job title.
CREATE TABLE business_members (
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  title TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (business_id, user_id)
);

CREATE INDEX business_members_user_idx ON business_members(user_id);

-- Audit entries can now be about a business, a user, or a user's membership in a business.
ALTER TABLE admin_audit_log ADD COLUMN target_business_id TEXT;
CREATE INDEX admin_audit_log_business_idx ON admin_audit_log(target_business_id, created_at DESC);

INSERT INTO businesses (id, name, kind, website, created_at, updated_at)
VALUES ('6f0c2b8e-3d4a-4f7e-9b1c-5a2e8d7f4c10', 'Firelands Current', 'internal', 'https://firelandscurrent.com', unixepoch() * 1000, unixepoch() * 1000);

INSERT INTO business_members (business_id, user_id, role, created_at)
SELECT '6f0c2b8e-3d4a-4f7e-9b1c-5a2e8d7f4c10', user_id, 'member', unixepoch() * 1000 FROM staff_roles;
