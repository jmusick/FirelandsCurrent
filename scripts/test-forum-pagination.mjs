import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import ts from 'typescript';

const database = new DatabaseSync(':memory:');
database.exec(`
  CREATE TABLE "user" (id TEXT PRIMARY KEY, name TEXT NOT NULL);
  CREATE TABLE forum_replies (
    id TEXT PRIMARY KEY, thread_id TEXT NOT NULL, author_id TEXT NOT NULL, parent_id TEXT,
    body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'published', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
  );
  CREATE TABLE forum_reply_votes (user_id TEXT NOT NULL, reply_id TEXT NOT NULL, value INTEGER NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (reply_id, user_id));
  INSERT INTO "user" VALUES ('u1', 'Reader');
`);
globalThis.__paginationEnv = { DB: { prepare(sql) {
  const statement = database.prepare(sql);
  let values = [];
  const query = {
    bind(...args) { values = args; return query; },
    async all() { return { results: statement.all(...values) }; },
    async first() { return statement.get(...values) ?? null; },
  };
  return query;
} } };
const envModule = `data:text/javascript,${encodeURIComponent('export const env = globalThis.__paginationEnv;')}`;
const sources = {};
async function load(path, replacements = {}) {
  let source = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
  }).outputText;
  source = source.replace(/from ['"]([^'"]+)['"]/g, (_m, s) => `from ${JSON.stringify(s === 'cloudflare:workers' ? envModule : replacements[s] ?? import.meta.resolve(s))}`);
  const url = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  sources[path] = url;
  return import(url);
}
const { listComments, COMMENTS_PER_PAGE } = await load('src/lib/forum.ts');
const { parseMediaPage } = await load('src/lib/media.ts', { './forum': sources['src/lib/forum.ts'] });

const insert = database.prepare(`INSERT INTO forum_replies (id, thread_id, author_id, parent_id, body, status, created_at, updated_at) VALUES (?, ?, 'u1', ?, ?, ?, ?, ?)`);
function add(id, thread, parent, createdAt, status = 'published') { insert.run(id, thread, parent, `body ${id}`, status, createdAt, createdAt); }

test('media page inputs must be plain whole numbers in range', () => {
  assert.equal(parseMediaPage(null), 0);
  assert.equal(parseMediaPage(''), 0);
  assert.equal(parseMediaPage('3'), 3);
  assert.equal(parseMediaPage('1000'), 1000);
  for (const bad of ['1.5', '-1', '1001', '1e3', 'abc', '99999999999999999999', ' 2', '0x10', 'NaN', 'Infinity']) {
    assert.equal(parseMediaPage(bad), null, bad);
  }
});

test('discussions over 5,000 comments keep the newest comment and order deterministically', async () => {
  database.exec('BEGIN');
  for (let i = 0; i < 5600; i++) add(`big-${String(i).padStart(5, '0')}`, 'big', null, 1000 + Math.floor(i / 2));
  database.exec('COMMIT');
  const newest = await listComments('big', 0, 'new');
  assert.equal(newest.rootCount, 5600);
  assert.equal(newest.comments.length, COMMENTS_PER_PAGE);
  assert.equal(newest.comments[0].id, 'big-05599', 'newest comment must lead the newest-first page');
  const oldest = await listComments('big', Math.floor(5599 / COMMENTS_PER_PAGE), 'old');
  assert.equal(oldest.comments.at(-1).id, 'big-05599', 'newest comment must be on the last oldest-first page');
  // Equal timestamps tie-break on id, and repeated loads give the same page.
  assert.deepEqual((await listComments('big', 3, 'old')).comments.map((c) => c.id), (await listComments('big', 3, 'old')).comments.map((c) => c.id));
  assert.ok(newest.comments[0].created_at === newest.comments[1].created_at && newest.comments[0].id > newest.comments[1].id);
});

test('replies stay under their parent and hidden parents survive only for visible replies', async () => {
  add('a', 't', null, 10);
  add('a1', 't', 'a', 11);
  add('a1x', 't', 'a1', 12);
  add('h', 't', null, 13, 'hidden');
  add('h1', 't', 'h', 14);
  add('gone', 't', null, 15, 'hidden');
  add('gone1', 't', 'gone', 16, 'hidden');
  const { comments, rootCount } = await listComments('t', 0, 'old');
  assert.equal(rootCount, 2);
  assert.deepEqual(comments.map((c) => [c.id, c.depth, c.removed]), [['a', 0, false], ['a1', 1, false], ['a1x', 2, false], ['h', 0, true], ['h1', 1, false]]);
});

test('malformed page values fall back to the first page', async () => {
  for (const page of [-1, 1.5, NaN, Infinity]) {
    assert.equal((await listComments('t', page, 'old')).comments[0].id, 'a');
  }
  assert.deepEqual((await listComments('t', 99, 'old')).comments, []);
});
