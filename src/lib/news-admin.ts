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
  /** Media library item shown above the story and in story lists; empty for none. */
  lead_media_id: string;
  status: ArticleStatus;
};

export type ArticleFormResult =
  | { ok: true; id: string }
  | { ok: false; values: ArticleFormValues; errors: string[] };

export const emptyArticle: ArticleFormValues = {
  headline: '', slug: '', summary: '', body: '', section: '', community: '', byline: '', lead_media_id: '', status: 'draft',
};

export function valuesFromArticle(article: AdminArticle): ArticleFormValues {
  const { headline, slug, summary, body, section, community, byline, status } = article;
  return { headline, slug, summary, body, section, community, byline, lead_media_id: article.lead_media_id ?? '', status };
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
    lead_media_id: cleanText(form.get('lead_media_id')),
    status: cleanText(form.get('status')) === 'published' ? 'published' : 'draft',
  };

  const errors: string[] = [];
  if (values.headline.length < 8 || values.headline.length > 160) errors.push('Headline must be 8–160 characters.');
  if (!values.slug) errors.push('URL slug is required.');
  if (values.summary.length < 20 || values.summary.length > 400) errors.push('Summary must be 20–400 characters.');
  if (values.body.length < 20 || values.body.length > 50000) errors.push('Story text must be 20–50,000 characters.');
  if (!values.section) errors.push('Choose a section.');
  if (!values.community || values.community.length > 60) errors.push('Community is required (up to 60 characters).');
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
  await env.DB.prepare(`
    INSERT INTO news_articles (id, slug, headline, summary, body, section, community, byline, lead_media_id, status, published_at, created_at, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?12, ?9, ?10, ?11, ?11)
    ON CONFLICT(id) DO UPDATE SET
      slug = excluded.slug, headline = excluded.headline, summary = excluded.summary, body = excluded.body,
      section = excluded.section, community = excluded.community, byline = excluded.byline, lead_media_id = excluded.lead_media_id,
      status = excluded.status, published_at = excluded.published_at, updated_at = excluded.updated_at
  `).bind(id, values.slug, values.headline, values.summary, values.body, values.section, values.community,
    values.byline, values.status, publishedAt, now, values.lead_media_id || null).run();
  if (publishedAt !== null && values.status === 'published') await ensureArticleThread({ id, headline: values.headline, summary: values.summary, published_at: publishedAt });
  return { ok: true, id };
}
