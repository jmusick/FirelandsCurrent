# Changelog

All notable changes to Firelands Current are recorded here. The site follows [Semantic Versioning](https://semver.org/): the version lives in `package.json` and is shown in the site footer.

## [1.16.2] - 2026-10-01

### Added

- Events have an optional Hours field for events whose hours differ by day; the event page shows it in full and listings say "Hours vary" instead of "All day"

## [1.16.1] - 2026-10-01

### Changed

- The news sources guide adds the Erie County Health Department, City of Huron, Erie County Board of Elections, and the city and police Facebook pages, with notes on reading each one, plus guidance on confirming events found through Facebook

## [1.16.0] - 2026-09-29

### Changed

- New visual design across the site: a dark masthead with a narrow wordmark and today's date, a cool light page, narrow Archivo headlines, and Newsreader for story text, summaries and comments
- Story and event labels lead with the community, followed by the section or category, in sentence case
- The homepage's Coming up block shows each event under a large date number in a full-width tinted band; the events calendar marks each day the same way, with today highlighted
- Talk of the Town lists each discussion with its comment count first
- News, events and Talk of the Town filters are tabs that scroll sideways on phones; the current section is underlined in the main navigation
- The footer is reorganized into a link grid; the Home navigation link is gone (the wordmark goes home)
- The admin panel and business dashboards use the same colors and type as the public site, with sentence-case labels
- The built-in "Advertise with us" ad uses the new colors

### Fixed

- Banner upload fields on the ad form no longer overlap when library image names are long

## [1.15.0] - 2026-09-28

### Added

- News tips are saved for editors to review, mark reviewed, decline, or turn into a story; submitters can request a byline, and signed-in tips link to the submitter's account
- Submit news is now a main navigation item

## [1.14.1] - 2026-09-28

### Changed

- Standardized admin inputs, selects, textareas, and buttons with consistent sizing and focus styling

## [1.14.0] - 2026-09-28

### Added

- The homepage has a block for each news section (Local News, Government, Business, Schools, Community, Outdoors) showing its three newest headlines, with a link to the full section. Sections with no stories are hidden

### Changed

- The homepage rail ad now sits under the lead story, so the lead and the newest-stories list end at about the same height

## [1.13.0] - 2026-09-28

### Added

- Share buttons (Facebook, X, LinkedIn, Reddit, email, copy link) above and below every story
- RSS feed at `/rss.xml` (with `/feed` and `/rss` redirects) and JSON Feed at `/feed.json`, each optionally filtered with `?section=`; pages advertise them for feed-reader auto-discovery and the footer links the RSS feed. Opened in a browser, the RSS feed shows as a readable page

## [1.12.0] - 2026-09-28

### Added

- Facebook and X links in the site footer

## [1.11.0] - 2026-09-28

### Added

- Terms of Service at `/terms`, linked from the site footer and the registration page. It covers accounts, community posting and moderation, advertising, and the limits of our liability

## [1.10.3] - 2026-09-28

### Added

- The Privacy Policy has a "How to delete your data" section, including steps for people who signed in with Facebook, Google, Apple, or Microsoft

### Fixed

- The account page names sign-in methods properly ("Facebook") instead of showing the raw provider id

## [1.10.2] - 2026-09-28

### Fixed

- Linking Facebook from the account page now works. Facebook never confirms email addresses, so the link was refused without any message
- A failed sign-in method link now shows an explanation on the account page instead of disappearing

## [1.10.1] - 2026-09-28

### Added

- Sign-in and sign-up buttons for Google, Facebook, Apple, and Microsoft now show each provider's logo

### Changed

- A failed social sign-in returns to the sign-in page with a plain explanation instead of a raw error page. When the email address already belongs to an account, it says to sign in first and link the provider from the account page

## [1.10.0] - 2026-09-28

### Added

- Email verification: new email/password accounts get a confirmation link by email and cannot sign in until they use it. Signing in before confirming sends a fresh link
- Password reset by email (`/forgot-password` and `/reset-password`)
- Cloudflare Turnstile on sign-up, password-reset, and resend requests
- Microsoft sign-in, and Google, Facebook, Apple, and Microsoft buttons on the registration page

### Changed

- Existing accounts and accounts created by administrators are marked verified (migration `0014`), so nobody is locked out

## [1.9.0] - 2026-09-28

### Added

- Editors can feature a story on the front page with a **Feature on the front page** checkbox in the story editor. The featured story is the large lead until another story is featured, and only one story is featured at a time. With none featured, the newest story still leads. The admin story list marks the featured story
- Five new Sandusky stories from City of Sandusky announcements, each linking to its source

### Changed

- The large front-page story has a **Read the full story** link under its byline

### Database

- Migration `0013_featured_story.sql` adds a `featured` flag to `news_articles`. Apply it before deploying

## [1.8.0] - 2026-09-28

### Added

- A Submit news form at `/submit-news` for tips, story ideas, and announcements, emailed to the newsroom at news@firelandscurrent.com
- A Contact form at `/contact` for general questions and feedback, emailed to contact@firelandscurrent.com
- Both forms are open to everyone, protected by Cloudflare Turnstile, and linked from the footer and the sitemap. Replies go straight to the sender

### Changed

- The privacy policy describes the contact forms and Turnstile

## [1.7.0] - 2026-09-28

### Added

- Every news story now has a Talk of the Town discussion, created automatically when the story is published (and for stories already published). Readers can comment at the bottom of the story, and the same comments appear on the discussion's page in Talk of the Town
- Upvotes and downvotes on discussions and comments, with comments sortable by Top, Newest, or Oldest
- Every event now has a Talk of the Town discussion too, created when it is published or cancelled (and for existing events), with comments at the bottom of the event page
- Talk of the Town filters: All, Stories, Events, and Community discussions
- Nested replies: readers can reply to any comment, up to five levels deep, and new replies land in place. A hidden comment shows as removed while replies to it remain
- Story discussions are marked in the Talk of the Town list and show points and comment counts

### Changed

- Discussion pages now open on the first page of top comments instead of the last page of replies, and page through 50 top-level comments at a time
- The privacy policy mentions comments on stories and votes

## [1.6.1] - 2026-09-28

### Fixed

- The footer now stays at the bottom of the window on short pages instead of floating partway up

## [1.6.0] - 2026-09-27

### Added

- Local events calendar at `/events`: upcoming events grouped by day, filters by category and community, and past events
- Event pages with date, time, venue and map link, cost, organizer, an optional image and details, and an **Add to calendar** download (`.ics`)
- schema.org `Event` data on event pages, so search engines can show events in their own listings
- *Coming up* on the front page, showing the next four events, and an Events link in the site navigation
- Events admin at `/admin/events` for administrators and editors: create, edit, cancel, and duplicate events for another date; administrators can delete
- Upcoming events on the admin dashboard, and published events in the sitemap
- D1 migration 0009, which adds the `events` table
- Demo events in `scripts/seed-demo.sql`

### Changed

- Media library images used by events count as in use and can't be deleted; an image's page lists those events

## [1.5.0] - 2026-09-27

### Added

- Privacy Policy at `/privacy`, describing what the site collects and shares: accounts, sign-in sessions, Talk of the Town posts, Google Analytics, Cloudflare Web Analytics, hosting logs, and ad counts. It's linked from the footer and the registration page and listed in the sitemap
- Footer credit: Firelands Current is owned and operated by Stone Dragon Media, LLC, linked to stonedragonmedia.com
- `LICENSE.md`: the source is published for transparency and security review; commercial use, public deployment, and redistribution need written permission from Stone Dragon Media, LLC

## [1.4.0] - 2026-09-27

### Added

- Google Analytics (GA4) on every page outside the admin panel, using the measurement ID in `GA_MEASUREMENT_ID` in `wrangler.jsonc`; the tag loads only in production builds, so local development isn't counted

## [1.3.0] - 2026-09-27

### Added

- XML sitemap at `/sitemap.xml` for search engines such as Google Search Console: the front page, news and its sections, Talk of the Town, the advertising page, every published story, and every visible discussion, with last-updated dates for stories and discussions
- `/robots.txt` pointing crawlers to the sitemap and keeping them out of the admin panel, account and business dashboard pages, the API, and ad click links

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
