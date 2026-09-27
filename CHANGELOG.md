# Changelog

All notable changes to Firelands Current are recorded here. The site follows [Semantic Versioning](https://semver.org/): the version lives in `package.json` and is shown in the site footer.

## [1.0.0] - 2026-09-27

First versioned release.

### Added

- Reader accounts with Better Auth: email/password, optional Google, Facebook, and Apple sign-in, and linked sign-in methods
- Talk of the Town discussions with threads, replies, member reports, and rate limits
- News section pages, story pages, and the latest stories on the homepage, with Markdown story text
- Admin panel at `/admin` gated by staff roles (admin, editor, moderator): dashboard, News editor, Talk of the Town moderation, users, businesses, and ads
- User management: suspensions, session sign-out, password resets by staff, account creation and deletion, and an audit log
- Businesses with members, owner/member roles, and archiving
- Ads: placements, targeting, schedules, impression caps, signed impression and click tracking, R2-hosted banner images, and a read-only business dashboard at `/business`
- D1 migrations 0001–0007 and local demo seed scripts
- Canonical-domain redirect from `www.firelandscurrent.com`

[1.0.0]: https://github.com/jmusick/FirelandsCurrent/releases/tag/v1.0.0
