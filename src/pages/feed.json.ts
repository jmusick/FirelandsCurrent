import type { APIRoute } from 'astro';
import { feedArticles, jsonFeed } from '../lib/feed';
import { isSection } from '../lib/news';

export const GET: APIRoute = async ({ url }) => {
  const param = url.searchParams.get('section');
  const section = isSection(param) ? param : undefined;
  return new Response(JSON.stringify(jsonFeed(url.origin, await feedArticles(section), section)), {
    headers: { 'Content-Type': 'application/feed+json; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
};
