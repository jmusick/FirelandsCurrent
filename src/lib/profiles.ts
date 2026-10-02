import { env } from 'cloudflare:workers';

export const PROFILE_PAGE_SIZE = 20;
export type ProfileTab = 'articles' | 'topics' | 'replies';
export type ProfileItem = { id: string; title: string; body: string; path: string; created_at: number };

export function getProfile(id: string) {
  if (!/^[\w-]{1,64}$/.test(id)) return Promise.resolve(null);
  return env.DB.prepare('SELECT id, name FROM "user" WHERE id = ?').bind(id).first<{ id: string; name: string }>();
}

export async function listAuthorAccounts(): Promise<{ id: string; name: string }[]> {
  const result = await env.DB.prepare('SELECT id, name FROM "user" WHERE id != ? ORDER BY name COLLATE NOCASE, id')
    .bind('newsroom').all<{ id: string; name: string }>();
  return result.results;
}

// Apply the same visibility rules as Talk of the Town, including the source story or event.
const visibleThread = `t.status = 'published' AND (t.article_id IS NULL OR a.status = 'published')
  AND (t.event_id IS NULL OR ev.status != 'draft')`;

export async function profileItems(id: string, tab: ProfileTab, page: number): Promise<ProfileItem[]> {
  const queries: Record<ProfileTab, string> = {
    articles: `SELECT id, headline AS title, summary AS body, '/news/' || slug AS path, published_at AS created_at
      FROM news_articles WHERE author_id = ? AND status = 'published'`,
    topics: `SELECT t.id, COALESCE(a.headline, ev.title, t.title) AS title,
      COALESCE(a.summary, ev.summary, t.body) AS body, '/talk/' || t.id AS path, t.created_at
      FROM forum_threads t LEFT JOIN news_articles a ON a.id = t.article_id LEFT JOIN events ev ON ev.id = t.event_id
      WHERE t.author_id = ? AND ${visibleThread}`,
    replies: `SELECT r.id, COALESCE(a.headline, ev.title, t.title) AS title, r.body,
      '/talk/' || t.id AS path, r.created_at
      FROM forum_replies r JOIN forum_threads t ON t.id = r.thread_id
      LEFT JOIN news_articles a ON a.id = t.article_id LEFT JOIN events ev ON ev.id = t.event_id
      WHERE r.author_id = ? AND r.status = 'published' AND ${visibleThread}`,
  };
  const result = await env.DB.prepare(`SELECT * FROM (${queries[tab]}) ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
    .bind(id, PROFILE_PAGE_SIZE + 1, page * PROFILE_PAGE_SIZE).all<ProfileItem>();
  return result.results;
}
