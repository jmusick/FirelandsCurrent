import type { AstroGlobal } from 'astro';
import { env } from 'cloudflare:workers';
import { ADMIN, canAccess } from './admin';
import type { Business } from './businesses';

export type PortalAccess = { business: Business; viewer: 'member' | 'staff' };

/**
 * The business dashboard is for that business's members. Admins who manage ads can also
 * open it, to see exactly what a client sees. Returns a Response to send instead when not allowed.
 */
export async function requireBusiness(Astro: AstroGlobal, businessId: string): Promise<PortalAccess | Response> {
  const user = Astro.locals.user;
  if (!user) return Astro.redirect(`/sign-in?next=${encodeURIComponent(Astro.url.pathname)}`);
  const row = await env.DB.prepare(`
    SELECT b.*, EXISTS (SELECT 1 FROM business_members m WHERE m.business_id = b.id AND m.user_id = ?) AS is_member
    FROM businesses b WHERE b.id = ?
  `).bind(user.id, businessId).first<Business & { is_member: number }>();
  if (row?.is_member) return { business: row, viewer: 'member' };
  if (row && canAccess(Astro.locals.staffRole, ADMIN.ads)) return { business: row, viewer: 'staff' };
  return new Response('Not found', { status: 404 });
}

/** Businesses the user belongs to, for the dashboard picker and account links. */
export async function portalBusinesses(userId: string): Promise<{ id: string; name: string }[]> {
  const result = await env.DB.prepare(`
    SELECT b.id, b.name FROM business_members m JOIN businesses b ON b.id = m.business_id
    WHERE m.user_id = ? AND b.kind != 'internal' ORDER BY b.name COLLATE NOCASE
  `).bind(userId).all<{ id: string; name: string }>();
  return result.results;
}
