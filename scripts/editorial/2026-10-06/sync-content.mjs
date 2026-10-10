import { editorialDirectory } from '../../project-library.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const directory = editorialDirectory('2026-10-06');
const manifest = JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8'));
const literal = value => value === null ? 'NULL' : typeof value === 'number' ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
const articleIds = manifest.stories.map(item => literal(item.id)).join(',');
const eventIds = manifest.events.map(item => literal(item.id)).join(',');
const articleSlugs = manifest.stories.map(item => literal(item.slug)).join(',');
const eventSlugs = manifest.events.map(item => literal(item.slug)).join(',');
const query = `SELECT * FROM news_articles WHERE id IN (${articleIds}) OR slug IN (${articleSlugs}) ORDER BY id;
SELECT * FROM events WHERE id IN (${eventIds}) OR slug IN (${eventSlugs}) ORDER BY id;
SELECT * FROM forum_threads WHERE article_id IN (${articleIds}) OR event_id IN (${eventIds}) ORDER BY id;
SELECT id,name,email FROM user WHERE email='jd@orboro.net' OR id='newsroom' ORDER BY id;
SELECT section,status,COUNT(*) AS count FROM news_articles GROUP BY section,status ORDER BY section,status;
SELECT status,COUNT(*) AS count FROM events GROUP BY status ORDER BY status;
SELECT article_id,status,post_id,attempts FROM facebook_posts WHERE article_id IN (${articleIds}) ORDER BY article_id;`;

function execute(location, args) {
  const raw = execFileSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', `--${location}`, ...args, '--json'], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  const jsonStart = raw.search(/(?:^|\n)\s*\[/);
  const result = JSON.parse(jsonStart < 0 ? raw : raw.slice(jsonStart).trim());
  assert(result.every(item => item.success), 'D1 execution failed');
  return result.map(item => item.results);
}
const mode = process.argv[2];
if (mode === 'prepare') {
  const local = execute('local', ['--command', query]);
  const remote = execute('remote', ['--command', query]);
  writeFileSync(join(directory, 'local-approved.json'), JSON.stringify(local, null, 2));
  writeFileSync(join(directory, 'production-before.json'), JSON.stringify(remote, null, 2));
  assert.equal(local[0].length, 2);
  assert.equal(local[1].length, 4);
  assert.equal(local[2].length, 6);
  assert.equal(remote[0].length, 0, 'A selected production story already exists; inspect before writing');
  assert.equal(remote[1].length, 0, 'A selected production event already exists; inspect before writing');
  assert.equal(remote[2].length, 0, 'A selected production discussion already exists; inspect before writing');
  for (const user of local[3]) assert.deepEqual(remote[3].find(item => item.id === user.id), user, 'Author identity differs between local and production');
  assert(local[0].every(item => item.status === 'published' && item.author_id === manifest.authorId && item.byline === 'JD'));
  assert(local[1].every(item => item.status === 'published'));
  assert(local[0].every(item => !item.lead_media_id) && local[1].every(item => !item.image_media_id), 'Media synchronization would be required');
  for (const item of [...local[0], ...local[1]]) assert.equal(local[2].filter(thread => thread.article_id === item.id || thread.event_id === item.id).length, 1);
  const insert = (table, row) => `INSERT INTO ${table} (${Object.keys(row).join(',')}) VALUES (${Object.values(row).map(literal).join(',')});`;
  const statements = [
    ...local[0].map(row => insert('news_articles', row)),
    ...local[1].map(row => insert('events', row)),
    ...local[2].map(row => insert('forum_threads', row)),
    `UPDATE facebook_posts SET status='review',updated_at=unixepoch()*1000 WHERE article_id IN (${articleIds}) AND status='pending' AND attempts=0;`,
  ];
  writeFileSync(join(directory, 'production-import.sql'), '-- Approved Oct. 6 editorial content, exported from current local rows.\n-- Keep Facebook delivery held for separate review, matching the Oct. 5 workflow.\n' + statements.join('\n\n') + '\n');
  console.log(JSON.stringify({ localStories: local[0].length, localEvents: local[1].length, localDiscussions: local[2].length, productionConflicts: 0, authorsMatch: true, localSectionCounts: local[4], productionSectionCounts: remote[4] }, null, 2));
} else if (mode === 'apply') {
  console.log(JSON.stringify({ statements: execute('remote', ['--file', join(directory, 'production-import.sql')]).length, success: true }));
} else if (mode === 'verify') {
  const local = execute('local', ['--command', query]);
  const remote = execute('remote', ['--command', query]);
  for (let index = 0; index < 4; index++) assert.deepEqual(remote[index], local[index], `Mismatch in dataset ${index}`);
  assert.deepEqual(remote[4], local[4], 'Story section counts differ');
  assert.deepEqual(remote[5], local[5], 'Event counts differ');
  assert.equal(remote[6].length, 2);
  assert(remote[6].every(item => item.status === 'review' && item.attempts === 0 && item.post_id === null));
  writeFileSync(join(directory, 'production-verified.json'), JSON.stringify(remote, null, 2));
  console.log(JSON.stringify({ exactStories: remote[0].length, exactEvents: remote[1].length, exactDiscussions: remote[2].length, authorsMatch: true, sectionCountsMatch: true, eventCountsMatch: true, facebookHeldForReview: true, sectionCounts: remote[4], eventCounts: remote[5] }, null, 2));
} else throw new Error('Specify prepare, apply or verify');
