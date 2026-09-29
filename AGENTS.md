# AGENTS.md

Guidance for AI coding agents working on Firelands Current, an independent local newspaper for Sandusky, Ohio. [README.md](README.md) describes the features in depth; this file covers what an agent needs to work safely and consistently.

## Stack

- **Astro 7** in server output mode (`astro.config.mjs`), deployed with the `@astrojs/cloudflare` adapter to **Cloudflare Workers**
- **D1** (SQLite) database bound as `DB`; **R2** bucket bound as `MEDIA` for ad banner images; both configured in `wrangler.jsonc`
- **Better Auth** for accounts and sessions (`src/lib/auth.ts`, served at `/api/auth/*`)
- **TypeScript** in strict mode; **marked** renders story Markdown
- Node.js 24 or later

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server at `http://127.0.0.1:4321` |
| `npm run check` | Type-check with `astro check` |
| `npm run build` | Production build into `dist/` |
| `npm run db:migrate:local` | Apply D1 migrations to the local database under `.wrangler/` |
| `npm run db:seed:demo` | Load fictional demo stories and discussions (local only) |
| `npm run cf:types` | Regenerate `worker-configuration.d.ts` from `wrangler.jsonc` |

Run `npm run check` and `npm run build` before considering a change done. **Running `npm run check` while the dev server is up breaks the dev server** (client scripts start returning 404); restart `npm run dev` afterwards.

Local setup needs `.dev.vars` copied from `.dev.vars.example` with a real `BETTER_AUTH_SECRET`. `.dev.vars` is ignored by Git; never commit secrets.

## Layout

```
src/
  middleware.ts      www → apex redirect, session lookup, suspension check, security headers
  env.d.ts           App.Locals (user, session, staffRole), Cloudflare.Env, __APP_VERSION__
  layouts/           BaseLayout (public site), AdminLayout (/admin)
  components/        Shared Astro components (ads, forms, news editor)
  lib/               Data access and domain logic, one module per area
  pages/             Routes; pages/api/** are form-post endpoints
migrations/          Numbered D1 migrations (0001_auth.sql …)
scripts/             Demo seed SQL; auth-schema.ts only generated the initial auth migration
```

## Conventions

- **Data access** goes through `src/lib/*` modules that import `env` from `cloudflare:workers` and use `env.DB.prepare(...).bind(...)` with bound parameters. Never interpolate user input into SQL.
- **Timestamps** are stored as Unix milliseconds (`Date.now()`, or `unixepoch() * 1000` in SQL).
- **Auth state** comes from `Astro.locals` / `locals` (`user`, `session`, `staffRole`), set by `src/middleware.ts`. Suspended users are treated as signed out.
- **Admin sections** are declared in `ADMIN` in `src/lib/admin.ts`. Admin pages call `requireSection(Astro, ADMIN.x)`; admin endpoints check `canAccess(locals.staffRole, ADMIN.x)`. A new content area adds an entry there, reuses those roles, and gets a sidebar icon in `SECTION_ICONS` in `AdminLayout.astro`.
- **API endpoints** are `APIRoute` handlers that accept form posts: check the user and role, reject cross-origin requests with `sameOrigin(request)` from `src/lib/forum.ts`, read fields through `cleanText`, validate ids with a regex, and answer with a `303` redirect back to the page. Return plain-text error responses with the right status (400, 403, 404).
- **Admin changes to users, businesses, and ads** are recorded in `admin_audit_log`; keep new admin actions audited the same way.
- **Images** go through the media library (`src/lib/media.ts`): every file in R2 has a `media` row with a required credit, and stories and ads refer to library items. Never delete an R2 object that a story or ad might use; use `mediaUsage` first. Story Markdown only renders `/media/…` images that exist in the library.
- **Ads** never appear on forms, account pages, dashboards, or the admin panel. Placements are defined in `PLACEMENTS` in `src/lib/ads.ts`.
- **Styling** is plain CSS in the layouts and pages; there is no CSS framework.
- **Icons** in the admin panel come from Lucide via `@lucide/astro` (`import { Plus } from '@lucide/astro'`), rendered as inline SVG on the server. Use current icon names, not the deprecated aliases (`Trash`, not `Trash2`). Icons sit before a button's or heading's text and are decorative; the text carries the meaning.
- Writing or sourcing news stories: read [docs/news-sources.md](docs/news-sources.md) first. It covers the editorial rules, which sources to trust, and how stories get into the database.
- Match the surrounding code: comment density, naming, and idiom. Comments explain why, not what.
- Keep `README.md` current when behavior an operator or editor would notice changes.
- Keep the Privacy Policy (`src/pages/privacy.astro`) accurate: update it in the same change when you add or change what data is collected, stored, shown publicly, or sent to a third party (a new analytics tag, cookie, form field, or sign-in provider).

## Database migrations

- Add a new numbered file in `migrations/` (next is `0010_*.sql`); never edit a migration that has shipped.
- Apply locally with `npm run db:migrate:local`. Update `scripts/seed-demo.sql` or `scripts/seed-ads-demo.sql` if the schema change affects demo data.
- Production migrations are applied deliberately with `npx wrangler d1 migrations apply DB --remote`. Don't run `--remote` commands unless the user asks.

## Deployment

The `main` branch is connected to Cloudflare Workers Builds: **every push to `main` builds and deploys to production** at `https://firelandscurrent.com`. Confirm with the user before pushing, and make sure any new migrations are applied to the production database before or alongside the deploy.

## Versioning

The site uses [Semantic Versioning](https://semver.org/). The single source of truth is `version` in `package.json`; `astro.config.mjs` injects it at build time as `__APP_VERSION__`, and the footer in `BaseLayout.astro` displays it.

To release a version:

1. Bump the version with `npm version <major|minor|patch> --no-git-tag-version` (updates `package.json` and `package-lock.json`).
2. Add a section to `CHANGELOG.md` under the new version and date.
3. Commit, then tag the commit `vX.Y.Z` and push the tag with the branch.

Use **patch** for fixes, **minor** for new features or sections, and **major** for changes that break existing URLs, accounts, or data.

## Git

- Commit messages are short imperative summaries (for example, "Redirect www to canonical domain").
- Do not add `Co-Authored-By` or other AI attribution trailers to commits.
