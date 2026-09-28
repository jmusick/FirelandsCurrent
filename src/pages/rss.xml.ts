import type { APIRoute } from 'astro';
import { feedArticles, rssXml } from '../lib/feed';
import { isSection } from '../lib/news';

// Feed readers poll often; a short cache keeps that off D1 while new stories still show up within minutes.
export const GET: APIRoute = async ({ url }) => {
  const param = url.searchParams.get('section');
  const section = isSection(param) ? param : undefined;
  return new Response(rssXml(url.origin, await feedArticles(section), section), {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
};
