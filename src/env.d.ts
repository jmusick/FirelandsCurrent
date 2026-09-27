/// <reference path="../.astro/types.d.ts" />

/** The site version from package.json, injected at build time. */
declare const __APP_VERSION__: string;

declare namespace App {
  interface Locals {
    user: import('better-auth').User | null;
    session: import('better-auth').Session | null;
    staffRole: import('./lib/staff').StaffRole | null;
  }
}

declare namespace Cloudflare {
  interface Env {
    BETTER_AUTH_SECRET: string;
    SITE_URL: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    FACEBOOK_CLIENT_ID?: string;
    FACEBOOK_CLIENT_SECRET?: string;
    APPLE_CLIENT_ID?: string;
    APPLE_TEAM_ID?: string;
    APPLE_KEY_ID?: string;
    APPLE_PRIVATE_KEY?: string;
  }
}
