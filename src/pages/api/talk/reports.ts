import { readForm } from '../../../lib/request-body';
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { cleanText, getThread, returnPathFor, sameOrigin } from '../../../lib/forum';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return Response.redirect(new URL('/sign-in', request.url), 303);
  if (!sameOrigin(request)) return new Response('Invalid request origin', { status: 403 });

  const form = await readForm(request);

  if (form instanceof Response) return form;
  const kind = cleanText(form.get('kind'));
  const id = cleanText(form.get('id'));
  const reason = cleanText(form.get('reason'));
  if ((kind !== 'thread' && kind !== 'reply') || !/^[0-9a-f-]{36}$/i.test(id) || reason.length < 10 || reason.length > 500) {
    return new Response('Invalid report', { status: 400 });
  }

  const item = kind === 'thread'
    ? await env.DB.prepare("SELECT id, author_id, id AS thread_id FROM forum_threads WHERE id = ? AND status = 'published'").bind(id).first<{ author_id: string; thread_id: string }>()
    : await env.DB.prepare("SELECT id, author_id, thread_id FROM forum_replies WHERE id = ? AND status = 'published'").bind(id).first<{ author_id: string; thread_id: string }>();
  if (!item || item.author_id === locals.user.id) return new Response('Report unavailable', { status: 400 });

  const now = Date.now();
  const recent = await env.DB.prepare('SELECT COUNT(*) AS count FROM forum_reports WHERE reporter_id = ? AND created_at > ?')
    .bind(locals.user.id, now - 60 * 60 * 1000).first<{ count: number }>();
  if ((recent?.count ?? 0) >= 10) return new Response('Report limit reached. Please try later.', { status: 429 });

  await env.DB.prepare(`
    INSERT OR IGNORE INTO forum_reports (id, reporter_id, thread_id, reply_id, reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(crypto.randomUUID(), locals.user.id, kind === 'thread' ? id : null, kind === 'reply' ? id : null, reason, now).run();
  const thread = await getThread(item.thread_id);
  const url = new URL(thread ? returnPathFor(cleanText(form.get('returnTo')), thread) : `/talk/${item.thread_id}`, request.url);
  url.searchParams.set('reported', '1');
  url.hash = 'comments';
  return Response.redirect(url, 303);
};
