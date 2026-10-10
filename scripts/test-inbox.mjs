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

const emails = [];
const stored = [];
let failSend = false;
let captchaValid = true;
const realFetch = globalThis.fetch;
globalThis.__inboxEnv = {
  TURNSTILE_SECRET_KEY: 'fixture-secret',
  EMAIL: { async send(message) {
    if (failSend) throw new Error('Simulated provider failure');
    emails.push(message);
    return { messageId: 'fixture-message' };
  } },
  DB: { prepare() { return { bind(...values) { return { async run() { stored.push(values); } }; } }; } },
};
globalThis.fetch = async (url, options) => {
  assert.equal(url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
  assert.equal(options.body.get('secret'), 'fixture-secret');
  assert.equal(options.body.get('response'), 'fixture-token');
  return Response.json({ success: captchaValid });
};
const stubEnv = 'data:text/javascript,export const env = globalThis.__inboxEnv;';
const forumModule = sourceModule('src/lib/forum.ts', { 'cloudflare:workers': stubEnv });
const bodyModule = sourceModule('src/lib/request-body.ts');
const inboxModule = sourceModule('src/lib/inbox.ts', { 'cloudflare:workers': stubEnv });
const { POST } = await import(sourceModule('src/pages/api/inbox.ts', {
  'cloudflare:workers': stubEnv, '../../lib/forum': forumModule, '../../lib/request-body': bodyModule, '../../lib/inbox': inboxModule,
}));
const newsModule = sourceModule('src/lib/news.ts', { 'cloudflare:workers': stubEnv });
const mediaModule = sourceModule('src/lib/media.ts', { 'cloudflare:workers': stubEnv, './forum': forumModule });
const trackingModule = sourceModule('src/lib/ad-tracking.ts', { 'cloudflare:workers': stubEnv });
const { pageTakesAds } = await import(sourceModule('src/lib/ads.ts', {
  'cloudflare:workers': stubEnv, './ad-tracking': trackingModule, './media': mediaModule, './news': newsModule,
}));

const values = { kind: 'ads', name: 'Local Business', email: 'advertiser@example.com',
  subject: 'Autumn campaign', body: 'We would like to advertise our upcoming local event.',
  'cf-turnstile-response': 'fixture-token' };
function call(overrides = {}, origin = 'https://firelandscurrent.com') {
  const headers = origin === null ? {} : { Origin: origin };
  const request = new Request('https://firelandscurrent.com/api/inbox', {
    method: 'POST', headers, body: new URLSearchParams({ ...values, ...overrides }),
  });
  return POST({ request, locals: { user: null } });
}
test.beforeEach(() => { emails.length = 0; stored.length = 0; failSend = false; captchaValid = true; });
test.after(() => { globalThis.fetch = realFetch; delete globalThis.__inboxEnv; });

test('signed-out advertising inquiries email the fixed ads inbox with Reply-To and no database write', async () => {
  const response = await call();
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('Location'), 'https://firelandscurrent.com/advertise?sent=1');
  assert.equal(emails.length, 1);
  assert.equal(emails[0].to, 'ads@firelandscurrent.com');
  assert.equal(emails[0].from.email, 'noreply@firelandscurrent.com');
  assert.deepEqual(emails[0].replyTo, { email: values.email, name: values.name });
  assert.equal(emails[0].subject, 'Advertising inquiry: Autumn campaign');
  assert.ok(emails[0].text.includes(values.body));
  assert.equal(stored.length, 0);
});

test('cross-origin, missing origin, and unknown inbox kinds cannot send', async () => {
  assert.equal((await call({}, 'https://attacker.invalid')).status, 403);
  assert.equal((await call({}, null)).status, 403);
  assert.equal((await call({ kind: 'other@example.com' })).status, 400);
  assert.equal(emails.length, 0);
});

test('honeypots, failed human checks, and invalid fields cannot send', async () => {
  assert.match((await call({ website: 'spam' })).headers.get('Location'), /sent=1$/);
  captchaValid = false;
  assert.match((await call()).headers.get('Location'), /error=captcha$/);
  captchaValid = true;
  for (const invalid of [{ name: '' }, { email: 'bad' }, { email: 'a@example.com\r\nBcc: other@example.com' },
    { subject: 'Hi' }, { body: 'Short' }, { body: 'a'.repeat(10001) }]) {
    assert.match((await call(invalid)).headers.get('Location'), /error=invalid$/);
  }
  assert.equal(emails.length, 0);
  assert.equal(stored.length, 0);
});

test('advertising and contact send failures report an error; stored news tips stay accepted', async () => {
  failSend = true;
  const originalError = console.error;
  console.error = () => {};
  try {
    for (const [kind, path] of [['ads', '/advertise'], ['contact', '/contact']]) {
      const response = await call({ kind });
      assert.equal(response.status, 303);
      assert.equal(response.headers.get('Location'), `https://firelandscurrent.com${path}?error=send`);
    }
    assert.equal(stored.length, 0);
    assert.match((await call({ kind: 'news' })).headers.get('Location'), /submit-news\?sent=1$/);
    assert.equal(stored.length, 1);
  } finally { console.error = originalError; }
});

test('visitor HTML is escaped in the email and subject line breaks are removed', async () => {
  await call({ name: '<img src=x onerror=alert(1)>', body: '<script>alert("inquiry")</script>', subject: 'Campaign\r\nInjected' });
  assert.doesNotMatch(emails[0].html, /<img|<script/);
  assert.match(emails[0].html, /&lt;script&gt;/);
  assert.equal(emails[0].subject, 'Advertising inquiry: Campaign Injected');
});

test('the advertise form page does not display ads while news pages still can', () => {
  assert.equal(pageTakesAds('/advertise'), false);
  assert.equal(pageTakesAds('/advertise/'), false);
  assert.equal(pageTakesAds('/news/local/story'), true);
});
