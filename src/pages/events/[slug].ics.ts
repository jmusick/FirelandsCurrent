import type { APIRoute } from 'astro';
import { eventIcs, getEvent } from '../../lib/events';

export const GET: APIRoute = async ({ params, url }) => {
  const event = await getEvent(params.slug ?? '');
  if (!event) return new Response('Event not found', { status: 404 });
  return new Response(eventIcs(event, new URL(`/events/${event.slug}`, url.origin).href), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${event.slug}.ics"`,
      'Cache-Control': 'public, max-age=300',
    },
  });
};
