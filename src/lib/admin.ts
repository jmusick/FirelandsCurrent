import type { AstroGlobal } from 'astro';
import type { StaffRole } from './staff';

export type AdminSection = {
  href: string;
  label: string;
  roles: StaffRole[];
};

const ALL_STAFF: StaffRole[] = ['admin', 'editor', 'moderator'];

// The admin panel's sections. Each new content area (classifieds, jobs, …) adds one entry here
// and uses the same roles when gating its pages and endpoints.
export type AdminSectionKey = 'dashboard' | 'news' | 'talk' | 'users' | 'businesses' | 'ads';

export const ADMIN: Record<AdminSectionKey, AdminSection> = {
  dashboard: { href: '/admin', label: 'Dashboard', roles: ALL_STAFF },
  news: { href: '/admin/news', label: 'News', roles: ['admin', 'editor'] },
  talk: { href: '/admin/talk', label: 'Talk of the Town', roles: ['admin', 'moderator'] },
  users: { href: '/admin/users', label: 'Users', roles: ['admin'] },
  businesses: { href: '/admin/businesses', label: 'Businesses', roles: ['admin'] },
  ads: { href: '/admin/ads', label: 'Ads', roles: ['admin'] },
};

export function sectionsFor(role: StaffRole): AdminSectionKey[] {
  return (Object.keys(ADMIN) as AdminSectionKey[]).filter((key) => ADMIN[key].roles.includes(role));
}

export function canAccess(role: StaffRole | null, section: AdminSection): boolean {
  return role !== null && section.roles.includes(role);
}

/** For admin pages: a response to return instead of the page when the viewer can't use this section. */
export function requireSection(Astro: AstroGlobal, section: AdminSection): Response | null {
  if (!Astro.locals.user) return Astro.redirect(`/sign-in?next=${encodeURIComponent(Astro.url.pathname)}`);
  if (!canAccess(Astro.locals.staffRole, section)) return new Response('Forbidden', { status: 403 });
  return null;
}
