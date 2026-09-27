# Changelog

All notable changes to Firelands Current are recorded here. The site follows [Semantic Versioning](https://semver.org/): the version lives in `package.json` and is shown in the site footer.

## [1.2.0] - 2026-09-27

### Added

- Media library at `/admin/media` for administrators and editors: every story and ad image, with a required credit, alt text, caption, and a staff-only source and permission note
- Upload images from the library or from the story editor's picture button; dragging or pasting an image into a story opens the same credited upload form
- Photos are resized to at most 2,000 pixels and re-saved in the browser before upload, which removes location data from phone photos
- Lead images for stories, shown above the story, on the front page, in the news list, and as the social media preview image
- Social media preview tags (Open Graph and Twitter cards) on every page
- Each image's page lists the stories and ads that use it; images in use can't be deleted
- Media uploads, edits, and deletions appear in the admin audit log
- D1 migration 0008, which moves existing ad banners into the library

### Changed

- Story images on a line of their own show as figures with caption and credit; stories only show library images, and images linked from other sites show as their alt text
- Ad banner sizes take a new upload credited to the advertiser, or an existing library image of the right size

### Fixed

- Readers stay signed in while they keep visiting: the refreshed session cookie now reaches the browser, instead of every sign-in expiring seven days after it began

## [1.1.0] - 2026-09-27

### Added

- Lucide icons throughout the admin panel (`@lucide/astro`, server-rendered inline SVG): sidebar sections, action buttons, card headings, dashboard and ad stat tiles, back links, and pagination
- Every admin section requires a sidebar icon, enforced by the type checker

### Changed

- Admin buttons align an icon and label side by side
- The "View site" link in the admin header stays on one line on phones

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

[1.1.0]: https://github.com/jmusick/FirelandsCurrent/releases/tag/v1.1.0
[1.0.0]: https://github.com/jmusick/FirelandsCurrent/releases/tag/v1.0.0
