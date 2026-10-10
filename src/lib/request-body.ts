/** Byte ceilings for request bodies. Field limits in each module still apply after parsing. */
export const FORM_BYTES = 256 * 1024;
/** Story forms: 50,000 characters can be 12 bytes each once percent-encoded. */
export const STORY_FORM_BYTES = 1024 * 1024;
const MULTIPART_OVERHEAD = 256 * 1024;
export const uploadFormBytes = (fileBytes: number) => fileBytes + MULTIPART_OVERHEAD;

const plain = (message: string, status: number) => new Response(message, { status, headers: { 'Cache-Control': 'no-store' } });

/**
 * Reads at most `maxBytes` from the request body, counting what actually arrives rather than trusting
 * Content-Length, and stops reading as soon as the limit is passed. Returns a ready 413/400 response on failure.
 */
export async function readBytes(request: Request, maxBytes: number): Promise<Uint8Array | Response> {
  const declared = Number(request.headers.get('Content-Length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    await request.body?.cancel().catch(() => {});
    return plain('Request body is too large', 413);
  }
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return plain('Request body is too large', 413);
      }
      chunks.push(value);
    }
  } catch {
    return plain('Could not read the request body', 400);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

/** Bounded replacement for `request.formData()`: form content types only, parsed after the size check. */
export async function readForm(request: Request, maxBytes = FORM_BYTES): Promise<FormData | Response> {
  const type = request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
  if (type !== 'application/x-www-form-urlencoded' && type !== 'multipart/form-data') {
    await request.body?.cancel().catch(() => {});
    return plain('Unsupported content type', 415);
  }
  const bytes = await readBytes(request, maxBytes);
  if (bytes instanceof Response) return bytes;
  try {
    return await new Request(request.url, { method: 'POST', headers: { 'Content-Type': request.headers.get('Content-Type')! }, body: bytes.buffer as ArrayBuffer }).formData();
  } catch {
    return plain('Malformed form data', 400);
  }
}

/** Bounded UTF-8 text body (for JSON beacons). */
export async function readText(request: Request, maxBytes: number): Promise<string | Response> {
  const bytes = await readBytes(request, maxBytes);
  if (bytes instanceof Response) return bytes;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return plain('Invalid text', 400);
  }
}
