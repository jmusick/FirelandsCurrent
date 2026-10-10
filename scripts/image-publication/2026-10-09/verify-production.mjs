import { imagePublicationDirectory } from '../../project-library.mjs';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const dir = imagePublicationDirectory('2026-10-09');
const local = JSON.parse(readFileSync(dir + 'reviewed-local.json', 'utf8'));
const before = JSON.parse(readFileSync(dir + 'production-before.json', 'utf8'));
const ids = local[0].results.map(row => "'" + row.id + "'").join(',');
const mediaIds = local[1].results.map(row => "'" + row.id + "'").join(',');
const sql = `SELECT * FROM news_articles WHERE id IN (${ids}); SELECT * FROM media WHERE id IN (${mediaIds}); SELECT * FROM admin_audit_log WHERE target_media_id IN (${mediaIds}); SELECT article_id,status,attempts FROM facebook_posts WHERE article_id IN (${ids}); SELECT slug FROM news_articles WHERE featured=1;`;
const output = execFileSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', '--remote', '--command', sql, '--json'], { encoding: 'utf8' });
const remote = JSON.parse(output.slice(output.indexOf('[')));
for (let index = 0; index < 3; index++) {
  const sort = rows => [...rows].sort((a, b) => a.id.localeCompare(b.id));
  assert.deepEqual(sort(remote[index].results), sort(local[index].results));
}
const ledgerSort = rows => [...rows].sort((a, b) => a.article_id.localeCompare(b.article_id));
assert.deepEqual(ledgerSort(remote[3].results), ledgerSort(before[3].results));
assert.deepEqual(remote[4].results, [{ slug: 'pipe-creek-parking-lot-access-project-october-2026' }]);
const checked = [];
for (const article of local[0].results) {
  const record = local[1].results.find(row => row.id === article.lead_media_id);
  const response = await fetch(`https://firelandscurrent.com/news/${article.slug}`, { headers: { 'Cache-Control': 'no-cache' } });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert(html.includes(`/media/${record.object_key}`));
  assert(html.includes(record.caption));
  assert(html.includes('href="https://creativecommons.org/licenses/by-sa/4.0/"'));
  const image = await fetch(`https://firelandscurrent.com/media/${record.object_key}`);
  assert.equal(image.status, 200);
  assert.equal(image.headers.get('content-type'), 'image/jpeg');
  const bytes = Buffer.from(await image.arrayBuffer());
  assert.equal(bytes.length, record.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), createHash('sha256').update(readFileSync(dir + record.id + '.jpg')).digest('hex'));
  checked.push({ slug: article.slug, mediaId: record.id, bytes: bytes.length });
}
writeFileSync(dir + 'production-verified.json', JSON.stringify({ verifiedAt: new Date().toISOString(), articles: checked, database: remote }, null, 2));
console.log('Production database, media records, audit entries and image hashes match local; article captions and license links render; Pipe Creek is the only featured story; Facebook ledger unchanged.');
