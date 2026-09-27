import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { cleanText, sameOrigin } from '../../../../lib/forum';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return Response.redirect(new URL('/sign-in?next=/admin/news', request.url), 303);
  if (locals.staffRole !== 'admin') return new Response('Forbidden', { status: 403 });
  if (!sameOrigin(request)) return new Response('Invalid request origin', { status: 403 });

  const id = cleanText((await request.formData()).get('id'));
  if (id) await env.DB.prepare('DELETE FROM news_articles WHERE id = ?').bind(id).run();
  return Response.redirect(new URL('/admin/news?deleted=1', request.url), 303);
};
