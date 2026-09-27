import type { APIRoute } from 'astro';
import { sitemapEntries, sitemapXml } from '../lib/sitemap';

// Crawlers fetch this rarely; an hour of caching keeps new stories discoverable without querying D1 on every hit.
export const GET: APIRoute = async ({ url }) => {
  return new Response(sitemapXml(url.origin, await sitemapEntries()), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
};
