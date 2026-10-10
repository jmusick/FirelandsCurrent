import { imagePublicationDirectory } from '../../project-library.mjs';
import { getPlatformProxy } from 'wrangler';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const dir = imagePublicationDirectory('2026-10-09');
const updates = JSON.parse(readFileSync(dir + 'updates.json', 'utf8'));
const before = JSON.parse(readFileSync(dir + 'before.json', 'utf8'));
const q = value => value === null ? 'NULL' : typeof value === 'number' ? String(value) : "'" + value.replaceAll("'", "''") + "'";
const ids = updates.map(update => q(update.articleId)).join(',');
const mediaIds = updates.map(update => q(update.media.id)).join(',');
function query(mode, sql) {
  const out = execFileSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', mode, '--command', sql, '--json'], { encoding: 'utf8' });
  return JSON.parse(out.slice(out.indexOf('[')));
}
const local = query('--local', `SELECT * FROM news_articles WHERE id IN (${ids}); SELECT * FROM media WHERE id IN (${mediaIds}); SELECT * FROM admin_audit_log WHERE target_media_id IN (${mediaIds}); SELECT id,name FROM user WHERE email='jd@orboro.net';`);
const remote = query('--remote', `SELECT * FROM news_articles WHERE id IN (${ids}) OR featured=1; SELECT * FROM media WHERE id IN (${mediaIds}); SELECT id,name FROM user WHERE email='jd@orboro.net'; SELECT article_id,status,attempts FROM facebook_posts WHERE article_id IN (${ids});`);
assert.equal(local[0].results.length, 2);
assert.equal(local[1].results.length, 2);
assert.equal(local[2].results.length, 2);
assert.deepEqual(remote[2].results, local[3].results);
assert.equal(remote[1].results.length, 0, 'Production media IDs already exist');
assert.equal(remote[0].results.length, 2, 'Unexpected featured article or missing production article');
for (const article of local[0].results) {
  const original = before.find(row => row.id === article.id);
  const live = remote[0].results.find(row => row.id === article.id);
  assert(live && live.slug === article.slug && live.status === 'published');
  assert.equal(live.body, original.body, 'Production story text changed since research');
  assert.equal(live.lead_media_id, null);
  assert.equal(live.featured, 0);
  assert.equal(live.published_at, article.published_at);
}
writeFileSync(dir + 'production-before.json', JSON.stringify(remote, null, 2));
const proxy = await getPlatformProxy({ configPath: 'wrangler.jsonc', persist: { path: '.wrangler/state/v3' }, remoteBindings: false });
try {
  for (const record of local[1].results) {
    const object = await proxy.env.MEDIA.get(record.object_key);
    assert(object && object.size === record.bytes);
    writeFileSync(dir + record.id + '.jpg', Buffer.from(await object.arrayBuffer()));
  }
} finally { await proxy.dispose(); }
const insert = (table, row) => `INSERT INTO ${table} (${Object.keys(row).join(',')}) VALUES (${Object.values(row).map(q).join(',')});`;
const sql = [
  ...local[1].results.map(record => insert('media', record)),
  ...local[2].results.map(record => insert('admin_audit_log', record)),
  ...local[0].results.map(article => `UPDATE news_articles SET lead_media_id=${q(article.lead_media_id)},body=${q(article.body)},featured=${q(article.featured)},updated_at=${q(article.updated_at)} WHERE id=${q(article.id)} AND lead_media_id IS NULL AND body=${q(before.find(row => row.id === article.id).body)};`),
];
writeFileSync(dir + 'sync-production.sql', sql.join('\n'));
writeFileSync(dir + 'reviewed-local.json', JSON.stringify(local, null, 2));
console.log('Production stories match originals. Prepared two validated images, media records, upload audit entries, article credits, and the Pipe Creek homepage pin.');
