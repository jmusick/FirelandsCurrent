import { editorialDirectory } from '../../project-library.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

const dir = editorialDirectory('2026-10-09');
const output = execFileSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', '--local', '--command', "SELECT id, name FROM user WHERE email='jd@orboro.net'; SELECT * FROM news_articles; SELECT * FROM events; SELECT * FROM forum_threads; SELECT * FROM facebook_posts;", '--json'], { encoding: 'utf8' });
const baseline = JSON.parse(output.slice(output.indexOf('[')));
assert.equal(baseline[0].results.length, 1);
const author = baseline[0].results[0];
assert.equal(author.name, 'JD');
const now = Date.now();
const review = readFileSync(editorialDirectory('2026-10-09') + 'review.md', 'utf8').replaceAll('\r\n', '\n');
const slugs = ['pipe-creek-parking-lot-access-project-october-2026', 'sandusky-haunt-house-contest-october-16-2026', 'sandusky-student-art-gifted-showcase-october-12-2026'];
const articles = review.split('\n## ').slice(1, 4).map((block, i) => {
  const headline = block.slice(0, block.indexOf('\n'));
  const metadata = block.match(/Section: (\w+) · Community: ([^\n]+) · Byline: JD/);
  const summary = block.match(/Summary: ([^\n]+)/)[1];
  const body = block.split(`Summary: ${summary}\n\n`)[1].split('\n\n[Review locally]')[0];
  return { id: randomUUID(), slug: slugs[i], headline, summary, body, section: metadata[1], community: metadata[2], byline: author.name, author_id: author.id, status: 'published', published_at: now + 2 - i, created_at: now, updated_at: now };
});
const link = 'https://www.sanduskycounty.org/jail';
const events = ['14', '28'].flatMap(day => [false, true].map(flashlight => ({
  id: randomUUID(), slug: `fremont-jail-${flashlight ? 'flashlight' : 'historic'}-tour-october-${day}-2026`,
  title: flashlight ? 'Historic jail and dungeon flashlight tour' : 'Historic jail and dungeon tour',
  summary: flashlight ? 'An evening history tour in the dark. Advance booking required; not recommended for children.' : 'A guided history tour of the jail, dungeon and gallows exhibition. Advance booking required.',
  description: flashlight
    ? `The visitors bureau lends guests flashlights for a guided history tour in the dark. This program is not recommended for children.\n\nThe schedule says 90 minutes, while the page's description says about 75 minutes; confirm duration with the organizer. Advance booking required; walk-ins are not accepted. Tickets cost $10. Check remaining availability before travel.\n\n[Schedule and booking](${link}); questions: 419-332-4470.`
    : `A guided tour of the historic jail, dungeon and gallows exhibition. The visitors bureau lists a one-hour tour for $5.\n\nAdvance booking required; walk-ins are not accepted. Check remaining availability before travel.\n\n[Schedule and booking](${link}); questions: 419-332-4470.`,
  category: 'arts', starts_on: `2026-10-${day}`, ends_on: null,
  start_time: flashlight ? '18:30' : '17:30', end_time: flashlight ? null : '18:30', hours_note: '',
  venue: 'Sandusky County Historic Jail & Dungeon', address: '622 Croghan St., Fremont, OH 43420',
  community: 'Fremont', organizer: 'Sandusky County Visitors Bureau', organizer_url: 'https://www.sanduskycounty.org/',
  cost: flashlight ? '$10; advance booking required' : '$5; advance booking required',
  ticket_price: flashlight ? '10' : '5', ticket_url: link, ticket_availability: '', link,
  status: 'published', created_at: now, updated_at: now,
})));
for (const [rows, existing] of [[articles, baseline[1].results], [events, baseline[2].results]]) {
  assert(rows.every(row => !existing.some(e => e.slug === row.slug)), 'Duplicate slug');
}
const threads = [
  ...articles.map(a => ({ id: randomUUID(), author_id: 'newsroom', title: a.headline, body: a.summary, article_id: a.id, created_at: a.published_at, updated_at: a.published_at, last_activity_at: a.published_at })),
  ...events.map(e => ({ id: randomUUID(), author_id: 'newsroom', title: e.title, body: e.summary, event_id: e.id, created_at: now, updated_at: now, last_activity_at: now })),
];
const sqlValue = v => v === null ? 'NULL' : typeof v === 'number' ? String(v) : "'" + v.replaceAll("'", "''") + "'";
const insert = (table, row) => `INSERT INTO ${table} (${Object.keys(row).join(', ')}) VALUES (${Object.values(row).map(sqlValue).join(', ')});`;
writeFileSync(dir + 'before-import.json', JSON.stringify(baseline, null, 2));
writeFileSync(dir + 'content.json', JSON.stringify({ articles, events, threads }, null, 2));
writeFileSync(dir + 'import-local.sql', [
  ...articles.map(a => insert('news_articles', a)),
  `UPDATE facebook_posts SET status = 'review' WHERE article_id IN (${articles.map(a => sqlValue(a.id)).join(', ')});`,
  ...events.map(e => insert('events', e)),
  ...threads.map(t => insert('forum_threads', t)),
].join('\n'));
console.log(JSON.stringify({ articles: articles.map(a => ({ slug: a.slug, words: a.body.split(/\s+/).length })), events: events.map(e => e.slug), threads: threads.length }));
