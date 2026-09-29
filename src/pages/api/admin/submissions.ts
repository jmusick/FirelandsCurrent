import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { ADMIN, canAccess } from '../../../lib/admin';
import { cleanText, sameOrigin } from '../../../lib/forum';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return Response.redirect(new URL('/sign-in?next=/admin/submissions', request.url), 303);
  if (!canAccess(locals.staffRole, ADMIN.submissions)) return new Response('Forbidden', { status: 403 });
  if (!sameOrigin(request)) return new Response('Invalid request origin', { status: 403 });
  const form = await request.formData();
  const id = cleanText(form.get('id'));
  const status = cleanText(form.get('status'));
  if (!/^[\w-]{8,64}$/.test(id) || !['reviewed', 'declined'].includes(status)) return new Response('Invalid submission action', { status: 400 });
  const result = await env.DB.prepare("UPDATE news_submissions SET status = ?, updated_at = ? WHERE id = ? AND status != 'converted'").bind(status, Date.now(), id).run();
  if (!result.meta.changes) return new Response('News tip not found or already converted', { status: 404 });
  return Response.redirect(new URL(`/admin/submissions/${id}`, request.url), 303);
};
