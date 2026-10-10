import { readForm } from '../../../lib/request-body';
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { cleanText, redirectWithError, sameOrigin } from '../../../lib/forum';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return Response.redirect(new URL('/sign-in?next=/talk/new', request.url), 303);
  if (!sameOrigin(request)) return new Response('Invalid request origin', { status: 403 });

  const form = await readForm(request);

  if (form instanceof Response) return form;
  const title = cleanText(form.get('title'));
  const body = cleanText(form.get('body'));
  if (title.length < 8 || title.length > 140 || body.length < 20 || body.length > 10000) {
    return redirectWithError(request, '/talk/new', 'length');
  }

  const now = Date.now();
  const recent = await env.DB.prepare('SELECT COUNT(*) AS count FROM forum_threads WHERE author_id = ? AND created_at > ?')
    .bind(locals.user.id, now - 60 * 60 * 1000).first<{ count: number }>();
  if ((recent?.count ?? 0) >= 5) return redirectWithError(request, '/talk/new', 'rate');

  const id = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO forum_threads (id, author_id, title, body, created_at, updated_at, last_activity_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, locals.user.id, title, body, now, now, now).run();
  return Response.redirect(new URL(`/talk/${id}`, request.url), 303);
};
