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
const inserts = [];
let failSend = false;
let captchaValid = true;
let published = true;
const realFetch = globalThis.fetch;
globalThis.__correctionEnv = {
  TURNSTILE_SECRET_KEY: 'fixture-secret',
  EMAIL: { async send(message) {
    if (failSend) throw new Error('Simulated provider failure');
    emails.push(message);
  } },
  DB: { prepare(sql) { return { bind(...values) {
    return {
      async first() { return published ? { id: 'story-1', title: 'Fixture story', slug: values[0] } : null; },
      async run() { inserts.push({ sql, values }); return { meta: { changes: 1 } }; },
    };
  } }; } },
};
globalThis.fetch = async () => Response.json({ success: captchaValid });
const stubEnv = 'data:text/javascript,export const env = globalThis.__correctionEnv;';
const forumModule = sourceModule('src/lib/forum.ts', { 'cloudflare:workers': stubEnv });
const bodyModule = sourceModule('src/lib/request-body.ts');
const inboxModule = sourceModule('src/lib/inbox.ts', { 'cloudflare:workers': stubEnv });
const correctionsModule = sourceModule('src/lib/corrections.ts', { 'cloudflare:workers': stubEnv });
const { POST } = await import(sourceModule('src/pages/api/corrections.ts', {
  '../../lib/corrections': correctionsModule, '../../lib/forum': forumModule, '../../lib/request-body': bodyModule, '../../lib/inbox': inboxModule,
}));

const values = { type: 'news', slug: 'fixture-story', name: 'Reader', email: 'reader@example.com',
  details: 'The council meeting was on Tuesday, not Monday.', suggested_fix: '', source_url: '',
  'cf-turnstile-response': 'fixture-token' };
function call(overrides = {}, origin = 'https://firelandscurrent.com') {
  const request = new Request('https://firelandscurrent.com/api/corrections', {
    method: 'POST', headers: origin === null ? {} : { Origin: origin }, body: new URLSearchParams({ ...values, ...overrides }),
  });
  return POST({ request, locals: { user: null } });
}
test.beforeEach(() => { emails.length = 0; inserts.length = 0; failSend = false; captchaValid = true; published = true; });
test.after(() => { globalThis.fetch = realFetch; delete globalThis.__correctionEnv; });

test('a valid report is stored, emailed to the newsroom with a review link, and redirects back', async () => {
  const response = await call({ suggested_fix: 'Tuesday', source_url: 'https://example.com/agenda' });
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('Location'), 'https://firelandscurrent.com/report-inaccuracy?type=news&slug=fixture-story&sent=1');
  assert.equal(inserts.length, 1);
  assert.equal(emails.length, 1);
  assert.equal(emails[0].to, 'news@firelandscurrent.com');
  assert.match(emails[0].subject, /^Correction request: Fixture story$/);
  assert.match(emails[0].text, /\/admin\/corrections\//);
  assert.match(emails[0].text, /Suggested fix: Tuesday/);
});

test('cross-origin, missing origin, and unknown targets are rejected', async () => {
  assert.equal((await call({}, 'https://attacker.invalid')).status, 403);
  assert.equal((await call({}, null)).status, 403);
  assert.equal((await call({ type: 'ad' })).status, 400);
  assert.equal((await call({ slug: '../admin' })).status, 400);
  published = false;
  assert.equal((await call()).status, 404);
  assert.equal(inserts.length, 0);
});

test('honeypots, failed human checks, and invalid fields store nothing', async () => {
  assert.match((await call({ website: 'spam' })).headers.get('Location'), /sent=1$/);
  captchaValid = false;
  assert.match((await call()).headers.get('Location'), /error=captcha$/);
  captchaValid = true;
  for (const invalid of [{ name: '' }, { email: 'bad' }, { details: 'short' }, { details: 'a'.repeat(5001) },
    { source_url: 'javascript:alert(1)' }, { source_url: 'ftp://example.com/file' }]) {
    assert.match((await call(invalid)).headers.get('Location'), /error=invalid$/);
  }
  assert.equal(inserts.length, 0);
  assert.equal(emails.length, 0);
});

test('an email failure still keeps the stored report', async () => {
  failSend = true;
  const originalError = console.error;
  console.error = () => {};
  try {
    assert.match((await call()).headers.get('Location'), /sent=1$/);
    assert.equal(inserts.length, 1);
  } finally { console.error = originalError; }
});
