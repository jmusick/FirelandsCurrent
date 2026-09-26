import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { cleanText, isModerator, sameOrigin } from '../../../lib/forum';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user || !await isModerator(locals.user.id)) return new Response('Forbidden', { status: 403 });
  if (!sameOrigin(request)) return new Response('Invalid request origin', { status: 403 });

  const form = await request.formData();
  const reportId = cleanText(form.get('reportId'));
  const action = cleanText(form.get('action'));
  if (!/^[0-9a-f-]{36}$/i.test(reportId) || (action !== 'hide' && action !== 'dismiss')) {
    return new Response('Invalid moderation action', { status: 400 });
  }
  const report = await env.DB.prepare("SELECT thread_id, reply_id FROM forum_reports WHERE id = ? AND status = 'open'")
    .bind(reportId).first<{ thread_id: string | null; reply_id: string | null }>();
  if (!report) return new Response('Report not found', { status: 404 });

  const now = Date.now();
  if (action === 'hide') {
    if (report.thread_id) {
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
  } else {
    await env.DB.prepare("UPDATE forum_reports SET status = 'dismissed', resolved_at = ? WHERE id = ?").bind(now, reportId).run();
  }
  return Response.redirect(new URL('/moderation', request.url), 303);
};
