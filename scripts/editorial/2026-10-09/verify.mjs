import { editorialDirectory } from '../../project-library.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const dir = editorialDirectory('2026-10-09');
const data = JSON.parse(readFileSync(dir + 'content.json', 'utf8'));
const before = JSON.parse(readFileSync(dir + 'before-import.json', 'utf8'));
const output = execFileSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', '--local', '--command', 'SELECT * FROM news_articles; SELECT * FROM events; SELECT * FROM forum_threads; SELECT * FROM facebook_posts;', '--json'], { encoding: 'utf8' });
const after = JSON.parse(output.slice(output.indexOf('[')));
for (const [i, expected] of [data.articles, data.events, data.threads].entries()) {
  assert.equal(after[i].results.length, before[i + 1].results.length + expected.length);
  for (const row of expected) {
    const saved = after[i].results.find(r => r.id === row.id);
    for (const [k, v] of Object.entries(row)) assert.equal(saved[k], v, `${row.id}.${k}`);
  }
  for (const row of before[i + 1].results) assert.deepEqual(after[i].results.find(r => r.id === row.id), row, `Existing row ${row.id}`);
}
for (const row of before[4].results) assert.deepEqual(after[3].results.find(r => r.article_id === row.article_id), row);
const ledger = after[3].results.filter(r => data.articles.some(a => a.id === r.article_id));
assert.equal(ledger.length, 3);
assert(ledger.every(r => r.status === 'review' && r.attempts === 0));
assert.equal(after[3].results.length, before[4].results.length + 3);
console.log('Exact saved content, JD bylines, seven discussions, Facebook review holds and unchanged existing rows verified.');
const pages = [];
for (const [kind, rows] of [['news', data.articles], ['events', data.events]]) {
  for (const row of rows) {
    const url = `http://127.0.0.1:4321/${kind}/${row.slug}`;
    const response = await fetch(url);
    const html = await response.text();
    assert.equal(response.status, 200, url);
    assert(html.includes(row.summary.replaceAll('&', '&amp;')), `${url} summary`);
    assert(html.includes('/talk/'), `${url} discussion`);
    if (kind === 'news') assert(html.includes(`/profile/${row.author_id}`), `${url} author link`);
    else assert(html.includes(row.starts_on), `${url} event date`);
    assert(!html.includes('500: Internal Server Error'), url);
    pages.push({ url, status: response.status });
    console.log(`HTTP 200: ${url}`);
  }
}
for (const path of ['news', 'events']) {
  const response = await fetch(`http://127.0.0.1:4321/${path}`);
  assert.equal(response.status, 200);
}
writeFileSync(dir + 'verification.json', JSON.stringify({ checked_at: new Date().toISOString(), stories: 3, events: 4, discussions: 7, existing_rows_unchanged: true, facebook_review_holds: 3, pages }, null, 2));
