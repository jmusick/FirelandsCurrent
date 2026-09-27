import { env } from 'cloudflare:workers';
import { Marked } from 'marked';

export const SECTIONS = {
  local: 'Local News',
  government: 'Government',
  business: 'Business',
  schools: 'Schools',
  community: 'Community',
  outdoors: 'Outdoors',
} as const;

export type Section = keyof typeof SECTIONS;
export type ArticleStatus = 'draft' | 'published';

export type Article = {
  id: string;
  slug: string;
  headline: string;
  summary: string;
  body: string;
  section: Section;
  community: string;
  byline: string;
  published_at: number;
};

export type AdminArticle = Omit<Article, 'published_at'> & {
  status: ArticleStatus;
  published_at: number | null;
  updated_at: number;
};

export function isSection(value: string | null | undefined): value is Section {
  return typeof value === 'string' && Object.hasOwn(SECTIONS, value);
}

export async function listArticles(page = 0, section?: Section, pageSize = 20): Promise<Article[]> {
  const result = await env.DB.prepare(`
    SELECT id, slug, headline, summary, body, section, community, byline, published_at
    FROM news_articles
    WHERE status = 'published' AND (?1 IS NULL OR section = ?1)
    ORDER BY published_at DESC
    LIMIT ?2 OFFSET ?3
  `).bind(section ?? null, pageSize + 1, page * pageSize).all<Article>();
  return result.results;
}

export async function getArticle(slug: string): Promise<Article | null> {
  return env.DB.prepare(`
    SELECT id, slug, headline, summary, body, section, community, byline, published_at
    FROM news_articles
    WHERE slug = ? AND status = 'published'
  `).bind(slug).first<Article>();
}

export async function listAdminArticles(): Promise<AdminArticle[]> {
  const result = await env.DB.prepare(`
    SELECT id, slug, headline, summary, body, section, community, byline, status, published_at, updated_at
    FROM news_articles
    ORDER BY COALESCE(published_at, updated_at) DESC
  `).all<AdminArticle>();
  return result.results;
}

export async function getAdminArticle(id: string): Promise<AdminArticle | null> {
  return env.DB.prepare(`
    SELECT id, slug, headline, summary, body, section, community, byline, status, published_at, updated_at
    FROM news_articles
    WHERE id = ?
  `).bind(id).first<AdminArticle>();
}

export function sanitizeSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const safeUrl = (href: string) => /^(https?:|mailto:|\/(?!\/)|#)/i.test(href.trim());

// Story bodies are Markdown. Raw HTML is shown as text and only http(s), mailto,
// site-relative and fragment links are rendered, so an editor account can't inject script.
const markdown = new Marked({
  gfm: true,
  renderer: {
    html({ text }) {
      return escapeHtml(text);
    },
    link({ href, title, tokens }) {
      const label = this.parser.parseInline(tokens);
      if (!safeUrl(href)) return label;
      const external = /^https?:/i.test(href);
      return `<a href="${escapeHtml(href)}"${title ? ` title="${escapeHtml(title)}"` : ''}${external ? ' rel="noopener"' : ''}>${label}</a>`;
    },
    image({ href, title, text }) {
      if (!safeUrl(href)) return escapeHtml(text);
      return `<img src="${escapeHtml(href)}" alt="${escapeHtml(text)}"${title ? ` title="${escapeHtml(title)}"` : ''} loading="lazy" />`;
    },
  },
});

export function renderBody(body: string): string {
  return markdown.parse(body, { async: false });
}

/** The body rendered as its top-level blocks (paragraphs, headings, lists…), so ads can sit between them. */
export function renderBodyBlocks(body: string): string[] {
  const tokens = markdown.lexer(body);
  return tokens.filter((t) => t.type !== 'space' && t.type !== 'def').map((t) => markdown.parser(Object.assign([t], { links: tokens.links })));
}
