import type { APIRoute } from 'astro';
import { newsSitemapEntries, newsSitemapXml } from '../lib/sitemap';

// Keep the short publication window fresh as stories are published and age out.
export const GET: APIRoute = async ({ url }) => {
  return new Response(newsSitemapXml(url.origin, await newsSitemapEntries()), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
};
