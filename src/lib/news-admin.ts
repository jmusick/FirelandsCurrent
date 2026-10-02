import { env } from 'cloudflare:workers';
import { cleanText, ensureArticleThread } from './forum';
import { isMediaId } from './media';
import { type AdminArticle, type ArticleStatus, type Section, isSection, sanitizeSlug } from './news';

export type ArticleFormValues = {
  headline: string;
  slug: string;
  summary: string;
  body: string;
  section: Section | '';
  community: string;
  byline: string;
  author_id: string;
  /** Media library item shown above the story and in story lists; empty for none. */
  lead_media_id: string;
  /** Pinned as the large lead story on the front page; only one story is featured at a time. */
  featured: boolean;
  status: ArticleStatus;
};

export type ArticleFormResult =
  | { ok: true; id: string }
  | { ok: false; values: ArticleFormValues; errors: string[] };

export const emptyArticle: ArticleFormValues = {
  headline: '', slug: '', summary: '', body: '', section: '', community: '', byline: '', author_id: '', lead_media_id: '', featured: false, status: 'draft',
};

export function valuesFromArticle(article: AdminArticle): ArticleFormValues {
  const { headline, slug, summary, body, section, community, byline, status } = article;
  return { headline, slug, summary, body, section, community, byline, author_id: article.author_id ?? '', lead_media_id: article.lead_media_id ?? '', featured: article.featured === 1, status };
}

export async function saveArticleFromForm(form: FormData, existing: AdminArticle | null): Promise<ArticleFormResult> {
  const section = cleanText(form.get('section'));
  const headline = cleanText(form.get('headline'));
  const values: ArticleFormValues = {
    headline,
    slug: sanitizeSlug(cleanText(form.get('slug')) || headline),
    summary: cleanText(form.get('summary')),
    body: cleanText(form.get('body')),
    section: isSection(section) ? section : '',
    community: cleanText(form.get('community')),
    byline: cleanText(form.get('byline')),
    author_id: cleanText(form.get('author_id')),
    lead_media_id: cleanText(form.get('lead_media_id')),
    featured: form.get('featured') === '1',
    status: cleanText(form.get('status')) === 'published' ? 'published' : 'draft',
  };

  const errors: string[] = [];
  if (values.headline.length < 8 || values.headline.length > 160) errors.push('Headline must be 8–160 characters.');
  if (!values.slug) errors.push('URL slug is required.');
  if (values.summary.length < 20 || values.summary.length > 400) errors.push('Summary must be 20–400 characters.');
  if (values.body.length < 20 || values.body.length > 50000) errors.push('Story text must be 20–50,000 characters.');
  if (!values.section) errors.push('Choose a section.');
  if (!values.community || values.community.length > 60) errors.push('Community is required (up to 60 characters).');
  if (values.author_id) {
    const author = /^[\w-]{1,64}$/.test(values.author_id)
      ? await env.DB.prepare('SELECT name FROM "user" WHERE id = ? AND id != ?').bind(values.author_id, 'newsroom').first<{ name: string }>()
      : null;
    if (!author) errors.push('Choose an existing author account.');
    else values.byline = author.name;
  }
  if (!values.byline || values.byline.length > 80) errors.push('Byline is required (up to 80 characters).');

  if (values.lead_media_id && !(isMediaId(values.lead_media_id) && await env.DB.prepare('SELECT 1 FROM media WHERE id = ?').bind(values.lead_media_id).first())) {
    errors.push('The lead image is no longer in the media library. Choose another.');
    values.lead_media_id = '';
  }

  if (!errors.length) {
    const clash = await env.DB.prepare('SELECT id FROM news_articles WHERE slug = ? AND id != ?')
      .bind(values.slug, existing?.id ?? '').first();
    if (clash) errors.push('Another story already uses that URL slug.');
  }
  if (errors.length) return { ok: false, values, errors };

  const now = Date.now();
  // Keep the original publish date if a story is unpublished and later republished.
  const publishedAt = values.status === 'published' ? existing?.published_at ?? now : existing?.published_at ?? null;
  const id = existing?.id ?? crypto.randomUUID();
  const save = env.DB.prepare(`
    INSERT INTO news_articles (id, slug, headline, summary, body, section, community, byline, author_id, lead_media_id, featured, status, published_at, created_at, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?14, ?12, ?13, ?9, ?10, ?11, ?11)
    ON CONFLICT(id) DO UPDATE SET
      slug = excluded.slug, headline = excluded.headline, summary = excluded.summary, body = excluded.body,
      section = excluded.section, community = excluded.community, byline = excluded.byline, author_id = excluded.author_id, lead_media_id = excluded.lead_media_id,
      featured = excluded.featured, status = excluded.status, published_at = excluded.published_at, updated_at = excluded.updated_at
  `).bind(id, values.slug, values.headline, values.summary, values.body, values.section, values.community,
    values.byline, values.status, publishedAt, now, values.lead_media_id || null, values.featured ? 1 : 0, values.author_id || null);
  // One featured story at a time: featuring this one un-features the rest, in the same batch as the save.
  await env.DB.batch(values.featured
    ? [env.DB.prepare('UPDATE news_articles SET featured = 0 WHERE featured = 1 AND id != ?').bind(id), save]
    : [save]);
  if (publishedAt !== null && values.status === 'published') await ensureArticleThread({ id, headline: values.headline, summary: values.summary, published_at: publishedAt });
  return { ok: true, id };
}
