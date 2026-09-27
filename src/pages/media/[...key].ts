import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

// Uploaded files in the MEDIA bucket. Keys include a random part and never change, so they cache forever.
export const GET: APIRoute = async ({ params }) => {
  const key = params.key ?? '';
  if (!/^ads\/[\w-]+\/[\w.-]+$/.test(key)) return new Response('Not found', { status: 404 });
  const object = await env.MEDIA.get(key);
  if (!object) return new Response('Not found', { status: 404 });
  const type = object.httpMetadata?.contentType ?? '';
  if (!/^image\/(png|jpeg|gif|webp)$/.test(type)) return new Response('Not found', { status: 404 });
  return new Response(object.body, {
    headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=31536000, immutable', ETag: object.httpEtag },
  });
};
