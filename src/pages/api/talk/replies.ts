import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { cleanText, redirectWithError, sameOrigin } from '../../../lib/forum';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return Response.redirect(new URL('/sign-in', request.url), 303);
  if (!sameOrigin(request)) return new Response('Invalid request origin', { status: 403 });

  const form = await request.formData();
  const threadId = cleanText(form.get('threadId'));
  const body = cleanText(form.get('body'));
  const returnPath = `/talk/${encodeURIComponent(threadId)}`;
  if (!/^[0-9a-f-]{36}$/i.test(threadId)) return new Response('Invalid thread', { status: 400 });
  if (body.length < 2 || body.length > 5000) return redirectWithError(request, returnPath, 'length');

  const thread = await env.DB.prepare("SELECT id FROM forum_threads WHERE id = ? AND status = 'published'")
    .bind(threadId).first();
  if (!thread) return new Response('Thread not found', { status: 404 });

  const now = Date.now();
  const recent = await env.DB.prepare('SELECT COUNT(*) AS count FROM forum_replies WHERE author_id = ? AND created_at > ?')
    .bind(locals.user.id, now - 60 * 1000).first<{ count: number }>();
  if ((recent?.count ?? 0) >= 3) return redirectWithError(request, returnPath, 'rate');

  await env.DB.batch([
    env.DB.prepare('INSERT INTO forum_replies (id, thread_id, author_id, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), threadId, locals.user.id, body, now, now),
    env.DB.prepare('UPDATE forum_threads SET last_activity_at = ?, updated_at = ? WHERE id = ?')
      .bind(now, now, threadId),
  ]);
  return Response.redirect(new URL(`${returnPath}#replies`, request.url), 303);
};
