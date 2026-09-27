import { env } from 'cloudflare:workers';

// Impressions and clicks arrive from the reader's browser, so each one carries a token the
// server signed when it rendered the ad: which ad, which placement, when, and a one-time nonce.
// A token can be counted once, and only within its time window.

export const IMPRESSION_WINDOW = 60 * 60 * 1000;
export const CLICK_WINDOW = 24 * 60 * 60 * 1000;
const NONCE_TTL = 25 * 60 * 60 * 1000;

let keyPromise: Promise<CryptoKey> | null = null;
function hmacKey(): Promise<CryptoKey> {
  keyPromise ??= crypto.subtle.importKey('raw', new TextEncoder().encode(`ad-tracking:${env.BETTER_AUTH_SECRET}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  return keyPromise;
}

const b64url = (bytes: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(bytes).slice(0, 16))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function sign(payload: string): Promise<string> {
  return b64url(await crypto.subtle.sign('HMAC', await hmacKey(), new TextEncoder().encode(payload)));
}

export async function signEvent(adId: string, placement: string): Promise<string> {
  const nonce = crypto.randomUUID().replace(/-/g, '').slice(0, 20);
  const payload = `${adId}~${placement}~${Date.now()}~${nonce}`;
  return `${payload}~${await sign(payload)}`;
}

export type TrackedEvent = { adId: string; placement: string; nonce: string };

export async function verifyEvent(token: string, windowMs: number): Promise<TrackedEvent | null> {
  const parts = token.split('~');
  if (parts.length !== 5 || token.length > 200) return null;
  const [adId, placement, ts, nonce, sig] = parts;
  const age = Date.now() - Number(ts);
  if (!Number.isFinite(age) || age < -60_000 || age > windowMs) return null;
  if (sig !== await sign(parts.slice(0, 4).join('~'))) return null;
  return { adId, placement, nonce };
}

export const isBot = (request: Request) =>
  /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|curl|wget|python|httpclient/i.test(request.headers.get('user-agent') ?? 'bot');

/** Eastern-time calendar day, the unit stats are kept in. */
export const statDay = (at: number = Date.now()) => new Date(at).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

/**
 * Records events whose nonces haven't been seen, and returns how many counted.
 * `kind` keeps an ad's impression and its click from sharing a nonce slot.
 */
export async function recordEvents(kind: 'impression' | 'click', events: TrackedEvent[]): Promise<number> {
  if (!events.length) return 0;
  const now = Date.now();
  const existing = await env.DB.prepare(`SELECT id FROM ads WHERE id IN (${events.map(() => '?').join(',')})`)
    .bind(...events.map((e) => e.adId)).all<{ id: string }>();
  const known = new Set(existing.results.map((r) => r.id));
  const candidates = events.filter((e) => known.has(e.adId));
  if (!candidates.length) return 0;

  const fresh = await env.DB.prepare(`INSERT OR IGNORE INTO ad_event_nonces (nonce, created_at) VALUES ${candidates.map(() => '(?, ?)').join(',')} RETURNING nonce`)
    .bind(...candidates.flatMap((e) => [`${kind}:${e.nonce}`, now])).all<{ nonce: string }>();
  const counted = new Set(fresh.results.map((r) => r.nonce));
  const toCount = candidates.filter((e) => counted.has(`${kind}:${e.nonce}`));
  if (!toCount.length) return 0;

  const day = statDay(now);
  const column = kind === 'impression' ? 'impressions' : 'clicks';
  const statements = toCount.flatMap((e) => [
    env.DB.prepare(`INSERT INTO ad_stats (ad_id, day, placement, ${column}) VALUES (?, ?, ?, 1) ON CONFLICT (ad_id, day, placement) DO UPDATE SET ${column} = ${column} + 1`)
      .bind(e.adId, day, e.placement),
    env.DB.prepare(`UPDATE ads SET ${column} = ${column} + 1 WHERE id = ?`).bind(e.adId),
  ]);
  // Old nonces can't verify any more, so they're safe to drop. Doing it occasionally keeps the table small.
  if (Math.random() < 0.02) statements.push(env.DB.prepare('DELETE FROM ad_event_nonces WHERE created_at < ?').bind(now - NONCE_TTL));
  await env.DB.batch(statements);
  return toCount.length;
}
