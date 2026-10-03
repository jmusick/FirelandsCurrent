import { env } from 'cloudflare:workers';
import { FACEBOOK_STATUS_LABELS, type FacebookStatus } from './facebook-publisher';

export type FacebookPost = {
  article_id: string; headline: string; slug: string; article_status: string;
  status: FacebookStatus; post_id: string | null; attempts: number;
  last_error: string | null; posted_at: number | null; updated_at: number;
};

export async function facebookDashboard(status: string, page: number) {
  const filter = Object.hasOwn(FACEBOOK_STATUS_LABELS, status) ? status : '';
  const where = filter ? 'WHERE p.status = ?' : '';
  const bindings = filter ? [filter] : [];
  const [posts, total, counts, health, missing] = await Promise.all([
    env.DB.prepare(`SELECT p.*, a.headline, a.slug, a.status AS article_status FROM facebook_posts p
      JOIN news_articles a ON a.id = p.article_id ${where}
      ORDER BY CASE p.status WHEN 'uncertain' THEN 0 WHEN 'failed' THEN 1 WHEN 'review' THEN 2 WHEN 'pending' THEN 3 ELSE 4 END,
        a.published_at DESC, p.article_id LIMIT 40 OFFSET ?`).bind(...bindings, (page - 1) * 40).all<FacebookPost>(),
    env.DB.prepare(`SELECT count(*) AS n FROM facebook_posts p ${where}`).bind(...bindings).first<{ n: number }>(),
    env.DB.prepare('SELECT status, count(*) AS n FROM facebook_posts GROUP BY status').all<{ status: FacebookStatus; n: number }>(),
    env.DB.prepare('SELECT last_run_at, last_success_at, last_error FROM facebook_publisher_health WHERE id = 1')
      .first<{ last_run_at: number | null; last_success_at: number | null; last_error: string | null }>(),
    env.DB.prepare(`SELECT count(*) AS n FROM news_articles a LEFT JOIN facebook_posts p ON p.article_id = a.id
      WHERE a.status = 'published' AND p.article_id IS NULL`).first<{ n: number }>(),
  ]);
  return { posts: posts.results, total: total?.n ?? 0, counts: counts.results, health, missing: missing?.n ?? 0, filter };
}

/** The update and audit entry share a transaction, including the conditional status check. */
export async function resolveFacebookPost(actor: { id: string; name: string }, articleId: string, action: 'queue' | 'record', postId: string) {
  const now = Date.now();
  if (action === 'record' && !new RegExp(`^${env.FACEBOOK_PAGE_ID}_\\d+$`).test(postId)) return false;
  const update = action === 'queue'
    ? env.DB.prepare(`UPDATE facebook_posts SET status = 'pending', attempts = 0, next_attempt_at = ?,
        last_error = NULL, claim_id = NULL, updated_at = ? WHERE article_id = ? AND status IN ('review', 'failed', 'uncertain')
        AND EXISTS (SELECT 1 FROM news_articles WHERE id = ? AND status = 'published')`).bind(now, now, articleId, articleId)
    : env.DB.prepare(`UPDATE facebook_posts SET status = 'posted', post_id = ?, page_id = ?, posted_at = ?,
        last_error = NULL, claim_id = NULL, updated_at = ? WHERE article_id = ? AND status IN ('review', 'failed', 'uncertain', 'pending')`)
      .bind(postId, env.FACEBOOK_PAGE_ID, now, now, articleId);
  const results = await env.DB.batch([
    update,
    env.DB.prepare(`INSERT INTO admin_audit_log (id, actor_id, actor_name, target_label, action, detail, created_at)
      SELECT ?, ?, ?, a.headline, ?, ?, ? FROM news_articles a WHERE a.id = ? AND changes() = 1`)
      .bind(crypto.randomUUID(), actor.id, actor.name, action === 'queue' ? 'facebook_queue' : 'facebook_record',
        action === 'queue' ? `Story ${articleId}: staff checked the Page before queuing.` : `Story ${articleId}: staff recorded existing Page post ${postId}.`, now, articleId),
  ]);
  return results[0].meta.changes === 1;
}
