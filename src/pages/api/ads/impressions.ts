import type { APIRoute } from 'astro';
import { readText } from '../../../lib/request-body';
import { IMPRESSION_WINDOW, isBot, recordEvents, verifyEvent } from '../../../lib/ad-tracking';

// Viewable impressions, sent by AdSlot's script as a JSON array of the tokens it rendered with.
export const POST: APIRoute = async ({ request }) => {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return new Response(null, { status: 403 });
  if (isBot(request)) return new Response(null, { status: 204 });

  const text = await readText(request, 8000);
  if (text instanceof Response) return new Response(null, { status: text.status });
  let tokens: unknown;
  try { tokens = JSON.parse(text); } catch { return new Response(null, { status: 400 }); }
  if (!Array.isArray(tokens)) return new Response(null, { status: 400 });

  const unique = [...new Set(tokens.filter((t): t is string => typeof t === 'string'))].slice(0, 20);
  const events = (await Promise.all(unique.map((t) => verifyEvent(t, IMPRESSION_WINDOW)))).filter((e) => e !== null);
  await recordEvents('impression', events);
  return new Response(null, { status: 204 });
};
