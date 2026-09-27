import type { APIRoute } from 'astro';
import { IMPRESSION_WINDOW, isBot, recordEvents, verifyEvent } from '../../../lib/ad-tracking';

// Viewable impressions, sent by AdSlot's script as a JSON array of the tokens it rendered with.
export const POST: APIRoute = async ({ request }) => {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return new Response(null, { status: 403 });
  if (isBot(request)) return new Response(null, { status: 204 });

  let tokens: unknown;
  try { tokens = JSON.parse((await request.text()).slice(0, 8000)); } catch { return new Response(null, { status: 400 }); }
  if (!Array.isArray(tokens)) return new Response(null, { status: 400 });

  const unique = [...new Set(tokens.filter((t): t is string => typeof t === 'string'))].slice(0, 20);
  const events = (await Promise.all(unique.map((t) => verifyEvent(t, IMPRESSION_WINDOW)))).filter((e) => e !== null);
  await recordEvents('impression', events);
  return new Response(null, { status: 204 });
};
