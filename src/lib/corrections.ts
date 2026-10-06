import { env } from 'cloudflare:workers';

export type CorrectionKind = 'news' | 'event';
export type CorrectionStatus = 'open' | 'corrected' | 'declined';

export const KIND_LABELS: Record<CorrectionKind, string> = { news: 'Story', event: 'Event' };
export const STATUS_LABELS: Record<CorrectionStatus, string> = { open: 'Open', corrected: 'Corrected', declined: 'Declined' };

export type Correction = {
  id: string;
  kind: CorrectionKind;
  article_id: string | null;
  event_id: string | null;
  item_title: string;
  item_slug: string;
  submitter_user_id: string | null;
  account_name: string | null;
  resolver_name: string | null;
  name: string;
  email: string;
  details: string;
  suggested_fix: string;
  source_url: string;
  status: CorrectionStatus;
  resolution_note: string;
  resolved_at: number | null;
  created_at: number;
};

export function correctionKind(value: string | null): CorrectionKind | null {
  return value === 'news' || value === 'event' ? value : null;
}

/** The public page a correction is about, or null if it isn't live (drafts can't be reported). */
export async function correctionTarget(kind: CorrectionKind, slug: string): Promise<{ id: string; title: string; slug: string; path: string } | null> {
  const row = kind === 'news'
    ? await env.DB.prepare("SELECT id, headline AS title, slug FROM news_articles WHERE slug = ? AND status = 'published'").bind(slug).first<{ id: string; title: string; slug: string }>()
    : await env.DB.prepare("SELECT id, title, slug FROM events WHERE slug = ? AND status != 'draft'").bind(slug).first<{ id: string; title: string; slug: string }>();
  return row && { ...row, path: `${kind === 'news' ? '/news' : '/events'}/${row.slug}` };
}

export async function createCorrection(input: {
  kind: CorrectionKind; targetId: string; title: string; slug: string; userId: string | null;
  name: string; email: string; details: string; suggestedFix: string; sourceUrl: string;
}): Promise<string> {
  const id = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare(`INSERT INTO corrections
    (id, kind, article_id, event_id, item_title, item_slug, submitter_user_id, name, email, details, suggested_fix, source_url, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`)
    .bind(id, input.kind, input.kind === 'news' ? input.targetId : null, input.kind === 'event' ? input.targetId : null,
      input.title, input.slug, input.userId, input.name, input.email, input.details, input.suggestedFix, input.sourceUrl, now, now).run();
  return id;
}

const SELECT = `SELECT c.*, u.name AS account_name, r.name AS resolver_name
  FROM corrections c LEFT JOIN "user" u ON u.id = c.submitter_user_id LEFT JOIN "user" r ON r.id = c.resolved_by`;

export async function listCorrections(status: CorrectionStatus | null): Promise<Correction[]> {
  const where = status ? 'WHERE c.status = ?' : '';
  const stmt = env.DB.prepare(`${SELECT} ${where} ORDER BY c.created_at DESC LIMIT 200`);
  return (await (status ? stmt.bind(status) : stmt).all<Correction>()).results;
}

export async function getCorrection(id: string): Promise<Correction | null> {
  return env.DB.prepare(`${SELECT} WHERE c.id = ?`).bind(id).first<Correction>();
}

export async function openCorrectionCount(): Promise<number> {
  return (await env.DB.prepare("SELECT COUNT(*) AS n FROM corrections WHERE status = 'open'").first<{ n: number }>())?.n ?? 0;
}

/** Open requests against one story or event, shown on its admin edit page. */
export async function openCorrectionsFor(kind: CorrectionKind, id: string): Promise<{ id: string; details: string }[]> {
  const column = kind === 'news' ? 'article_id' : 'event_id';
  return (await env.DB.prepare(`SELECT id, details FROM corrections WHERE ${column} = ? AND status = 'open' ORDER BY created_at`).bind(id).all<{ id: string; details: string }>()).results;
}

export async function resolveCorrection(id: string, status: CorrectionStatus, note: string, staffId: string): Promise<boolean> {
  const now = Date.now();
  const reopened = status === 'open';
  const result = await env.DB.prepare('UPDATE corrections SET status = ?, resolution_note = ?, resolved_by = ?, resolved_at = ?, updated_at = ? WHERE id = ?')
    .bind(status, reopened ? '' : note, reopened ? null : staffId, reopened ? null : now, now, id).run();
  return result.meta.changes > 0;
}
