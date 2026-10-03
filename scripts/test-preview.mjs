import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

function sourceModule(path, replacements = {}) {
  let source = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
  }).outputText;
  source = source.replace(/from ['"]([^'"]+)['"]/g, (_match, specifier) =>
    `from ${JSON.stringify(replacements[specifier] ?? import.meta.resolve(specifier))}`);
  return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
}
const stubEnv = 'data:text/javascript,export const env = {};';
const newsModule = sourceModule('src/lib/news.ts', { 'cloudflare:workers': stubEnv });
const { renderBodyBlocks } = await import(newsModule);
const media = { object_key: 'library/fixture.png', alt: 'Photo', caption: 'A local scene', credit: 'Fixture credit', width: 20, height: 10 };
const library = new Map([[media.object_key, media]]);
const adminModule = sourceModule('src/lib/admin.ts');
const forumModule = sourceModule('src/lib/forum.ts', { 'cloudflare:workers': stubEnv });
const mediaModule = sourceModule('src/lib/media.ts', { 'cloudflare:workers': stubEnv, './forum': forumModule });
const { mediaKeysIn } = await import(mediaModule);
globalThis.__previewLibrary = library;
const previewModule = sourceModule('src/pages/api/admin/news/preview.ts', {
  '../../../../lib/admin': adminModule,
  '../../../../lib/forum': forumModule,
  '../../../../lib/news': newsModule,
  '../../../../lib/media': `data:text/javascript,${encodeURIComponent(`export const mediaKeysIn = ${mediaKeysIn.toString()}; export const mediaByKeys = async keys => new Map(keys.filter(key => globalThis.__previewLibrary.has(key)).map(key => [key, globalThis.__previewLibrary.get(key)]));`)}`,
});
const { POST } = await import(previewModule);
const url = 'http://localhost/api/admin/news/preview';
const request = (body, headers = {}) => new Request(url, { method: 'POST', headers: { Origin: 'http://localhost', 'Content-Type': 'text/plain', ...headers }, body });
const staff = { user: { id: 'fixture-editor' }, staffRole: 'editor' };
const call = (body, locals = staff, headers) => POST({ request: request(body, headers), locals });

test('raw HTML handlers, embeds, SVG and malformed HTML remain text', () => {
  for (const markdown of [
    '<img src="https://attacker.invalid/raw" onerror="window.fixtureExecuted=1">',
    '<svg onload="window.fixtureExecuted=1"><a href="javascript:alert(1)">x</a></svg>',
    '<iframe src="https://attacker.invalid/frame"></iframe>',
    '<style>body{background:url(https://attacker.invalid/style)}</style>',
    '<math><mtext><table><mglyph><style><!--</style><img title="--><img src=x onerror=alert(1)>">',
  ]) {
    const html = renderBodyBlocks(markdown, library).join('');
    assert.doesNotMatch(html, /<(?:img|svg|iframe|style|math)\b/i);
    assert.match(html, /&lt;/);
  }
});

test('only existing library images produce resource markup', async () => {
  const response = await call('![Remote](https://attacker.invalid/photo)\n\n![Relative](//attacker.invalid/photo)\n\n![Data](data:image/png;base64,AAAA)\n\n![Missing](/media/library/missing.png)\n\n![Local](/media/library/fixture.png)');
  const html = await response.text();
  assert.equal((html.match(/<img /g) ?? []).length, 1);
  assert.match(html, /src="\/media\/library\/fixture.png"/);
  assert.match(html, /Fixture credit/);
  assert.doesNotMatch(html, /attacker\.invalid|missing\.png|data:image/);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('unsafe link schemes cannot reach href attributes', () => {
  for (const href of ['javascript:alert%281%29', 'jav&#x61;script:alert%281%29', 'data:text/html,hello', 'vbscript:msgbox%281%29']) {
    assert.doesNotMatch(renderBodyBlocks(`[Link](${href})`).join(''), /<a\b/);
  }
});

test('ordinary Markdown, references, escaped metadata and valid links survive', async () => {
  const response = await call('## Heading\n\n**Bold** and *italic* [source](https://example.com).\n\n- One\n- Two\n\n![Photo](/media/library/fixture.png)');
  const html = await response.text();
  for (const expected of ['<h2>Heading</h2>', '<strong>Bold</strong>', '<em>italic</em>', '<ul>', '<figure', 'A local scene']) assert.ok(html.includes(expected));
  const escaped = renderBodyBlocks('![Photo](/media/library/fixture.png)', new Map([[media.object_key, { ...media, caption: '<img onerror="alert(1)">', credit: '<script>bad</script>' }]])).join('');
  assert.doesNotMatch(escaped, /<script|<img onerror/);
});

test('endpoint denies readers, moderators, signed-out and cross-origin requests', async () => {
  for (const locals of [{ user: null, staffRole: null }, { user: {}, staffRole: null }, { user: {}, staffRole: 'moderator' }]) {
    assert.equal((await call('Story', locals)).status, 403);
  }
  assert.equal((await call('Story', staff, { Origin: 'https://attacker.invalid' })).status, 403);
  const noOrigin = request('Story');
  noOrigin.headers.delete('Origin');
  assert.equal((await POST({ request: noOrigin, locals: staff })).status, 403);
  assert.equal((await call('Story', { user: {}, staffRole: 'admin' })).status, 200);
});

test('endpoint bounds bodies and rejects invalid types and UTF-8', async () => {
  assert.equal((await call('Story', staff, { 'Content-Type': 'application/json' })).status, 415);
  assert.equal((await call('x'.repeat(50001))).status, 413);
  assert.equal((await call('x'.repeat(200001))).status, 413);
  assert.equal((await call(new Uint8Array([0xff]))).status, 400);
  assert.equal((await call(Array.from({ length: 101 }, (_, i) => `![x](/media/library/${i}.png)`).join('\n'))).status, 400);
});

test('streaming oversized body is cancelled before consuming all chunks', async () => {
  let cancelled = false;
  const stream = new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(100001)); }, cancel() { cancelled = true; } });
  const streamed = new Request(url, { method: 'POST', headers: { Origin: 'http://localhost', 'Content-Type': 'text/plain' }, body: stream, duplex: 'half' });
  assert.equal((await POST({ request: streamed, locals: staff })).status, 413);
  assert.equal(cancelled, true);
});

test('preview callback handles both targets, debounces updates, discards stale replies and fails closed', async () => {
  const { createStoryPreview } = await import(sourceModule('src/scripts/story-preview.ts'));
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = (_url, options) => new Promise(resolve => { calls.push({ options, resolve }); });
  const waitFor = async count => {
    for (let i = 0; calls.length < count && i < 50; i++) await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(calls.length, count);
  };
  try {
    const render = createStoryPreview();
    const full = { innerHTML: '', textContent: '' };
    const side = { innerHTML: '', textContent: '' };
    assert.equal(render('<img onerror=alert(1)>', full), 'Loading preview…');
    render('Latest story', full);
    render('Side story', side);
    await waitFor(2);
    render('Newer story', full);
    calls[0].resolve(new Response('<p>Stale</p>'));
    calls[1].resolve(new Response('<p>Side</p>'));
    await waitFor(3);
    assert.equal(full.innerHTML, '');
    assert.equal(side.innerHTML, '<p>Side</p>');
    calls[2].resolve(new Response('<p>Current</p>'));
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(full.innerHTML, '<p>Current</p>');
    render('Failed', side);
    await waitFor(4);
    calls[3].resolve(new Response('<img onerror=alert(1)>', { status: 403 }));
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.match(side.textContent, /Couldn’t load/);
    assert.equal(side.innerHTML, '<p>Side</p>');
    assert.equal(calls[0].options.body, 'Latest story');
    assert.equal(calls[0].options.redirect, 'error');
  } finally { globalThis.fetch = originalFetch; }
});
