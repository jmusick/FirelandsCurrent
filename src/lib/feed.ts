import { env } from 'cloudflare:workers';
import { SECTIONS, listArticles, type Article, type Section } from './news';

const FEED_SIZE = 30;

const escapeXml = (value: string) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
// Control characters are illegal in XML, so they are stripped before escaping.
const text = (value: string) => escapeXml(value.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ''));
const cdata = (value: string) => `<![CDATA[${value.replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`;

type FeedArticle = Article & { updated_at: number };

/** The newest published stories, optionally from one section, with each story's last edit time. */
export async function feedArticles(section?: Section): Promise<FeedArticle[]> {
  const stories = (await listArticles(0, section, FEED_SIZE)).slice(0, FEED_SIZE);
  if (!stories.length) return [];
  const rows = await env.DB.prepare(`SELECT id, updated_at FROM news_articles WHERE id IN (${stories.map(() => '?').join(',')})`)
    .bind(...stories.map((s) => s.id)).all<{ id: string; updated_at: number }>();
  const updated = new Map(rows.results.map((r) => [r.id, r.updated_at]));
  return stories.map((s) => ({ ...s, updated_at: Math.max(updated.get(s.id) ?? 0, s.published_at) }));
}

const mediaType = (key: string) => (/\.png$/i.test(key) ? 'image/png' : /\.gif$/i.test(key) ? 'image/gif' : /\.webp$/i.test(key) ? 'image/webp' : 'image/jpeg');
const DESCRIPTION = 'Independent local news and conversation for Sandusky and the Firelands.';

/** RSS 2.0 carrying each story's summary and lead image; the full text stays on the site. */
export function rssXml(origin: string, stories: FeedArticle[], section?: Section): string {
  const abs = (path: string) => new URL(path, origin).href;
  const title = section ? `Firelands Current — ${SECTIONS[section]}` : 'Firelands Current';
  const items = stories.map((s) => {
    const link = abs(`/news/${s.slug}`);
    const image = s.lead_key ? abs(`/media/${s.lead_key}`) : null;
    const html = `${image ? `<p><img src="${escapeXml(image)}" alt="${escapeXml(s.lead_alt ?? '')}" width="${s.lead_width}" height="${s.lead_height}" /></p>` : ''}<p>${escapeXml(s.summary)}</p><p><a href="${escapeXml(link)}">Continue reading at Firelands Current</a></p>`;
    const credit = s.lead_credit ? `<media:credit>${text(s.lead_credit)}</media:credit>` : '';
    return [
      '<item>',
      `<title>${text(s.headline)}</title>`,
      `<link>${escapeXml(link)}</link>`,
      `<guid isPermaLink="true">${escapeXml(link)}</guid>`,
      `<pubDate>${new Date(s.published_at).toUTCString()}</pubDate>`,
      `<dc:creator>${text(s.byline)}</dc:creator>`,
      `<category>${text(SECTIONS[s.section])}</category>`,
      `<description>${text(s.summary)}</description>`,
      `<content:encoded>${cdata(html)}</content:encoded>`,
      image ? `<media:content url="${escapeXml(image)}" medium="image" type="${mediaType(s.lead_key!)}" width="${s.lead_width}" height="${s.lead_height}">${credit}</media:content>` : '',
      '</item>',
    ].filter(Boolean).join('\n');
  });
  const newest = stories.reduce((m, s) => Math.max(m, s.updated_at), 0);
  // The stylesheet only makes the feed readable in a browser; feed readers ignore it.
  return `<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="/rss.xsl"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">\n<channel>\n`
    + `<title>${text(title)}</title>\n<link>${escapeXml(abs(section ? `/news?section=${section}` : '/news'))}</link>\n`
    + `<description>${DESCRIPTION}</description>\n<language>en-us</language>\n`
    + `<atom:link href="${escapeXml(abs(section ? `/rss.xml?section=${section}` : '/rss.xml'))}" rel="self" type="application/rss+xml" />\n`
    + (newest ? `<lastBuildDate>${new Date(newest).toUTCString()}</lastBuildDate>\n` : '')
    + `${items.join('\n')}\n</channel>\n</rss>\n`;
}

/** JSON Feed 1.1, for readers that prefer it. */
export function jsonFeed(origin: string, stories: FeedArticle[], section?: Section) {
  const abs = (path: string) => new URL(path, origin).href;
  return {
    version: 'https://jsonfeed.org/version/1.1',
    title: section ? `Firelands Current — ${SECTIONS[section]}` : 'Firelands Current',
    home_page_url: abs('/news'),
    feed_url: abs(section ? `/feed.json?section=${section}` : '/feed.json'),
    description: DESCRIPTION,
    language: 'en-US',
    icon: abs('/logo-mark.svg'),
    items: stories.map((s) => ({
      id: abs(`/news/${s.slug}`),
      url: abs(`/news/${s.slug}`),
      title: s.headline,
      summary: s.summary,
      ...(s.lead_key && { image: abs(`/media/${s.lead_key}`) }),
      date_published: new Date(s.published_at).toISOString(),
      date_modified: new Date(s.updated_at).toISOString(),
      authors: [{ name: s.byline }],
      tags: [SECTIONS[s.section]],
    })),
  };
}
