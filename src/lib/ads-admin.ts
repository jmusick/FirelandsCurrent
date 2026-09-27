import { env } from 'cloudflare:workers';
import { statDay } from './ad-tracking';
import { DEFAULT_THEME, IMAGE_SIZES, PLACEMENTS, adFromRow, isPlacement, type Ad, type AdImageRow, type AdRow, type ImageSize, type PlacementKey } from './ads';
import { cleanText } from './forum';
import { SECTIONS, isSection, type Section } from './news';

export type AdStatus = 'draft' | 'active' | 'paused';
/** What an ad is actually doing, from its status, dates and cap. */
export type AdState = 'draft' | 'scheduled' | 'running' | 'paused' | 'ended' | 'completed';

export const STATUS_LABELS: Record<AdStatus, string> = { draft: 'Draft', active: 'Active', paused: 'Paused' };
export const STATE_LABELS: Record<AdState, string> = {
  draft: 'Draft', scheduled: 'Scheduled', running: 'Running', paused: 'Paused', ended: 'Ended', completed: 'Cap reached',
};
export const isStatus = (v: string): v is AdStatus => v in STATUS_LABELS;
export const isState = (v: string): v is AdState => v in STATE_LABELS;

// ?1 is today's date. Shared by every query that needs an ad's state.
const STATE_SQL = `CASE
  WHEN a.status = 'draft' THEN 'draft'
  WHEN a.status = 'paused' THEN 'paused'
  WHEN a.ends_on IS NOT NULL AND a.ends_on < ?1 THEN 'ended'
  WHEN a.impression_cap IS NOT NULL AND a.impressions >= a.impression_cap THEN 'completed'
  WHEN a.starts_on IS NOT NULL AND a.starts_on > ?1 THEN 'scheduled'
  ELSE 'running' END`;

export type AdRecord = {
  id: string; business_id: string; business_name: string; business_status: 'active' | 'archived';
  name: string; status: AdStatus; state: AdState;
  headline: string; body: string; cta: string; href: string;
  theme_bg: string; theme_fg: string; theme_accent: string;
  placements: string; sections: string; weight: number;
  starts_on: string | null; ends_on: string | null; impression_cap: number | null; terms: string | null;
  impressions: number; clicks: number; created_at: number; updated_at: number;
};

export type AdFilters = { q: string; business: string; state: '' | AdState };

export function adFiltersFrom(params: URLSearchParams): AdFilters {
  const state = params.get('state') ?? '';
  return { q: (params.get('q') ?? '').trim().slice(0, 100), business: (params.get('business') ?? '').trim().slice(0, 64), state: isState(state) ? state : '' };
}

export async function listAds(filters: AdFilters, opts: { includeDrafts?: boolean } = {}): Promise<AdRecord[]> {
  const where: string[] = [];
  const binds: unknown[] = [statDay()];
  if (filters.q) {
    const like = `%${filters.q.toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    where.push("(lower(a.name) LIKE ? ESCAPE '\\' OR lower(a.headline) LIKE ? ESCAPE '\\' OR lower(b.name) LIKE ? ESCAPE '\\')");
    binds.push(like, like, like);
  }
  if (filters.business) { where.push('a.business_id = ?'); binds.push(filters.business); }
  if (opts.includeDrafts === false) where.push("a.status != 'draft'");
  const result = await env.DB.prepare(`
    SELECT * FROM (
      SELECT a.*, b.name AS business_name, b.status AS business_status, ${STATE_SQL} AS state
      FROM ads a JOIN businesses b ON b.id = a.business_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    )
    ${filters.state ? 'WHERE state = ?' : ''}
    ORDER BY CASE state WHEN 'running' THEN 0 WHEN 'scheduled' THEN 1 WHEN 'paused' THEN 2 WHEN 'draft' THEN 3 ELSE 4 END, updated_at DESC
    LIMIT 500
  `).bind(...binds, ...(filters.state ? [filters.state] : [])).all<AdRecord>();
  return result.results;
}

export async function getAd(id: string): Promise<{ record: AdRecord; ad: Ad; images: AdImageRow[] } | null> {
  const [rows, images] = await env.DB.batch([
    env.DB.prepare(`SELECT a.*, b.name AS business_name, b.status AS business_status, ${STATE_SQL} AS state FROM ads a JOIN businesses b ON b.id = a.business_id WHERE a.id = ?2`).bind(statDay(), id),
    env.DB.prepare('SELECT ad_id, size, object_key, width, height FROM ad_images WHERE ad_id = ?').bind(id),
  ]);
  const record = rows.results[0] as AdRecord | undefined;
  if (!record) return null;
  return { record, ad: adFromRecord(record, images.results as AdImageRow[]), images: images.results as AdImageRow[] };
}

export function adFromRecord(record: AdRecord, images: AdImageRow[]): Ad {
  return adFromRow({ ...record, advertiser: record.business_name } satisfies AdRow, images);
}

/** An ad's images, for list previews. */
export async function imagesFor(adIds: string[]): Promise<AdImageRow[]> {
  if (!adIds.length) return [];
  const result = await env.DB.prepare(`SELECT ad_id, size, object_key, width, height FROM ad_images WHERE ad_id IN (${adIds.map(() => '?').join(',')})`).bind(...adIds).all<AdImageRow>();
  return result.results;
}

// ---- The ad form ----

export type AdFormValues = {
  business_id: string; name: string; status: AdStatus;
  headline: string; body: string; cta: string; href: string;
  theme_bg: string; theme_fg: string; theme_accent: string;
  placements: PlacementKey[]; sections: Section[]; weight: string;
  starts_on: string; ends_on: string; impression_cap: string; terms: string;
};

export const emptyAd = (businessId = ''): AdFormValues => ({
  business_id: businessId, name: '', status: 'draft', headline: '', body: '', cta: 'Learn more', href: '',
  theme_bg: DEFAULT_THEME.bg, theme_fg: DEFAULT_THEME.fg, theme_accent: DEFAULT_THEME.accent,
  placements: [], sections: [], weight: '5', starts_on: '', ends_on: '', impression_cap: '', terms: '',
});

export function valuesFromRecord(r: AdRecord): AdFormValues {
  const list = <T extends string>(json: string, ok: (v: string) => v is T) => { try { return (JSON.parse(json) as string[]).filter(ok); } catch { return []; } };
  return {
    business_id: r.business_id, name: r.name, status: r.status, headline: r.headline, body: r.body, cta: r.cta, href: r.href,
    theme_bg: r.theme_bg, theme_fg: r.theme_fg, theme_accent: r.theme_accent,
    placements: (Object.keys(PLACEMENTS) as PlacementKey[]).filter((k) => list(r.placements, isPlacement).includes(k)),
    sections: (Object.keys(SECTIONS) as Section[]).filter((k) => list(r.sections, isSection).includes(k)),
    weight: String(r.weight),
    starts_on: r.starts_on ?? '', ends_on: r.ends_on ?? '', impression_cap: r.impression_cap ? String(r.impression_cap) : '', terms: r.terms ?? '',
  };
}

export type ImageUpload = { size: ImageSize; bytes: ArrayBuffer; type: string; ext: string; width: number; height: number };
export type AdFormResult =
  | { ok: true; values: AdFormValues; uploads: ImageUpload[]; removals: ImageSize[] }
  | { ok: false; values: AdFormValues; errors: string[] };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const COLOR = /^#[0-9a-f]{6}$/i;
const MAX_IMAGE_BYTES = 1024 * 1024;

export async function validateAdForm(form: FormData, existing: AdRecord | null): Promise<AdFormResult> {
  const status = cleanText(form.get('status'));
  let href = cleanText(form.get('href'));
  if (href && !/^https?:\/\//i.test(href)) href = `https://${href}`;
  const values: AdFormValues = {
    business_id: cleanText(form.get('business_id')),
    name: cleanText(form.get('name')),
    status: isStatus(status) ? status : 'draft',
    headline: cleanText(form.get('headline')),
    body: cleanText(form.get('body')),
    cta: cleanText(form.get('cta')),
    href,
    theme_bg: cleanText(form.get('theme_bg')).toLowerCase(),
    theme_fg: cleanText(form.get('theme_fg')).toLowerCase(),
    theme_accent: cleanText(form.get('theme_accent')).toLowerCase(),
    // Kept in a fixed order so re-saving the same choices never reads as a change.
    placements: (Object.keys(PLACEMENTS) as PlacementKey[]).filter((k) => form.getAll('placements').includes(k)),
    sections: (Object.keys(SECTIONS) as Section[]).filter((k) => form.getAll('sections').includes(k)),
    weight: cleanText(form.get('weight')) || '5',
    starts_on: cleanText(form.get('starts_on')),
    ends_on: cleanText(form.get('ends_on')),
    impression_cap: cleanText(form.get('impression_cap')).replace(/[,\s]/g, ''),
    terms: cleanText(form.get('terms')),
  };

  const errors: string[] = [];
  const business = values.business_id
    ? await env.DB.prepare('SELECT id, status FROM businesses WHERE id = ?').bind(values.business_id).first<{ id: string; status: string }>()
    : null;
  if (!business) errors.push('Choose the business this ad is for.');
  else if (business.status !== 'active' && business.id !== existing?.business_id) errors.push('That business is archived. Restore it before giving it new ads.');
  if (values.name.length < 2 || values.name.length > 120) errors.push('Ad name must be 2–120 characters.');
  if (values.headline.length < 2 || values.headline.length > 70) errors.push('Headline must be 2–70 characters.');
  if (values.body.length > 150) errors.push('Text must be under 150 characters.');
  if (values.cta.length < 2 || values.cta.length > 30) errors.push('Button text must be 2–30 characters.');
  try {
    const url = new URL(values.href);
    if (!/^https?:$/.test(url.protocol) || values.href.length > 500) throw new Error();
  } catch { errors.push('Link must be a valid web address.'); }
  if (![values.theme_bg, values.theme_fg, values.theme_accent].every((c) => COLOR.test(c))) errors.push('Colors must be hex values like #173d4a.');
  const weight = Number(values.weight);
  if (!Number.isInteger(weight) || weight < 1 || weight > 10) errors.push('Rotation weight must be 1–10.');
  for (const [label, date] of [['Start date', values.starts_on], ['End date', values.ends_on]] as const) {
    if (date && (!DATE.test(date) || Number.isNaN(Date.parse(date)))) errors.push(`${label} must be a valid date.`);
  }
  if (values.starts_on && values.ends_on && values.ends_on < values.starts_on) errors.push('End date must be on or after the start date.');
  if (values.impression_cap) {
    const cap = Number(values.impression_cap);
    if (!Number.isInteger(cap) || cap < 1 || cap > 1_000_000_000) errors.push('Impression cap must be a whole number, or blank for no cap.');
  }
  if (values.terms.length > 2000) errors.push('Price and terms must be under 2,000 characters.');

  const uploads: ImageUpload[] = [];
  const removals: ImageSize[] = [];
  for (const size of Object.keys(IMAGE_SIZES) as ImageSize[]) {
    const file = form.get(`image_${size}`);
    if (file instanceof File && file.size > 0) {
      const checked = await checkImage(file, size);
      if (typeof checked === 'string') errors.push(checked);
      else uploads.push(checked);
    } else if (form.get(`remove_${size}`) === 'on') removals.push(size);
  }
  if (errors.length && uploads.length) errors.push('Choose your image files again after fixing these.');

  return errors.length ? { ok: false, values, errors } : { ok: true, values, uploads, removals };
}

const IMAGE_TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' };

async function checkImage(file: File, size: ImageSize): Promise<ImageUpload | string> {
  const spec = IMAGE_SIZES[size];
  const label = `${spec.label} image`;
  if (file.size > MAX_IMAGE_BYTES) return `${label} must be under 1 MB.`;
  const bytes = await file.arrayBuffer();
  const sniffed = imageInfo(new Uint8Array(bytes));
  if (!sniffed) return `${label} must be a PNG, JPEG, GIF or WebP file.`;
  const { type, width, height } = sniffed;
  const fits = [1, 2].some((scale) => width === spec.width * scale && height === spec.height * scale);
  if (!fits) return `${label} is ${width}×${height}; it must be ${spec.width}×${spec.height} (or ${spec.width * 2}×${spec.height * 2}).`;
  return { size, bytes, type, ext: IMAGE_TYPES[type], width: spec.width, height: spec.height };
}

/** Reads an image's real type and pixel size from its header, ignoring the file name and claimed type. */
export function imageInfo(b: Uint8Array): { type: string; width: number; height: number } | null {
  const u16 = (i: number) => (b[i] << 8) | b[i + 1];
  const u32 = (i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
  const le16 = (i: number) => b[i] | (b[i + 1] << 8);
  const le24 = (i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
  const ascii = (i: number, n: number) => String.fromCharCode(...b.slice(i, i + n));
  if (b.length < 30) return null;
  if (b[0] === 0x89 && ascii(1, 3) === 'PNG') return { type: 'image/png', width: u32(16), height: u32(20) };
  if (ascii(0, 4) === 'GIF8') return { type: 'image/gif', width: le16(6), height: le16(8) };
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') {
    const chunk = ascii(12, 4);
    if (chunk === 'VP8X') return { type: 'image/webp', width: le24(24) + 1, height: le24(27) + 1 };
    if (chunk === 'VP8 ') return { type: 'image/webp', width: le16(26) & 0x3fff, height: le16(28) & 0x3fff };
    if (chunk === 'VP8L') { const v = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24); return { type: 'image/webp', width: (v & 0x3fff) + 1, height: ((v >> 14) & 0x3fff) + 1 }; }
    return null;
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { type: 'image/jpeg', width: u16(i + 7), height: u16(i + 5) };
      i += 2 + u16(i + 2);
    }
  }
  return null;
}

/** Statements to store new images and drop removed ones; returns the R2 keys to delete once the database is updated. */
export async function applyImages(adId: string, uploads: ImageUpload[], removals: ImageSize[], current: AdImageRow[]) {
  const now = Date.now();
  const statements: D1PreparedStatement[] = [];
  const staleKeys: string[] = [];
  for (const upload of uploads) {
    const key = `ads/${adId}/${upload.size}-${crypto.randomUUID().slice(0, 8)}.${upload.ext}`;
    await env.MEDIA.put(key, upload.bytes, { httpMetadata: { contentType: upload.type } });
    statements.push(env.DB.prepare(`
      INSERT INTO ad_images (ad_id, size, object_key, content_type, width, height, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (ad_id, size) DO UPDATE SET object_key = excluded.object_key, content_type = excluded.content_type, width = excluded.width, height = excluded.height, created_at = excluded.created_at
    `).bind(adId, upload.size, key, upload.type, upload.width, upload.height, now));
  }
  for (const size of removals) statements.push(env.DB.prepare('DELETE FROM ad_images WHERE ad_id = ? AND size = ?').bind(adId, size));
  const replaced = new Set<ImageSize>([...uploads.map((u) => u.size), ...removals]);
  for (const image of current) if (replaced.has(image.size)) staleKeys.push(image.object_key);
  return { statements, staleKeys };
}

export async function deleteMedia(keys: string[]) {
  if (keys.length) await env.MEDIA.delete(keys);
}

export const adBinds = (v: AdFormValues) => [
  v.name, v.status, v.headline, v.body, v.cta, v.href, v.theme_bg, v.theme_fg, v.theme_accent,
  JSON.stringify(v.placements), JSON.stringify(v.sections), Number(v.weight),
  v.starts_on || null, v.ends_on || null, v.impression_cap ? Number(v.impression_cap) : null, v.terms || null,
];

/** Human-readable list of what changed, for the audit log. */
export function describeAdChanges(before: AdFormValues, after: AdFormValues, businessNames: Record<string, string>): string {
  const show = (key: keyof AdFormValues, v: AdFormValues[keyof AdFormValues]): string => {
    if (Array.isArray(v)) return v.length ? v.map((x) => key === 'placements' ? PLACEMENTS[x as PlacementKey].label : SECTIONS[x as Section]).join(', ') : 'All';
    if (key === 'business_id') return businessNames[v] ?? v;
    if (key === 'status') return STATUS_LABELS[v as AdStatus];
    return v || '—';
  };
  const labels: Partial<Record<keyof AdFormValues, string>> = {
    business_id: 'Business', name: 'Name', status: 'Status', headline: 'Headline', cta: 'Button', href: 'Link',
    placements: 'Placements', sections: 'Sections', weight: 'Weight', starts_on: 'Starts', ends_on: 'Ends', impression_cap: 'Cap',
  };
  const changes = (Object.keys(labels) as (keyof AdFormValues)[])
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map((key) => `${labels[key]}: ${show(key, before[key])} → ${show(key, after[key])}`);
  if (before.body !== after.body) changes.push('Text edited');
  if (before.theme_bg !== after.theme_bg || before.theme_fg !== after.theme_fg || before.theme_accent !== after.theme_accent) changes.push('Colors changed');
  if (before.terms !== after.terms) changes.push('Terms edited');
  return changes.join('; ');
}

export function adAudit(actor: { id: string; name: string }, ad: { id: string; name: string }, business: { id: string; name: string }, action: string, detail?: string) {
  return env.DB.prepare(`
    INSERT INTO admin_audit_log (id, actor_id, actor_name, target_business_id, target_ad_id, target_label, action, detail, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(crypto.randomUUID(), actor.id, actor.name, business.id, ad.id, business.name, action, [ad.name, detail].filter(Boolean).join(' — '), Date.now());
}

export async function adAuditLog(adId: string) {
  const result = await env.DB.prepare('SELECT action, detail, actor_name, created_at FROM admin_audit_log WHERE target_ad_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 25')
    .bind(adId).all<{ action: string; detail: string | null; actor_name: string; created_at: number }>();
  return result.results;
}

// ---- Stats ----

export const RANGES = { 7: 'Last 7 days', 30: 'Last 30 days', 90: 'Last 90 days', 0: 'All time' } as const;
export type RangeDays = keyof typeof RANGES;

export function rangeFrom(params: URLSearchParams): RangeDays {
  const days = Number(params.get('range') ?? 30);
  return (days in RANGES ? days : 30) as RangeDays;
}

export type StatsScope = { adId: string } | { businessId: string } | { all: true };
export type DayStat = { day: string; impressions: number; clicks: number };
export type Stats = {
  range: RangeDays;
  totals: { impressions: number; clicks: number };
  daily: DayStat[];
  byPlacement: { placement: string; impressions: number; clicks: number }[];
  byAd: { ad_id: string; impressions: number; clicks: number }[];
};

const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

export async function getStats(scope: StatsScope, range: RangeDays): Promise<Stats> {
  const today = statDay();
  const [filter, bind] = 'adId' in scope ? ['s.ad_id = ?', scope.adId]
    : 'businessId' in scope ? ['s.ad_id IN (SELECT id FROM ads WHERE business_id = ?)', scope.businessId]
    : ['1 = ?', 1];
  const from = range ? addDays(today, -(range - 1)) : '0000-00-00';
  const where = `WHERE ${filter} AND s.day >= ?`;
  const [daily, placements, ads] = await env.DB.batch([
    env.DB.prepare(`SELECT s.day, SUM(s.impressions) AS impressions, SUM(s.clicks) AS clicks FROM ad_stats s ${where} GROUP BY s.day ORDER BY s.day`).bind(bind, from),
    env.DB.prepare(`SELECT s.placement, SUM(s.impressions) AS impressions, SUM(s.clicks) AS clicks FROM ad_stats s ${where} GROUP BY s.placement ORDER BY impressions DESC`).bind(bind, from),
    env.DB.prepare(`SELECT s.ad_id, SUM(s.impressions) AS impressions, SUM(s.clicks) AS clicks FROM ad_stats s ${where} GROUP BY s.ad_id`).bind(bind, from),
  ]);
  const rows = daily.results as DayStat[];
  const byDay = new Map(rows.map((r) => [r.day, r]));
  // Fill in quiet days so the chart's spacing is true to time. "All time" starts at the first recorded day.
  let start = range ? from : rows[0]?.day ?? today;
  if (!range && start < addDays(today, -365)) start = addDays(today, -365);
  const series: DayStat[] = [];
  for (let day = start; day <= today; day = addDays(day, 1)) series.push(byDay.get(day) ?? { day, impressions: 0, clicks: 0 });
  const totals = rows.reduce((t, r) => ({ impressions: t.impressions + r.impressions, clicks: t.clicks + r.clicks }), { impressions: 0, clicks: 0 });
  return { range, totals, daily: series, byPlacement: placements.results as Stats['byPlacement'], byAd: ads.results as Stats['byAd'] };
}

export const ctr = (clicks: number, impressions: number) => impressions ? `${((clicks / impressions) * 100).toFixed(2)}%` : '—';
export const fmtNum = (n: number) => n.toLocaleString('en-US');
export const fmtDay = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/** "Oct 1 – Oct 31, 2026", "Starts Oct 1, 2026", "Until Oct 31, 2026" or "No end date". */
export function describeRun(starts: string | null, ends: string | null): string {
  if (starts && ends) return `${fmtDay(starts)} – ${fmtDay(ends)}`;
  if (starts) return `From ${fmtDay(starts)}`;
  if (ends) return `Until ${fmtDay(ends)}`;
  return 'No end date';
}
