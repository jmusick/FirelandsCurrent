import type { APIRoute } from 'astro';
import { ADMIN, canAccess } from '../../../../lib/admin';
import { sameOrigin } from '../../../../lib/forum';
import { mediaByKeys, mediaKeysIn } from '../../../../lib/media';
import { renderBodyBlocks } from '../../../../lib/news';

export const POST: APIRoute = async ({ request, locals }) => {
  const headers = { 'Cache-Control': 'no-store' };
  const error = (message: string, status: number) => new Response(message, { status, headers });
  if (!locals.user || !canAccess(locals.staffRole, ADMIN.news)) return error('Forbidden', 403);
  if (!sameOrigin(request)) return error('Invalid request origin', 403);
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'text/plain') return error('Expected Markdown text', 415);

  // Match the story limit, including four-byte Unicode, without buffering an unlimited body.
  const reader = request.body?.getReader();
  if (!reader) return error('Missing story text', 400);
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0;
  let markdown = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 200000) {
        await reader.cancel();
        return error('Story text is too long', 413);
      }
      markdown += decoder.decode(value, { stream: true });
    }
    markdown += decoder.decode();
  } catch {
    return error('Invalid story text', 400);
  } finally {
    reader.releaseLock();
  }
  if (markdown.length > 50000) return error('Story text is too long', 413);
  const keys = mediaKeysIn(markdown);
  if (keys.length > 100) return error('Too many story images', 400);
  const html = renderBodyBlocks(markdown, await mediaByKeys(keys)).join('');
  return new Response(html, { headers: { ...headers, 'Content-Type': 'text/html;charset=UTF-8' } });
};
