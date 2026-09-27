import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { ADMIN, canAccess } from '../../../lib/admin';
import { cleanText, sameOrigin } from '../../../lib/forum';

const UUID = /^[0-9a-f-]{36}$/i;
// Seeded demo rows use readable ids like "demo-t1".
const ID = /^(?:[0-9a-f-]{36}|demo-[a-z0-9]+)$/i;

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user || !canAccess(locals.staffRole, ADMIN.talk)) return new Response('Forbidden', { status: 403 });
  if (!sameOrigin(request)) return new Response('Invalid request origin', { status: 403 });

  const form = await request.formData();
  const action = cleanText(form.get('action'));
  const now = Date.now();
  const back = Response.redirect(new URL('/admin/talk', request.url), 303);

  if (action === 'hide-thread' || action === 'restore-thread') {
    const threadId = cleanText(form.get('threadId'));
    if (!ID.test(threadId)) return new Response('Invalid discussion', { status: 400 });
    await env.DB.prepare('UPDATE forum_threads SET status = ?, updated_at = ? WHERE id = ?')
      .bind(action === 'hide-thread' ? 'hidden' : 'published', now, threadId).run();
    return back;
  }

  const reportId = cleanText(form.get('reportId'));
  if (!UUID.test(reportId) || (action !== 'hide-reported' && action !== 'dismiss')) {
    return new Response('Invalid moderation action', { status: 400 });
  }
  const report = await env.DB.prepare("SELECT thread_id, reply_id FROM forum_reports WHERE id = ? AND status = 'open'")
    .bind(reportId).first<{ thread_id: string | null; reply_id: string | null }>();
  if (!report) return new Response('Report not found', { status: 404 });

  if (action === 'dismiss') {
    await env.DB.prepare("UPDATE forum_reports SET status = 'dismissed', resolved_at = ? WHERE id = ?").bind(now, reportId).run();
  } else if (report.thread_id) {
    await env.DB.batch([
      env.DB.prepare("UPDATE forum_threads SET status = 'hidden', updated_at = ? WHERE id = ?").bind(now, report.thread_id),
      env.DB.prepare("UPDATE forum_reports SET status = 'resolved', resolved_at = ? WHERE thread_id = ? AND status = 'open'").bind(now, report.thread_id),
    ]);
  } else if (report.reply_id) {
    await env.DB.batch([
      env.DB.prepare("UPDATE forum_replies SET status = 'hidden', updated_at = ? WHERE id = ?").bind(now, report.reply_id),
      env.DB.prepare("UPDATE forum_reports SET status = 'resolved', resolved_at = ? WHERE reply_id = ? AND status = 'open'").bind(now, report.reply_id),
    ]);
  }
  return back;
};
