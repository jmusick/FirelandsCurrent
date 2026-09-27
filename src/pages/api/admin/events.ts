import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { cleanText, sameOrigin } from '../../../lib/forum';

// Creating and editing an event happens on its admin pages, which can redisplay the form with errors.
// Deletion goes through here and, as with stories, is for administrators only.
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return Response.redirect(new URL('/sign-in?next=/admin/events', request.url), 303);
  if (locals.staffRole !== 'admin') return new Response('Forbidden', { status: 403 });
  if (!sameOrigin(request)) return new Response('Invalid request origin', { status: 403 });

  const form = await request.formData();
  if (cleanText(form.get('action')) !== 'delete') return new Response('Invalid action', { status: 400 });
  const id = cleanText(form.get('id'));
  if (!/^[\w-]{8,64}$/.test(id)) return new Response('Invalid event', { status: 400 });
  const result = await env.DB.prepare('DELETE FROM events WHERE id = ?').bind(id).run();
  if (!result.meta.changes) return new Response('Event not found', { status: 404 });
  return Response.redirect(new URL('/admin/events?deleted=1', request.url), 303);
};
