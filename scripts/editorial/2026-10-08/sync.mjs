import { editorialDirectory } from '../../project-library.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const dir = editorialDirectory('2026-10-08');
const original = JSON.parse(readFileSync(dir + 'content.json', 'utf8'));
const q = v => v === null ? 'NULL' : typeof v === 'number' ? String(v) : "'" + v.replaceAll("'", "''") + "'";
const ids = rows => rows.map(r => q(r.id)).join(',');
const slugs = rows => rows.map(r => q(r.slug)).join(',');
function query(mode, sql) {
  const out = execFileSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', mode, '--command', sql, '--json'], { encoding: 'utf8' });
  return JSON.parse(out.slice(out.indexOf('[')));
}
const local = query('--local', `SELECT * FROM news_articles WHERE id IN (${ids(original.articles)}); SELECT * FROM events WHERE id IN (${ids(original.events)}); SELECT * FROM forum_threads WHERE article_id IN (${ids(original.articles)}) OR event_id IN (${ids(original.events)}); SELECT id,name FROM user WHERE email='jd@orboro.net';`);
assert.equal(local[0].results.length, 3);
assert.equal(local[1].results.length, 4);
assert.equal(local[2].results.length, 7);
const fresh = { articles: local[0].results, events: local[1].results, threads: local[2].results };
assert(fresh.articles.every(r => r.status === 'published' && r.author_id === local[3].results[0].id));
assert(fresh.events.every(r => r.status === 'published'));
assert(fresh.threads.every(r => r.author_id === 'newsroom'));
assert(fresh.articles.every(r => r.lead_media_id === null), 'New local media requires separate verification');
assert(fresh.events.every(r => r.image_media_id === null), 'New local media requires separate verification');
const remote = query('--remote', `SELECT id,name FROM user WHERE email='jd@orboro.net'; SELECT id,slug FROM news_articles WHERE id IN (${ids(fresh.articles)}) OR slug IN (${slugs(fresh.articles)}); SELECT id,slug FROM events WHERE id IN (${ids(fresh.events)}) OR slug IN (${slugs(fresh.events)}); SELECT id FROM user WHERE id='newsroom'; SELECT id FROM forum_threads WHERE id IN (${ids(fresh.threads)}) OR article_id IN (${ids(fresh.articles)}) OR event_id IN (${ids(fresh.events)}); SELECT section,COUNT(*) AS n FROM news_articles WHERE status='published' GROUP BY section ORDER BY section; SELECT status,COUNT(*) AS n FROM events GROUP BY status ORDER BY status;`);
assert.deepEqual(remote[0].results, local[3].results);
assert.equal(remote[1].results.length, 0, 'Production story conflict');
assert.equal(remote[2].results.length, 0, 'Production event conflict');
assert.equal(remote[3].results.length, 1, 'Production Newsroom account missing');
assert.equal(remote[4].results.length, 0, 'Production discussion conflict');
const insert = (table, row) => `INSERT INTO ${table} (${Object.keys(row).join(',')}) VALUES (${Object.values(row).map(q).join(',')});`;
const now = Date.now();
writeFileSync(dir + 'reviewed-content.json', JSON.stringify(fresh, null, 2));
writeFileSync(dir + 'production-before.json', JSON.stringify(remote, null, 2));
// Create review ledger entries before publishing so cron never sees these stories as pending.
writeFileSync(dir + 'sync-production.sql', [
  ...fresh.articles.map(r => insert('news_articles', { ...r, status: 'draft' })),
  ...fresh.articles.map(r => insert('facebook_posts', { article_id: r.id, status: 'review', attempts: 0, next_attempt_at: now, created_at: now, updated_at: now })),
  `UPDATE news_articles SET status='published' WHERE id IN (${ids(fresh.articles)});`,
  ...fresh.events.map(r => insert('events', r)),
  ...fresh.threads.map(r => insert('forum_threads', r)),
].join('\n'));
console.log('Current local rows exported; production IDs/slugs and discussion links clear; JD and Newsroom accounts match. Prepared 3 stories, 4 events and 7 discussions, with Facebook held before publication.');
