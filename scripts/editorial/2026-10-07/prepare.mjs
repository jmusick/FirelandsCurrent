import { editorialDirectory } from '../../project-library.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const review = readFileSync(editorialDirectory('2026-10-07') + 'review.md', 'utf8');
const dir = editorialDirectory('2026-10-07');
const now = Date.now();
const author = 'oau9jXEaHtcRwXDqYxRL4VOsujos8vy1';
const slugs = ['saints-peter-paul-church-roof-closure-october-2026', 'erie-county-sheriff-fingerprinting-fees-october-2026', 'huron-library-book-sale-october-7-10-2026'];
const articles = review.split('\n## ').slice(1, 4).map((block, i) => {
  const headline = block.slice(0, block.indexOf('\n'));
  const metadata = block.match(/Section: (\w+) · Community: ([^\n]+) · Byline: JD/);
  const summary = block.match(/Summary: ([^\n]+)/)[1];
  const body = block.split(`Summary: ${summary}\n\n`)[1].split('\n\n[Review locally]')[0];
  return { id: randomUUID(), slug: slugs[i], headline, summary, body, section: metadata[1], community: metadata[2], byline: 'JD', author_id: author, status: 'published', published_at: now + i, created_at: now, updated_at: now };
});
const events = [
  {
    slug: 'huron-library-book-sale-october-2026', title: 'Friends of Huron Public Library book sale',
    summary: 'Four-day sale with a members-only Wednesday preview and a $5 bag sale Saturday. Hours vary by day.',
    description: 'Shop the Friends of Huron Public Library book sale in Rooms A and B. Wednesday is for members only; memberships are available at the door.\n\nScanners are prohibited Wednesday through Friday and welcome Saturday. Prices are by donation, with a $5 bag sale Saturday. Proceeds benefit the library.\n\nSee the library listings for [Wednesday](https://huronlibrary.libcal.com/event/17518782), [Thursday](https://huronlibrary.libcal.com/event/17518798), [Friday](https://huronlibrary.libcal.com/event/17518802) and [Saturday](https://huronlibrary.libcal.com/event/17518806).',
    category: 'community', starts_on: '2026-10-07', ends_on: '2026-10-10', start_time: null, end_time: null,
    hours_note: 'Wednesday, 4:30–7:30 p.m. (members only); Thursday, 9:30 a.m.–7:30 p.m.; Friday, 9:30 a.m.–4:30 p.m.; Saturday, 9:30 a.m.–1:30 p.m.',
    venue: 'Huron Public Library — Rooms A and B', organizer: 'Friends of Huron Public Library', cost: 'Prices by donation; Saturday $5 bag sale; Wednesday membership required', link: 'https://huronlibrary.libcal.com/event/17518782'
  },
  {
    slug: 'huron-library-mini-fall-festival-october-10-2026', title: 'Mini Fall Festival at Huron Public Library',
    summary: 'Children, preschoolers and tweens can join fall activities, storytime, games and crafts at the library.',
    description: 'The library lists rock painting, pumpkin games, crafts, coloring, puzzles, pop-up storytime, bingo, fall cartoons, cider and doughnuts.\n\nActivities take place in the AV Area, Story Hour Room and Teen Area. The listed audiences are preschoolers, children and tweens.\n\nSee the [library event listing](https://huronlibrary.libcal.com/event/15129691) for details.',
    category: 'family', starts_on: '2026-10-10', ends_on: null, start_time: '10:00', end_time: '12:00', hours_note: '',
    venue: 'Huron Public Library — AV Area, Story Hour Room and Teen Area', organizer: 'Huron Public Library', cost: '', link: 'https://huronlibrary.libcal.com/event/15129691'
  },
  {
    slug: 'huron-library-internet-safety-october-12-2026', title: 'Highlights + Google Internet Safety for Kids',
    summary: 'A hands-on internet safety program for grades two through five. Registration is required.',
    description: 'Library staff lead lessons about being safe, kind and confident online, using the Highlights and Google program.\n\nFor grades two through five. Participants must read and write independently and are expected to attend each month\'s Monday program. Registration is required.\n\nUse the [library event listing](https://huronlibrary.libcal.com/event/17149203) to register and check availability.',
    category: 'classes', starts_on: '2026-10-12', ends_on: null, start_time: '16:00', end_time: '17:00', hours_note: '',
    venue: 'Huron Public Library — Board Room', organizer: 'Huron Public Library', cost: '', link: 'https://huronlibrary.libcal.com/event/17149203'
  }
].map(e => ({id: randomUUID(), ...e, address: '333 Williams St., Huron, OH 44839', community: 'Huron', organizer_url: 'https://www.huronlibrary.org/', status: 'published', created_at: now, updated_at: now}));
const threads = [...articles.map(a => ({ id: randomUUID(), author_id: 'newsroom', title: a.headline, body: a.summary, article_id: a.id, created_at: a.published_at, updated_at: a.published_at, last_activity_at: a.published_at })), ...events.map(e => ({ id: randomUUID(), author_id: 'newsroom', title: e.title, body: e.summary, event_id: e.id, created_at: now, updated_at: now, last_activity_at: now }))];
const sqlValue = v => v === null ? 'NULL' : typeof v === 'number' ? String(v) : "'" + v.replaceAll("'", "''") + "'";
const insert = (table, row) => `INSERT INTO ${table} (${Object.keys(row).join(', ')}) VALUES (${Object.values(row).map(sqlValue).join(', ')});`;
writeFileSync(dir + 'content.json', JSON.stringify({articles, events, threads}, null, 2));
writeFileSync(dir + 'import-local.sql', [...articles.map(a => insert('news_articles', a)), ...events.map(e => insert('events', e)), ...threads.map(t => insert('forum_threads', t)), `UPDATE facebook_posts SET status = 'review' WHERE article_id IN (${articles.map(a => sqlValue(a.id)).join(', ')});`].join('\n'));
console.log(JSON.stringify({articles: articles.map(a => ({slug:a.slug, words:a.body.split(/\s+/).length})), events: events.map(e => e.slug), threads: threads.length}));
