# Firelands Current

An independent local newspaper for Sandusky, Ohio and the Firelands, built with Astro on Cloudflare Workers and live at [firelandscurrent.com](https://firelandscurrent.com). It publishes news and a local events calendar, hosts reader discussions in **Talk of the Town**, and sells display ads to local businesses.

## What works now

- Email/password registration, sign-in, sign-out, display-name changes, verified email-address changes, password changes, and password reset by email through Better Auth. New email/password accounts must confirm their address from a link we email before they can sign in; sign-up, reset, and resend requests are protected by Cloudflare Turnstile
- Public profiles at `/profile/<user.id>` group published articles, visible forum topics, and visible replies in paginated tabs. Story bylines and forum names link to profiles; email addresses and account details remain private. Display-name changes appear on linked articles and posts. Hidden discussions, hidden replies, unpublished stories, and draft events stay out of profile activity.
- A stable local `user.id`, with additional OAuth sign-in methods linked through the `account` table
- Optional Google, Facebook, Apple, and Microsoft sign-in and sign-up; buttons appear on `/sign-in` and `/register` only when credentials are configured
- Publicly readable Talk of the Town discussions; signed-in readers can start threads and reply
- Every published story and every published or cancelled event automatically gets a Talk of the Town discussion (created when it is first published, and for existing ones by migrations `0010` and `0012`). Talk of the Town can be filtered to Stories, Events, or Community (reader-started) discussions with `/talk?type=story|event|community`. Its comments appear at the bottom of the story and on the discussion's own page; they are the same comments. The discussion is started by a sign-in-less `newsroom` account, takes its title and summary from the story, and is hidden while the story is unpublished or the event is a draft or a moderator hides it. Deleting a story or event deletes its discussion
- Upvotes and downvotes on discussions and comments (click again to take a vote back), and comments sorted by Top, Newest, or Oldest. Comments are nested: readers reply to any comment, up to five levels deep, and each page shows 50 top-level comments with all their replies. A comment a moderator hides stays as "[removed by a moderator]" while visible replies sit below it
- Rate limits on threads, replies, and reports
- Member reports, reviewed in the admin panel with hide/dismiss actions
- News: section pages, story pages, and the latest stories on the homepage; story text is Markdown, with lead images and captioned photos from the media library. The coverage area, trusted sources, and editorial rules are in [docs/news-sources.md](docs/news-sources.md)
- Local events calendar at `/events`, with an upcoming-events block on the front page, event pages with an add-to-calendar file, and search-engine event data
- Media library for story, ad and event images, stored in R2, with credits, usage tracking and social-preview images
- Share buttons (Facebook, X, LinkedIn, Reddit, email, copy link) above and below every story; they are plain links, so no third-party scripts load. The footer links the paper's Facebook and X accounts
- Facebook Page delivery through a persistent posting queue, with cron checks, bounded retries for rate limits, and an editor dashboard at `/admin/facebook`. Activation requires the production migration, a Page access token secret, and the posting switch described below
- RSS feed at `/rss.xml` (also `/feed`, `/rss`) and a JSON Feed at `/feed.json`, each with the 30 newest stories (summary, lead image, byline, section). Add `?section=local` (or any section key) for one section. Every page advertises the feed for auto-discovery, and the footer links it
- `/sitemap.xml` listing the main pages, news sections, published stories, published and cancelled events, and visible discussions, and a `/robots.txt` that points to it and keeps crawlers out of admin, account, business, ad-click, and API routes
- `/news-sitemap.xml` listing up to 1,000 newest published stories from the last 48 hours with Google News publication metadata, original publication dates, and headlines. It refreshes after at most five minutes of caching; older stories remain in the ordinary sitemap. Both sitemaps are advertised in `/robots.txt`. Submit the news sitemap in Google Search Console after deploying it; an empty news sitemap is expected when no stories were published in the last two days
- Submit news (`/submit-news`) and Contact (`/contact`) forms, open to anyone. Submit news is linked in the main navigation and footer, Contact in the footer. News tips are stored in D1 and emailed to `news@firelandscurrent.com`; signed-in submitters are linked to their account, and submitters can request a byline if their tip becomes a story. Editors review tips at `/admin/submissions` and can mark them reviewed, decline them, or convert them into a story. Contact messages are emailed to `contact@firelandscurrent.com` and are not stored in D1. Both forms use the `EMAIL` Cloudflare Email Sending binding, with the sender in Reply-To. Cloudflare Turnstile (`TURNSTILE_SITE_KEY` var, `TURNSTILE_SECRET_KEY` secret) and a hidden honeypot field filter bots
- Google Analytics (GA4) on every page outside the admin panel, with the measurement ID set as `GA_MEASUREMENT_ID` in `wrangler.jsonc`; the tag loads only in production builds
- Terms of Service at `/terms`, linked from the footer and the registration page. It covers accounts, community posting and moderation, and advertising, and names Ohio law; have counsel review it before relying on it
- Privacy Policy at `/privacy`, linked from the footer and the registration page. It describes exactly what the site collects (accounts, sessions, posts, Google Analytics, Cloudflare Web Analytics, ad counts), so update it whenever that changes
- Admin panel at `/admin` (dashboard, News editor, news tips, events calendar, media library, Talk of the Town moderation, users, businesses, ads) gated by staff roles
- On phones the main navigation folds into a Menu button in the masthead

## Local setup

Requires Node.js 24 or later.

1. Run `npm install`.
2. Copy `.dev.vars.example` to `.dev.vars` and replace `BETTER_AUTH_SECRET` with a unique, long random value. `.dev.vars` is ignored by Git.
3. Run `npm run db:migrate:local`.
4. Run `npm run dev` and open `http://127.0.0.1:4321`.

The local D1 database persists under `.wrangler/` and is separate from production. The working local database is kept matching production content, so don't load the demo seeds into it; `npm run db:seed:demo` (fictional stories and discussions) and `scripts/seed-ads-demo.sql` are only for a throwaway database. `npm run check` and `npm run build` verify the code.

## Staff roles

The admin panel at `/admin` is available to users with a row in `staff_roles`:

| Role | Access |
| --- | --- |
| `admin` | Every admin section, including Users, Businesses, and Ads; can delete stories and events |
| `editor` | News, Facebook, News tips, Events, and Media |
| `moderator` | Talk of the Town |

Sections and the roles allowed in each are listed in `src/lib/admin.ts`; a new content area (classifieds, jobs, …) adds an entry there. Once one administrator exists, roles are managed at `/admin/users`. To create the first administrator, register the account, then:

```powershell
npx wrangler d1 execute DB --local --command "INSERT OR REPLACE INTO staff_roles (user_id, role, created_at) SELECT id, 'admin', unixepoch() * 1000 FROM \"user\" WHERE email = 'you@example.com'"
```

Production promotion must be done deliberately against the production D1 database (`--remote`).

## Account profiles and authors

Readers update their display name (1–80 characters), request an email change, and change their password at `/account`. Email changes require a recent session and a Turnstile check; Better Auth sends a one-hour link to the new address and keeps the current address until verification. An address already in use receives no link. Names may be shared; profile URLs use stable account IDs, so changing a name or email does not break links.

Run `npm run test:profiles` for regression checks against an isolated in-memory database. These exercise attribution, visibility, pagination, account deletion, and the real Better Auth name-change and email-verification handlers; test mail is captured locally and Turnstile responses are simulated.

In the news editor, choose an **Author account** to link a story to a profile and use that account's current display name as its byline. New stories default to the editor's account. Choose **Guest byline** for contributors without an account; tip conversions requesting credit default to a guest byline. Deleting an author account keeps its stories with the saved text byline and removes the profile link. Automatically created story/event discussions continue to belong to the Newsroom account.

Migration `0017_article_authors.sql` adds the account relationship and assigns all stories present when it runs (including drafts) to the account with `jd@orboro.net`, with the saved byline `JD`. It leaves stories unchanged if that account is missing; verify the account and resulting attribution before deploying. Apply this migration before deploying the profile code.

## Facebook Page publishing

The **Firelands Current Publishing** Meta app (`1640810601082553`) sends news to Page API ID `1342964875571057`. The separate **Firelands Current** app handles reader Facebook sign-in. Use a Page token with `pages_manage_posts`, `pages_read_engagement`, and `pages_show_list`, issued for the publishing app and the correct Page. The current verified token expires December 1, 2026; renew it before then. Business verification alone does not establish ongoing Page access.

Migration `0018_facebook_posts.sql` creates the posting ledger and database triggers. Stories already published when it runs start in **Archive review**, since some may have been shared manually. Editors check the Page and either record the full existing post ID (`pageid_postid`) or queue a missing story. Existing IDs can be retrieved from the Page's `/feed` in Meta's Graph API Explorer. Recording an existing post is a staff assertion that it links to that story; the dashboard does not verify its contents with Meta. Each queue or record action is audited. Queuing is unavailable for drafts or stories already recorded as posted.

After activation, every new published story is queued atomically, including stories inserted directly into D1. Every five minutes, the Worker also scans the full published archive for missing ledger entries, checks that the token can post to the configured Page, and sends up to five queued stories, oldest first. It posts the headline, summary, and canonical story link; Facebook fetches the site's public preview metadata and image; pages without a lead photo use the Firelands Current masthead. Drafts and future-dated stories are held. Editing a story or returning it to published status does not repost it. Deleting or unpublishing a story does not remove its existing Facebook post; editors must handle Facebook corrections separately.

Only explicit rate-limit rejections retry automatically, with exponential delays capped at an hour and at most six attempts. Permission failures need staff attention. Network loss, an unreadable response, server errors, and a Worker interrupted while sending become **Check Facebook**: the post may already exist, so no automatic retry happens. Check the Page, then record its post ID or confirm that it was not posted before queuing it again. Database claims prevent overlapping runs from sending the same queued story.

Deployment steps, after approval:

1. Apply migration `0018` to production with `npx wrangler d1 migrations apply DB --remote` before deploying the new Worker.
2. Store `FACEBOOK_PAGE_ACCESS_TOKEN` using `npx wrangler secret put FACEBOOK_PAGE_ACCESS_TOKEN`, supplying the token through the prompt or stdin. Never put it in source, command-line arguments, logs, or `wrangler.jsonc`.
3. Check the publishing app's Meta publishing and access requirements, and verify an approved real story appears for ordinary Facebook readers. Development-mode behavior is not proof of public delivery.
4. Set `FACEBOOK_AUTO_POST_ENABLED` to `"true"` in `wrangler.jsonc`, keeping `FACEBOOK_PAGE_ID`, `FACEBOOK_GRAPH_VERSION`, and the verified token expiry (`FACEBOOK_TOKEN_EXPIRES_AT`, Unix milliseconds) accurate. Publish the release after the migration and secret are in place.
5. Review `/admin/facebook`: resolve the archive, inspect any errors, and confirm the five-minute checks are arriving. A run older than 15 minutes and a token within two weeks of expiry show warnings. These are dashboard warnings; there are no email alerts.

Production posting is enabled in `wrangler.jsonc`; the verified Page token is stored as a Cloudflare secret. Keep `FACEBOOK_AUTO_POST_ENABLED=false` in `.dev.vars`; development must never send stories to the live Page. The publisher also refuses a non-production `SITE_URL`. Renew a token in Meta, verify its app, Page, scopes, and expiry, replace the Cloudflare secret, update the recorded expiry, and requeue permission failures after resolving the cause. A valid token can still be revoked or lose permissions before its recorded expiration.

`npm run test:facebook` exercises migrations, direct imports, duplicate prevention, overlapping runs, drafts, expiry, Page identity checks, retries, ambiguous results, database failures, and audited archive actions against an isolated in-memory database and simulated Meta responses. No live Facebook posts or working story records are created by these tests. `src/worker.ts` delegates web requests to Astro and handles the scheduled publisher; the build preserves both handlers.

## User management

Administrators manage accounts at `/admin/users`: search and filter by role or status, edit name and email, assign staff roles, see sign-in methods, active sessions, and Talk of the Town posts, and:

- **Suspend** for 1, 7, or 30 days or until lifted, optionally hiding all of the person's posts. Sessions are revoked immediately and sign-in is refused by every method while the suspension lasts.
- **Sign out** one session or all of them.
- **Set a password**, for someone who can't use password reset by email. It signs the person out everywhere.
- **Add users** with a temporary password, for example new staff. These accounts start with their email marked verified.
- **Delete** an account and everything it posted, after typing its email address to confirm.

Staff accounts and your own account can't be suspended or deleted; remove the role first. Nobody can change their own role, so there's always at least one administrator. Every change is recorded in `admin_audit_log` and shown at `/admin/users/log` and on each user's page.

## Businesses

Administrators group accounts under businesses at `/admin/businesses`: the Firelands Current team (type *In-house*, created by migration 0006 with existing staff as members), advertising clients (*Advertiser*), and anyone else (*Other*). A business has contact details, staff-only notes, and members. Each member is an *Owner* or *Member* and can have a job title. One person can belong to several businesses, for example an agency contact who handles more than one client.

Add members from the business page by account email, or from a user's page. The user list filters by business. Archive former clients instead of deleting them: archived businesses keep their members and history but drop out of pickers. Deleting a business removes only the business and its member list, never the accounts.

Business membership is separate from staff roles. Membership records who someone works for, and staff roles still decide who can use the admin panel. The owner/member distinction is groundwork for a future area where businesses manage their own ads and people.

## Events calendar

Administrators and editors manage the calendar at `/admin/events`. Each event has a title, summary, category, date, optional start and end times (blank start time means all day), an optional hours note for events whose hours differ by day (shown on the event page, with "Hours vary" in listings), an optional last day for events that run several days, a venue, community and address, and optional organizer, cost, link, image from the media library, and Markdown details. On multi-day events the times are the daily hours. Dates and times are Eastern wall-clock values.

Events are *Draft* (staff only), *Published*, or *Cancelled*. Cancelled events stay on the calendar, marked as cancelled, so readers who planned to go can see it; delete (administrators only) is for events entered by mistake. For events that repeat, **Duplicate for another date** on an event's page starts a new draft with the same details. An event's URL comes from its title; a second event with the same title gets its date added.

Readers see upcoming events at `/events`, grouped by day, with filters for category and community and a list of past events. Events that have already started stay under *Today* until their last day. Each event page has a map link, an **Add to calendar** `.ics` file (`/events/<slug>.ics`), and schema.org `Event` data so search engines can list it. The next four events appear under *Coming up* on the front page, and published events are in the sitemap.

The editor also accepts an optional performer name and type (person or group), lowest admission price in USD including fees, ticket purchase or registration URL, and ticket availability. These appear on the public page and in its event structured data. Enter `0` for verified free admission; leave unknown prices blank. Paid admission requires a ticket purchase URL specific to that event. The free-text Cost and More details link are not used to guess ticket offers, and the details link is not treated as the organizer's website. Keep prices and availability current, and review ticket information when duplicating an event.

Search Console may report recommended-field warnings even for valid events. Choose a representative, credited image from the media library, enter the organizer and a verified end time when known, and add performers only when applicable. Unknown details stay omitted; a generic site logo, invented end time, or organizer reused as a performer would misrepresent the event. Existing listings need their new ticket and performer fields filled in where applicable; migration `0019` leaves them blank. After deploying and updating the affected listings, use Google's Rich Results Test before starting Search Console validation.

`npm run test:events` checks migration compatibility, admission and performer saves, public queries, ticket validation, and structured data against an isolated in-memory database. It does not change working event records.

## Media library

Every image on the site lives in the media library at `/admin/media`, open to administrators and editors. Each image has a **credit** (required, shown with it on the site), optional **alt text** and **caption**, and a staff-only **source & permission** note recording where it came from and who allowed its use. Only use images the paper made or has permission to run.

Images are uploaded from the library page or straight from the story editor: the picture button opens a picker with the library and an upload form, and dragging or pasting an image into the story opens the same form so it can be credited. Before upload the browser resizes photos to at most 2,000 pixels on the long side and re-saves them, which also removes location data from phone photos; the server strips JPEG metadata again as a backstop. PNG, JPEG, GIF and WebP are accepted, up to 5 MB; SVG is not, since it can carry scripts.

In a story, an image on a line of its own shows as a figure with its caption and credit. Stories can only show library images: an image linked from another site shows as its alt text instead. Each story can also have a **lead image**, shown above the story, with it on the front page and in the news list, and as the preview image when the story is shared on social media.

The story editor's preview and side-by-side view use the same safe renderer as published stories. Raw HTML appears as text, and previews load only existing media-library images, with captions and credits. Previews send the current story text to our Cloudflare-hosted server without saving it and require a connection and a current administrator or editor sign-in. A failed preview shows an error; it does not fall back to rendering untrusted HTML in the browser.

`npm run test:preview` checks HTML and image restrictions, ordinary Markdown, preview authorization, request limits, and handling of stale or failed preview responses with isolated fixtures. It does not create database records or contact external image hosts.

The front page leads with the newest published story unless an editor ticks **Feature on the front page** in the story editor. The featured story stays the large lead until another story is featured (which un-features it) or it is unticked or unpublished; the four newest other stories fill the list beside it. Only one story is featured at a time. Below the lead, each news section (Local News, Government, and so on) has its own block with its three newest headlines and a link to the full section; sections with no stories are hidden.

An image’s page lists every story, ad and event that uses it, its details and its history. Images in use can’t be deleted; deleting a story, ad or event leaves its images in the library. Uploads, edits and deletions are recorded in the audit log.

Files are stored in the `MEDIA` R2 bucket under `library/` and served from `/media/…` with long-lived caching, so a replaced image gets a new address rather than changing in place.

## Ads

Ad spaces are defined in `src/lib/ads.ts` (`PLACEMENTS`): a leaderboard under the navigation, front-page rectangle and billboard, a story sidebar, in-story rectangles (only in stories of six or more blocks, never right under a subheading), and sponsored listings in the News and Talk of the Town feeds. Pages ask for an ad by placement. Each page view shows at most one ad per business, prefers ads aimed at the page's news section, and rotates the rest by weight. Unfilled slots show a house ad linking to `/advertise`. Sample ads show only while no ads exist at all. Forms, accounts, dashboards and the admin panel never carry ads.

Administrators manage ads at `/admin/ads`. Each ad belongs to a business and has a creative (headline, text, button, link and colors, plus optional banner images at 728×90, 320×100, 300×250 and 970×250 or double those sizes), targeting (placements, news sections, rotation weight), a schedule (inclusive start and end dates in Eastern time, an optional impression cap) and staff-only price and terms. Ads are *Draft*, *Active* or *Paused*. Active ads show as *Scheduled*, *Running*, *Ended* or *Cap reached* depending on their dates and cap. Changes are recorded in the audit log, and they show on the ad's page and its business's page.

An impression counts when at least half of an ad has been on screen for one second. Clicks go through `/ads/click`, which redirects to the ad's own link. Both carry a signed, single-use token issued when the ad was rendered, so replayed or forged events don't count. Staff browsing the site and known bots aren't counted. Stats are kept per ad, day and placement in `ad_stats`.

Members of a business see its ads at `/business` (linked from `/account`): totals, daily charts, per-placement numbers and each ad's preview. The dashboard is read-only and hides drafts and terms. Administrators can open any business's dashboard with **View as client**.

Banner images come from the media library: each size can take a new upload, which joins the library credited to the advertiser, or an existing library image of the right size. Before the first deploy with ads, create the `MEDIA` bucket with `npx wrangler r2 bucket create firelands-current-media`. Local development uses a local bucket automatically. `scripts/seed-ads-demo.sql` loads fictional advertisers, ads and 45 days of stats into a throwaway database (see Local setup).

## OAuth setup

Set `SITE_URL` to the exact public origin. Add provider credentials as Cloudflare Worker secrets:

| Provider | Required variables | Callback URL |
| --- | --- | --- |
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `{SITE_URL}/api/auth/callback/google` |
| Facebook | `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET` | `{SITE_URL}/api/auth/callback/facebook` |
| Microsoft | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` | `{SITE_URL}/api/auth/callback/microsoft` |
| Apple | `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` | `{SITE_URL}/api/auth/callback/apple` |

Apple requires a paid Apple Developer account and an HTTPS callback origin. The app creates its Apple client-secret JWT from the configured private key. OAuth methods can be linked to an existing account from `/account`; matching email addresses are **not** automatically merged.

## Cloudflare deployment

Astro 7's Cloudflare adapter targets Workers. The `main` branch is connected to Cloudflare Workers Builds with `npm run build` and `npx wrangler deploy`; Cloudflare pulls and deploys each push. The production custom domains, D1 binding, and `SITE_URL=https://firelandscurrent.com` are in `wrangler.jsonc`; `BETTER_AUTH_SECRET` is a Cloudflare secret. Namecheap delegates `firelandscurrent.com` to Cloudflare nameservers. Apply migrations to the production database with `npx wrangler d1 migrations apply DB --remote` when schema changes are deployed.

### Email sending

The forms, verification links, and password-reset links send from `noreply@firelandscurrent.com` through the `send_email` binding (`EMAIL`) in `wrangler.jsonc`; no API token is needed. Onboard the domain once with `npx wrangler email sending enable firelandscurrent.com`, and make sure `news@` and `contact@` exist as real mailboxes or Email Routing addresses that deliver to staff. In `npm run dev`, verification and password-reset links are printed in the server console instead of sent.

## Versioning

The site follows [Semantic Versioning](https://semver.org/). The version in `package.json` is shown in the site footer, releases are tagged `vX.Y.Z`, and changes are listed in [CHANGELOG.md](CHANGELOG.md).

## Later work

Reader-submitted events, the newsletter, obituaries, jobs, and classifieds are not built yet.

## License

The source is published for transparency and security review, not as open source. You may read, run privately, and research it for non-commercial purposes; commercial use, public deployment, and redistribution need written permission from Stone Dragon Media, LLC. See [LICENSE.md](LICENSE.md).
