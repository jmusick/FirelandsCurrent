import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../src/lib/response-headers.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
}).outputText;
const { applyCachePolicy, applySecurityHeaders, isPrivatePath, PRIVATE_CACHE_CONTROL } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

const html = 'text/html; charset=utf-8';
/** The Cache-Control a response ends up with after the policy runs. */
function policy(pathname, { signedIn = false, type = html, cache, cookie } = {}) {
  const headers = new Headers({ 'Content-Type': type });
  if (cache) headers.set('Cache-Control', cache);
  if (cookie) headers.append('Set-Cookie', cookie);
  applyCachePolicy(headers, { pathname, signedIn });
  return headers.get('Cache-Control');
}

test('private paths match whole segments only', () => {
  for (const path of ['/account', '/admin', '/admin/news/abc', '/business/1/ads/2', '/api/talk/votes', '/api/auth/get-session', '/sign-in', '/reset-password'])
    assert.equal(isPrivatePath(path), true, path);
  for (const path of ['/', '/news/business-roundup', '/accounting', '/apiary', '/administrator-notes', '/profile/u1', '/media/a.jpg'])
    assert.equal(isPrivatePath(path), false, path);
});

test('account, admin, business, auth, and API responses are private even when anonymous', () => {
  for (const path of ['/account', '/admin/users', '/business', '/api/auth/sign-in/email', '/api/inbox', '/reset-password'])
    assert.equal(policy(path), PRIVATE_CACHE_CONTROL, path);
  assert.equal(policy('/api/talk/votes', { type: 'text/plain' }), PRIVATE_CACHE_CONTROL);
});

test('an unsafe explicit header on a private response is replaced; an explicit no-store is kept', () => {
  assert.equal(policy('/admin', { cache: 'public, max-age=300' }), PRIVATE_CACHE_CONTROL);
  assert.equal(policy('/api/admin/news/preview', { cache: 'no-store' }), 'no-store');
  assert.equal(policy('/api/x', { cache: 'no-cache, no-store, must-revalidate' }), 'no-cache, no-store, must-revalidate');
  assert.equal(policy('/api/x', { cache: 'no-store-ish' }), PRIVATE_CACHE_CONTROL);
});

test('a response that sets a cookie is private, whatever the route chose', () => {
  assert.equal(policy('/', { cookie: 'session=abc; Path=/; HttpOnly' }), PRIVATE_CACHE_CONTROL);
  assert.equal(policy('/media/a.jpg', { type: 'image/jpeg', cache: 'public, max-age=31536000, immutable', cookie: 'session=abc' }), PRIVATE_CACHE_CONTROL);
});

test('HTML for a signed-in reader is private, even if the page asked for public caching', () => {
  assert.equal(policy('/', { signedIn: true }), PRIVATE_CACHE_CONTROL);
  assert.equal(policy('/news/story', { signedIn: true, cache: 'public, max-age=60' }), PRIVATE_CACHE_CONTROL);
  assert.equal(policy('/news/story', { signedIn: true, type: 'text/plain' }), PRIVATE_CACHE_CONTROL);
});

test('media, feeds, and other non-HTML keep their own caching for signed-in readers', () => {
  assert.equal(policy('/media/a.jpg', { signedIn: true, type: 'image/jpeg', cache: 'public, max-age=31536000, immutable' }), 'public, max-age=31536000, immutable');
  assert.equal(policy('/rss.xml', { signedIn: true, type: 'application/rss+xml', cache: 'public, max-age=300' }), 'public, max-age=300');
});

test('anonymous public responses are left as the route set them', () => {
  assert.equal(policy('/'), null);
  assert.equal(policy('/news/story'), null);
  assert.equal(policy('/sitemap.xml', { type: 'application/xml', cache: 'public, max-age=3600' }), 'public, max-age=3600');
});

test('security headers are set on every response', () => {
  const headers = new Headers();
  applySecurityHeaders(headers);
  assert.equal(headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
  assert.equal(headers.get('X-Frame-Options'), 'DENY');
  assert.equal(headers.get('Strict-Transport-Security'), 'max-age=31536000');
});
