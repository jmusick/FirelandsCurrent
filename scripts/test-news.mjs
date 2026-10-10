import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import ts from 'typescript';
import { Miniflare } from 'miniflare';

const database = new DatabaseSync(':memory:');
database.exec('PRAGMA foreign_keys = ON');
for (const name of readdirSync(new URL('../migrations/', import.meta.url)).sort()) {
  database.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8'));
}
const db = {
  prepare(sql) {
    const statement = database.prepare(sql);
    let values = [];
    const query = {
      bind(...args) { values = args; return query; },
      async all() { return { results: statement.all(...values) }; },
      async first() { return statement.get(...values) ?? null; },
      async run() { return { meta: statement.run(...values) }; },
    };
    return query;
  },
};
globalThis.__newsTestEnv = { DB: db };
const envModule = `data:text/javascript,${encodeURIComponent('export const env = globalThis.__newsTestEnv;')}`;
async function loadSource(path, replacements = {}) {
  let source = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
  }).outputText;
  source = source.replace(/from ['"]([^'"]+)['"]/g, (_match, specifier) =>
    `from ${JSON.stringify(specifier === 'cloudflare:workers' ? envModule : replacements[specifier] ?? import.meta.resolve(specifier))}`);
  const url = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  return { url, module: await import(url) };
}
const news = await loadSource('src/lib/news.ts');
const forum = await loadSource('src/lib/forum.ts');
const { emptyArticle, saveArticleFromForm, valuesFromArticle } = (await loadSource('src/lib/news-admin.ts', {
  './news': news.url, './forum': forum.url,
  './media': 'data:text/javascript,export const isMediaId = () => false;',
})).module;
const { frontPageArticles, getAdminArticle } = news.module;

const insert = (id, publishedAt, featured = 0, status = 'published') => database.prepare(`
  INSERT INTO news_articles (id, slug, headline, summary, body, section, community, byline, status, published_at, created_at, updated_at, featured)
  VALUES (?, ?, ?, 'A summary long enough to save.', 'Story text long enough to save.', 'local', 'Sandusky', 'Test reporter', ?, ?, 1, 1, ?)
`).run(id, id, `Story about ${id}`, status, publishedAt, featured);
const form = (article, featured) => {
  const data = new FormData();
  for (const [key, value] of Object.entries({ ...emptyArticle, ...valuesFromArticle(article) })) {
    if (key !== 'featured') data.set(key, value);
  }
  if (featured) data.set('featured', '1');
  return data;
};

test('featured homepage stories', async (t) => {
  await t.test('empty database has no lead or latest stories', async () => {
    assert.deepEqual(await frontPageArticles(), { lead: null, more: [] });
  });
  for (let i = 1; i <= 7; i++) insert(`recent-${i}`, 100 + i);
  insert('old-feature-a', 1);
  insert('old-feature-b', 2);
  insert('draft-feature', 200, 1, 'draft');
  const queueBefore = database.prepare('SELECT * FROM facebook_posts ORDER BY article_id').all();

  await t.test('no published featured story falls back to newest, with no duplicate lead', async () => {
    const page = await frontPageArticles();
    assert.equal(page.lead.id, 'recent-7');
    assert.deepEqual(page.more.map((a) => a.id), ['recent-6', 'recent-5', 'recent-4', 'recent-3']);
    assert.equal((await frontPageArticles(0)).more.length, 0);
  });

  await t.test('saving multiple featured stories preserves the others and original publication dates', async () => {
    for (const id of ['old-feature-a', 'old-feature-b', 'recent-7']) {
      const article = await getAdminArticle(id);
      assert.equal((await saveArticleFromForm(form(article, true), article)).ok, true);
      assert.equal((await getAdminArticle(id)).published_at, article.published_at);
    }
    assert.deepEqual(database.prepare("SELECT id FROM news_articles WHERE featured = 1 AND status = 'published' ORDER BY id").all().map((a) => a.id),
      ['old-feature-a', 'old-feature-b', 'recent-7']);
    assert.deepEqual(database.prepare('SELECT * FROM facebook_posts ORDER BY article_id').all(), queueBefore);
    assert.equal(database.prepare("SELECT created_at FROM news_articles WHERE id = 'old-feature-a'").get().created_at, 1);
  });

  await t.test('each featured story can lead, while Latest always contains the newest other stories', async () => {
    // Control SQLite's random values to exercise each outcome without a probabilistic test.
    let randomIndex = 0;
    let randomValues = [];
    database.function('random', () => randomValues[randomIndex++]);
    const selected = new Set();
    for (let chosen = 0; chosen < 3; chosen++) {
      randomIndex = 0;
      randomValues = [1, 1, 1];
      randomValues[chosen] = -1;
      const page = await frontPageArticles();
      selected.add(page.lead.id);
      const newestOthers = database.prepare("SELECT id FROM news_articles WHERE status = 'published' AND id != ? ORDER BY published_at DESC LIMIT 4")
        .all(page.lead.id).map((a) => a.id);
      assert.deepEqual(page.more.map((a) => a.id), newestOthers);
    }
    assert.deepEqual([...selected].sort(), ['old-feature-a', 'old-feature-b', 'recent-7']);
  });

  await t.test('unticking a story preserves other featured stories; unpublishing excludes it', async () => {
    const first = await getAdminArticle('old-feature-a');
    assert.equal((await saveArticleFromForm(form(first, false), first)).ok, true);
    const second = await getAdminArticle('old-feature-b');
    const data = form(second, true);
    data.set('status', 'draft');
    assert.equal((await saveArticleFromForm(data, second)).ok, true);
    database.function('random', () => 0);
    assert.equal((await frontPageArticles()).lead.id, 'recent-7');
    assert.equal((await getAdminArticle('recent-7')).featured, 1);
  });

  await t.test('new featured stories save without clearing the existing selection', async () => {
    const data = new FormData();
    for (const [key, value] of Object.entries({ ...emptyArticle, headline: 'A newly featured story', slug: 'new-feature',
      summary: 'A summary long enough to save.', body: 'Story text long enough to save.', section: 'local',
      community: 'Sandusky', byline: 'Test reporter', status: 'published', featured: '1' })) data.set(key, value);
    const saved = await saveArticleFromForm(data, null);
    assert.equal(saved.ok, true);
    assert.equal((await getAdminArticle(saved.id)).featured, 1);
    assert.equal((await getAdminArticle('recent-7')).featured, 1);
    assert.equal(database.prepare('SELECT COUNT(*) AS n FROM facebook_posts WHERE article_id = ?').get(saved.id).n, 1);
  });

  await t.test('published edits and featured selection work in the Cloudflare D1 runtime', async () => {
    const runtime = new Miniflare({ workers: [{ config: {
      name: 'featured-news-test', compatibilityDate: '2026-09-26', env: { DB: { type: 'd1', id: 'featured-news-test' } },
      manifest: { mainModule: 'test.js', modules: { 'test.js': { type: 'esm', contents: 'export default { fetch() { return new Response("ok"); } };' } } },
    } }] });
    try {
      const runtimeDb = await runtime.getD1Database('DB');
      for (const name of readdirSync(new URL('../migrations/', import.meta.url)).sort()) {
        const sql = readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8');
        await runtimeDb.exec(sql.replace(/--[^\r\n]*/g, '').replace(/\r?\n/g, ' '));
      }
      globalThis.__newsTestEnv.DB = runtimeDb;
      for (const id of ['runtime-a', 'runtime-b']) {
        const data = new FormData();
        for (const [key, value] of Object.entries({ ...emptyArticle, headline: `A story about ${id}`, slug: id,
          summary: 'A summary long enough to save.', body: 'Story text long enough to save.', section: 'local',
          community: 'Sandusky', byline: 'Test reporter', status: 'published' })) data.set(key, value);
        const saved = await saveArticleFromForm(data, null);
        assert.equal(saved.ok, true);
        const queue = await runtimeDb.prepare('SELECT * FROM facebook_posts WHERE article_id = ?').bind(saved.id).first();
        const article = await getAdminArticle(saved.id);
        assert.equal((await saveArticleFromForm(form(article, true), article)).ok, true);
        assert.deepEqual(await runtimeDb.prepare('SELECT * FROM facebook_posts WHERE article_id = ?').bind(saved.id).first(), queue);
      }
      assert.equal((await runtimeDb.prepare('SELECT COUNT(*) AS n FROM news_articles WHERE featured = 1').first()).n, 2);
      const page = await frontPageArticles();
      assert.ok(['runtime-a', 'runtime-b'].includes(page.lead.slug));
      assert.equal(page.more.length, 1);
      assert.notEqual(page.more[0].id, page.lead.id);
    } finally {
      globalThis.__newsTestEnv.DB = db;
      await runtime.dispose();
    }
  });
});
