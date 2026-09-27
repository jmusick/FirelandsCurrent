# Firelands Current

An Astro and Cloudflare Workers foundation for an independent local newspaper centered on Sandusky, Ohio. This first slice implements reader accounts and **Talk of the Town** discussions.

## What works now

- Email/password registration, sign-in, sign-out, and password changes through Better Auth
- A stable local `user.id`, with additional OAuth sign-in methods linked through the `account` table
- Optional Google, Facebook, and Apple OAuth configuration; buttons appear only when credentials are configured
- Publicly readable Talk of the Town discussions; signed-in readers can start threads and reply
- Rate limits on threads, replies, and reports
- Member reports and a moderator-only review queue with hide/dismiss actions
- D1 migrations for auth and forum records

## Local setup

Requires Node.js 24 or later.

1. Run `npm install`.
2. Copy `.dev.vars.example` to `.dev.vars` and replace `BETTER_AUTH_SECRET` with a unique, long random value. `.dev.vars` is ignored by Git.
3. Run `npm run db:migrate:local`.
4. Run `npm run dev` and open `http://127.0.0.1:4391`.

The local D1 database persists under `.wrangler/` and is separate from any future production database. `npm run check` and `npm run build` verify the code.

## Moderator setup

After registering your own account, insert its user ID into `forum_moderators` in D1. For a local account, use the ID shown on `/account`:

```powershell
npx wrangler d1 execute DB --local --command "INSERT INTO forum_moderators (user_id, created_at) VALUES ('YOUR_USER_ID', unixepoch() * 1000)"
```

Production promotion must be done deliberately against the production D1 database after creating it.

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

## Before a public launch

Email/password signups do not yet verify email addresses, and password recovery by email is not wired up. Those require a transactional email sender and an approved sending domain. Social sign-in needs the provider credentials above. The forum is a functional local prototype; configure email verification and bot protection before opening registration to the public.

Articles, the editorial CMS, newsletter, obituaries, jobs, and classifieds are separate later work.
