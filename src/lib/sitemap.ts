import { env } from 'cloudflare:workers';
import { SECTIONS } from './news';

type SitemapEntry = { path: string; lastmod?: number };

// A single sitemap file holds at most 50,000 URLs; split into a sitemap index before content nears that.
const MAX_URLS = 50000;

const STATIC_PATHS = ['/', '/news', ...Object.keys(SECTIONS).map((s) => `/news?section=${s}`), '/events', '/talk', '/submit-news', '/contact', '/advertise', '/privacy'];

export async function sitemapEntries(): Promise<SitemapEntry[]> {
  const [articles, events, threads] = await env.DB.batch<{ path: string; lastmod: number }>([
    env.DB.prepare(`
      SELECT '/news/' || slug AS path, MAX(published_at, updated_at) AS lastmod
      FROM news_articles WHERE status = 'published'
      ORDER BY published_at DESC LIMIT ?
    `).bind(MAX_URLS),
    env.DB.prepare(`
      SELECT '/events/' || slug AS path, updated_at AS lastmod
      FROM events WHERE status != 'draft'
      ORDER BY starts_on DESC LIMIT ?
    `).bind(MAX_URLS),
    env.DB.prepare(`
      SELECT '/talk/' || id AS path, last_activity_at AS lastmod
      FROM forum_threads WHERE status = 'published' AND article_id IS NULL AND event_id IS NULL
      ORDER BY last_activity_at DESC LIMIT ?
    `).bind(MAX_URLS),
  ]);
  return [...STATIC_PATHS.map((path) => ({ path })), ...articles.results, ...events.results, ...threads.results].slice(0, MAX_URLS);
}

const escapeXml = (value: string) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function sitemapXml(origin: string, entries: SitemapEntry[]): string {
  const urls = entries.map(({ path, lastmod }) => {
    const loc = `<loc>${escapeXml(new URL(path, origin).href)}</loc>`;
    return `<url>${loc}${lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ''}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}
