import type { APIRoute } from 'astro';

// Served dynamically so the Sitemap line names whichever host is answering, as the sitemap's own URLs do.
export const GET: APIRoute = ({ url }) => {
  const body = [
    'User-agent: *',
    'Disallow: /admin',
    'Disallow: /api/',
    'Disallow: /account',
    'Disallow: /business',
    'Disallow: /ads/',
    '',
    `Sitemap: ${new URL('/sitemap.xml', url.origin).href}`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
};
