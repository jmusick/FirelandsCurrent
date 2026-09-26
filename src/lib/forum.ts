import { env } from 'cloudflare:workers';

export type Thread = {
  id: string;
  author_id: string;
  author_name: string;
  title: string;
  body: string;
  created_at: number;
  last_activity_at: number;
  reply_count: number;
};

export type Reply = {
  id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: number;
};

export async function listThreads(page = 0): Promise<Thread[]> {
  const result = await env.DB.prepare(`
    SELECT t.id, t.author_id, u.name AS author_name, t.title, t.body,
           t.created_at, t.last_activity_at,
           COUNT(r.id) AS reply_count
    FROM forum_threads t
    JOIN "user" u ON u.id = t.author_id
    LEFT JOIN forum_replies r ON r.thread_id = t.id AND r.status = 'published'
    WHERE t.status = 'published'
    GROUP BY t.id
    ORDER BY t.last_activity_at DESC
    LIMIT 21 OFFSET ?
  `).bind(page * 20).all<Thread>();
  return result.results;
}

export async function getThread(id: string): Promise<Thread | null> {
  return env.DB.prepare(`
    SELECT t.id, t.author_id, u.name AS author_name, t.title, t.body,
           t.created_at, t.last_activity_at,
           COUNT(r.id) AS reply_count
    FROM forum_threads t
    JOIN "user" u ON u.id = t.author_id
    LEFT JOIN forum_replies r ON r.thread_id = t.id AND r.status = 'published'
    WHERE t.id = ? AND t.status = 'published'
    GROUP BY t.id
  `).bind(id).first<Thread>();
}

export async function listReplies(threadId: string, page = 0): Promise<Reply[]> {
  const result = await env.DB.prepare(`
    SELECT r.id, r.author_id, u.name AS author_name, r.body, r.created_at
    FROM forum_replies r
    JOIN "user" u ON u.id = r.author_id
    WHERE r.thread_id = ? AND r.status = 'published'
    ORDER BY r.created_at ASC
    LIMIT 100 OFFSET ?
  `).bind(threadId, page * 100).all<Reply>();
  return result.results;
}

export async function isModerator(userId: string): Promise<boolean> {
  const row = await env.DB.prepare('SELECT user_id FROM forum_moderators WHERE user_id = ?').bind(userId).first();
  return row !== null;
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  return origin !== null && origin === new URL(request.url).origin;
}

export function cleanText(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function redirectWithError(request: Request, path: string, error: string): Response {
  const url = new URL(path, request.url);
  url.searchParams.set('error', error);
  return Response.redirect(url, 303);
}
