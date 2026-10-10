import { readForm } from '../../../lib/request-body';
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { MAX_REPLY_DEPTH, cleanText, getThread, redirectWithError, returnPathFor, sameOrigin } from '../../../lib/forum';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return Response.redirect(new URL('/sign-in', request.url), 303);
  if (!sameOrigin(request)) return new Response('Invalid request origin', { status: 403 });

  const form = await readForm(request);

  if (form instanceof Response) return form;
  const threadId = cleanText(form.get('threadId'));
  const body = cleanText(form.get('body'));
  if (!/^[0-9a-f-]{36}$/i.test(threadId)) return new Response('Invalid thread', { status: 400 });

  const thread = await getThread(threadId);
  if (!thread) return new Response('Thread not found', { status: 404 });
  const returnPath = returnPathFor(cleanText(form.get('returnTo')), thread);
  if (body.length < 2 || body.length > 5000) return redirectWithError(request, returnPath, 'length', 'comments');

  // A reply to a comment: the comment must be visible and in this discussion, and not already at the deepest level.
  const parentId = cleanText(form.get('parentId'));
  if (parentId) {
    if (!/^[0-9a-f-]{36}$/i.test(parentId)) return new Response('Invalid comment', { status: 400 });
    const parent = await env.DB.prepare(`
      WITH RECURSIVE chain(id, parent_id, thread_id, status, depth) AS (
        SELECT id, parent_id, thread_id, status, 0 FROM forum_replies WHERE id = ?
        UNION ALL SELECT r.id, r.parent_id, r.thread_id, r.status, chain.depth + 1 FROM forum_replies r JOIN chain ON r.id = chain.parent_id
      )
      SELECT (SELECT thread_id FROM chain WHERE depth = 0) AS thread_id, (SELECT status FROM chain WHERE depth = 0) AS status, MAX(depth) AS depth FROM chain
    `).bind(parentId).first<{ thread_id: string | null; status: string | null; depth: number }>();
    if (parent?.thread_id !== threadId || parent.status !== 'published') return new Response('Comment not found', { status: 404 });
    if (parent.depth >= MAX_REPLY_DEPTH) return new Response('Replies are nested too deeply', { status: 400 });
  }

  const now = Date.now();
  const recent = await env.DB.prepare('SELECT COUNT(*) AS count FROM forum_replies WHERE author_id = ? AND created_at > ?')
    .bind(locals.user.id, now - 60 * 1000).first<{ count: number }>();
  if ((recent?.count ?? 0) >= 3) return redirectWithError(request, returnPath, 'rate', 'comments');

  const id = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO forum_replies (id, thread_id, parent_id, author_id, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, threadId, parentId || null, locals.user.id, body, now, now),
    env.DB.prepare('UPDATE forum_threads SET last_activity_at = ?, updated_at = ? WHERE id = ?')
      .bind(now, now, threadId),
  ]);
  const url = new URL(returnPath, request.url);
  url.hash = `reply-${id}`;
  return Response.redirect(url, 303);
};
