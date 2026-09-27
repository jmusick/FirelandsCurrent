# Firelands Current

An Astro and Cloudflare Workers foundation for an independent local newspaper centered on Sandusky, Ohio. This first slice implements reader accounts and **Talk of the Town** discussions.

## What works now

- Email/password registration, sign-in, sign-out, and password changes through Better Auth
- A stable local `user.id`, with additional OAuth sign-in methods linked through the `account` table
- Optional Google, Facebook, and Apple OAuth configuration; buttons appear only when credentials are configured
- Publicly readable Talk of the Town discussions; signed-in readers can start threads and reply
- Rate limits on threads, replies, and reports
- Member reports, reviewed in the admin panel with hide/dismiss actions
- News: section pages, story pages, and the latest stories on the homepage; story text is Markdown
- Admin panel at `/admin` (dashboard, News editor, Talk of the Town moderation, users, businesses) gated by staff roles
- D1 migrations for auth, forum, news, staff, user-management, and business records

## Local setup

Requires Node.js 24 or later.

1. Run `npm install`.
2. Copy `.dev.vars.example` to `.dev.vars` and replace `BETTER_AUTH_SECRET` with a unique, long random value. `.dev.vars` is ignored by Git.
3. Run `npm run db:migrate:local`.
4. Optionally run `npm run db:seed:demo` to load fictional demo stories and discussions (local only; re-runnable).
5. Run `npm run dev` and open `http://127.0.0.1:4321`.

The local D1 database persists under `.wrangler/` and is separate from any future production database. `npm run check` and `npm run build` verify the code.

## Staff roles

The admin panel at `/admin` is available to users with a row in `staff_roles`:

| Role | Access |
| --- | --- |
| `admin` | Every admin section, including Users and Businesses; can delete stories |
| `editor` | News |
| `moderator` | Talk of the Town |

Sections and the roles allowed in each are listed in `src/lib/admin.ts`; a new content area (classifieds, jobs, …) adds an entry there. Once one administrator exists, roles are managed at `/admin/users`. To create the first administrator, register the account, then:

```powershell
npx wrangler d1 execute DB --local --command "INSERT OR REPLACE INTO staff_roles (user_id, role, created_at) SELECT id, 'admin', unixepoch() * 1000 FROM \"user\" WHERE email = 'you@example.com'"
```

Production promotion must be done deliberately against the production D1 database (`--remote`).

## User management

Administrators manage accounts at `/admin/users`: search and filter by role or status, edit name and email, assign staff roles, see sign-in methods, active sessions, and Talk of the Town posts, and:

- **Suspend** for 1, 7, or 30 days or until lifted, optionally hiding all of the person's posts. Sessions are revoked immediately and sign-in is refused by every method while the suspension lasts.
- **Sign out** one session or all of them.
- **Set a password**, which is the recovery path until password-reset email exists. It signs the person out everywhere.
- **Add users** with a temporary password, for example new staff.
- **Delete** an account and everything it posted, after typing its email address to confirm.

Staff accounts and your own account can't be suspended or deleted; remove the role first. Nobody can change their own role, so there's always at least one administrator. Every change is recorded in `admin_audit_log` and shown at `/admin/users/log` and on each user's page.

## Businesses

Administrators group accounts under businesses at `/admin/businesses`: the Firelands Current team (type *In-house*, created by migration 0006 with existing staff as members), advertising clients (*Advertiser*), and anyone else (*Other*). A business has contact details, staff-only notes, and members. Each member is an *Owner* or *Member* and can have a job title. One person can belong to several businesses, for example an agency contact who handles more than one client.

Add members from the business page by account email, or from a user's page. The user list filters by business. Archive former clients instead of deleting them: archived businesses keep their members and history but drop out of pickers. Deleting a business removes only the business and its member list, never the accounts.

Business membership is separate from staff roles. Membership records who someone works for, and staff roles still decide who can use the admin panel. The owner/member distinction is groundwork for a future area where businesses manage their own ads and people.

## Ads

Ad spaces are defined in `src/lib/ads.ts` (`PLACEMENTS`): a leaderboard under the navigation, front-page rectangle and billboard, a story sidebar, in-story rectangles (only in stories of six or more blocks, never right under a subheading), and sponsored listings in the News and Talk of the Town feeds. Pages ask for an ad by placement. Each page view shows at most one ad per business, prefers ads aimed at the page's news section, and rotates the rest by weight. Unfilled slots show a house ad linking to `/advertise`. Sample ads show only while no ads exist at all. Forms, accounts, dashboards and the admin panel never carry ads.

Administrators manage ads at `/admin/ads`. Each ad belongs to a business and has a creative (headline, text, button, link and colors, plus optional banner images at 728×90, 320×100, 300×250 and 970×250 or double those sizes), targeting (placements, news sections, rotation weight), a schedule (inclusive start and end dates in Eastern time, an optional impression cap) and staff-only price and terms. Ads are *Draft*, *Active* or *Paused*. Active ads show as *Scheduled*, *Running*, *Ended* or *Cap reached* depending on their dates and cap. Changes are recorded in the audit log, and they show on the ad's page and its business's page.

An impression counts when at least half of an ad has been on screen for one second. Clicks go through `/ads/click`, which redirects to the ad's own link. Both carry a signed, single-use token issued when the ad was rendered, so replayed or forged events don't count. Staff browsing the site and known bots aren't counted. Stats are kept per ad, day and placement in `ad_stats`.

Members of a business see its ads at `/business` (linked from `/account`): totals, daily charts, per-placement numbers and each ad's preview. The dashboard is read-only and hides drafts and terms. Administrators can open any business's dashboard with **View as client**.

Banner images are stored in the `MEDIA` R2 bucket and served from `/media/…`. Before the first deploy with ads, create the bucket with `npx wrangler r2 bucket create firelands-current-media`. Local development uses a local bucket automatically. `npx wrangler d1 execute DB --local --file scripts/seed-ads-demo.sql` loads fictional advertisers, ads and 45 days of stats.

## OAuth setup

Set `SITE_URL` to the exact public origin. Add provider credentials as Cloudflare Worker secrets:

| Provider | Required variables | Callback URL |
| --- | --- | --- |
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `{SITE_URL}/api/auth/callback/google` |
| Facebook | `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET` | `{SITE_URL}/api/auth/callback/facebook` |
| Apple | `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` | `{SITE_URL}/api/auth/callback/apple` |

Apple requires a paid Apple Developer account and an HTTPS callback origin. The app creates its Apple client-secret JWT from the configured private key. OAuth methods can be linked to an existing account from `/account`; matching email addresses are **not** automatically merged.

## Cloudflare deployment

Astro 7's Cloudflare adapter targets Workers. The `main` branch is connected to Cloudflare Workers Builds with `npm run build` and `npx wrangler deploy`; Cloudflare pulls and deploys each push. The production custom domains, D1 binding, and `SITE_URL=https://firelandscurrent.com` are in `wrangler.jsonc`; `BETTER_AUTH_SECRET` is a Cloudflare secret. Namecheap delegates `firelandscurrent.com` to Cloudflare nameservers. Apply migrations to the production database with `npx wrangler d1 migrations apply DB --remote` when schema changes are deployed.

## Versioning

The site follows [Semantic Versioning](https://semver.org/). The version in `package.json` is shown in the site footer, releases are tagged `vX.Y.Z`, and changes are listed in [CHANGELOG.md](CHANGELOG.md).

## Before a public launch

Email/password signups do not yet verify email addresses, and password recovery by email is not wired up. Those require a transactional email sender and an approved sending domain. Social sign-in needs the provider credentials above. The forum is a functional local prototype; configure email verification and bot protection before opening registration to the public.

Articles, the editorial CMS, newsletter, obituaries, jobs, and classifieds are separate later work.
