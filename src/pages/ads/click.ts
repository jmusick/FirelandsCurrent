import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { CLICK_WINDOW, isBot, recordEvents, verifyEvent } from '../../lib/ad-tracking';

// Ad links point here with the token the ad was rendered with. The destination always comes
// from the ad itself, never the request, so this can't be used to redirect anywhere else.
export const GET: APIRoute = async ({ request, url }) => {
  const event = await verifyEvent(url.searchParams.get('t') ?? '', CLICK_WINDOW);
  const ad = event && await env.DB.prepare('SELECT href FROM ads WHERE id = ?').bind(event.adId).first<{ href: string }>();
  if (!event || !ad) return Response.redirect(new URL('/', url), 302);
  // AdSlot's script adds v=1 when a reader interacts with the ad. Without it the request came from
  // something that read the page's links without running it, so it still redirects but doesn't count.
  if (url.searchParams.get('v') === '1' && !isBot(request)) await recordEvents('click', [event]);
  return new Response(null, { status: 302, headers: { Location: ad.href, 'Cache-Control': 'no-store' } });
};
