import { editorialDirectory } from '../../project-library.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

const dir = editorialDirectory('2026-10-08');
const query = sql => {
  const output = execFileSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', '--local', '--command', sql, '--json'], { encoding: 'utf8' });
  return JSON.parse(output.slice(output.indexOf('[')));
};
const baseline = query("SELECT id, name FROM user WHERE email='jd@orboro.net'; SELECT * FROM news_articles; SELECT * FROM events; SELECT * FROM forum_threads; SELECT * FROM facebook_posts;");
assert.equal(baseline[0].results.length, 1, 'JD account required');
const author = baseline[0].results[0];
assert.equal(author.name, 'JD');
writeFileSync(dir + 'before-import.json', JSON.stringify(baseline, null, 2));
const now = Date.now();
const review = readFileSync(editorialDirectory('2026-10-08') + 'review.md', 'utf8').replaceAll('\r\n', '\n');
const slugs = ['port-clinton-fall-cleanup-october-10-2026', 'oak-harbor-apple-festival-october-10-11-2026', 'erie-county-kaptur-treatment-help-october-2026'];
const articles = review.split('\n## ').slice(1, 4).map((block, i) => {
  const headline = block.slice(0, block.indexOf('\n'));
  const metadata = block.match(/Section: (\w+) · Community: ([^\n]+) · Byline: JD/);
  const summary = block.match(/Summary: ([^\n]+)/)[1];
  const body = block.split(`Summary: ${summary}\n\n`)[1].split('\n\n[Review locally]')[0];
  return { id: randomUUID(), slug: slugs[i], headline, summary, body, section: metadata[1], community: metadata[2], byline: author.name, author_id: author.id, status: 'published', published_at: now + i, created_at: now, updated_at: now };
});
const festival = 'https://www.oakharborapplefestival.com/';
const district = 'https://www.sanduskycoswcd.org/';
const cleanup = 'https://www.facebook.com/photo/?fbid=1536731205167226&set=a.233506642156362';
const events = [
  {
    slug: 'port-clinton-fall-cleanup-october-10-2026', title: 'Port Clinton fall cleanup',
    summary: 'City residents can drop off discarded items. Proof of residency and unloading your own vehicle are required; several materials are excluded.',
    description: `Enter the city-designated City Hall parking lot through the Police Station entrance off Buckeye Boulevard. This collection is for Port Clinton city residents only; bring proof of residency. The notice does not specify accepted proof documents.\n\nResidents must unload their own vehicles or trailers. City crews operate heavy equipment to move discarded items into dumpsters.\n\nNo hazardous materials, lawn or landscaping materials, contractor construction materials, tires, paint, computers, televisions, air conditioners or refrigerators.\n\nNo disposal fee is stated. Questions: 419-734-5522, ext. 239, or pcadmin@portclinton.com. See the [city announcement](${cleanup}).`,
    category: 'community', starts_on: '2026-10-10', ends_on: null, start_time: '08:00', end_time: '15:00', hours_note: '',
    venue: 'City-designated City Hall parking lot', address: 'Police Station entrance off Buckeye Boulevard, Port Clinton, Ohio', community: 'Port Clinton', organizer: 'City of Port Clinton', organizer_url: 'https://www.portclinton.com/', cost: '', link: cleanup,
  },
  {
    slug: 'oak-harbor-apple-festival-october-2026', title: 'Oak Harbor Apple Festival',
    summary: 'A weekend of vendors, entertainment, a Saturday parade and Sunday races. Festival admission is free; activity locations and hours vary.',
    description: `The Oak Harbor Area Chamber of Commerce confirms the festival for Oct. 10–11, 2026. Festival admission is free. The high school shuttle costs $2 per person; rides, food and other activities may have separate charges.\n\nSaturday's Grand Parade starts at 2 p.m., traveling from Oak Harbor Junior High School south on Church Street, then east on Main Street to Veterans Park.\n\nSunday's [car, truck and motorcycle show](${festival}car-bike-show) runs noon to 4 p.m. at Oak Harbor High School, 11661 W. State Route 163. Exhibitor registration runs 10 a.m. to noon; see that listing for vehicle entry details.\n\nSunday's [Apple Run](${festival}apple-run) starts at 315 N. Church St., with the one-mile children's fun run at 1:30 p.m. and the 5K at 2 p.m. See the registration link for fees and entry details.\n\nCheck the [official schedule](${festival}) for individual activities; overall opening and closing hours are not specified here.`,
    category: 'family', starts_on: '2026-10-10', ends_on: '2026-10-11', start_time: null, end_time: null,
    hours_note: 'Hours vary by activity. Saturday parade: 2 p.m. Sunday car show: noon–4 p.m.; children’s run: 1:30 p.m.; 5K: 2 p.m.',
    venue: 'Downtown Oak Harbor; selected activities at the high school and 315 N. Church St.', address: 'Church and Water streets, Oak Harbor, Ohio', community: 'Oak Harbor', organizer: 'Oak Harbor Area Chamber of Commerce', organizer_url: 'https://www.oakharborohio.net/', cost: 'Festival admission free; high school shuttle $2 per person; activity fees may apply', link: festival,
  },
  {
    slug: 'fantastic-fungi-clyde-october-14-2026', title: 'The Fantastic Fungi of Ohio — Clyde',
    summary: 'A library program listed by Sandusky County Soil and Water Conservation District. Contact the organizer about registration and audience.',
    description: `Sandusky County Soil and Water Conservation District lists The Fantastic Fungi of Ohio at Clyde Public Library.\n\nThe district's [education page](${district}education/) says its library programs are free. This event listing does not specify registration requirements, an age range or activities beyond the program title. Contact the district at 419-334-6324 for those details.\n\nSee the [organizer's event listing](${district}event/the-fantastic-fungi-of-ohio/).`,
    category: 'classes', starts_on: '2026-10-14', ends_on: null, start_time: '16:00', end_time: '17:00', hours_note: '',
    venue: 'Clyde Public Library', address: '222 W. Buckeye St., Clyde, OH 43410', community: 'Clyde', organizer: 'Sandusky County Soil and Water Conservation District', organizer_url: district, cost: 'Free; district library programs are free', link: district + 'event/the-fantastic-fungi-of-ohio/',
  },
  {
    slug: 'fantastic-fungi-fremont-october-27-2026', title: 'The Fantastic Fungi of Ohio — Fremont',
    summary: 'A library program listed by Sandusky County Soil and Water Conservation District. Contact the organizer about registration and audience.',
    description: `Sandusky County Soil and Water Conservation District lists The Fantastic Fungi of Ohio at Birchard Public Library in Fremont.\n\nThe district's [education page](${district}education/) says its library programs are free. This event listing does not specify registration requirements, an age range or activities beyond the program title. Contact the district at 419-334-6324 for those details.\n\nSee the [organizer's event listing](${district}event/the-fantastic-fungi-of-ohio-3/).`,
    category: 'classes', starts_on: '2026-10-27', ends_on: null, start_time: '17:00', end_time: '18:00', hours_note: '',
    venue: 'Birchard Public Library', address: '423 Croghan St., Fremont, OH 43420', community: 'Fremont', organizer: 'Sandusky County Soil and Water Conservation District', organizer_url: district, cost: 'Free; district library programs are free', link: district + 'event/the-fantastic-fungi-of-ohio-3/',
  },
].map(e => ({ id: randomUUID(), ...e, status: 'published', created_at: now, updated_at: now }));
for (const [rows, existing] of [[articles, baseline[1].results], [events, baseline[2].results]]) {
  assert(rows.every(row => !existing.some(e => e.slug === row.slug)), 'Duplicate slug');
}
const threads = [
  ...articles.map(a => ({ id: randomUUID(), author_id: 'newsroom', title: a.headline, body: a.summary, article_id: a.id, created_at: a.published_at, updated_at: a.published_at, last_activity_at: a.published_at })),
  ...events.map(e => ({ id: randomUUID(), author_id: 'newsroom', title: e.title, body: e.summary, event_id: e.id, created_at: now, updated_at: now, last_activity_at: now })),
];
const sqlValue = v => v === null ? 'NULL' : typeof v === 'number' ? String(v) : "'" + v.replaceAll("'", "''") + "'";
const insert = (table, row) => `INSERT INTO ${table} (${Object.keys(row).join(', ')}) VALUES (${Object.values(row).map(sqlValue).join(', ')});`;
writeFileSync(dir + 'content.json', JSON.stringify({ articles, events, threads }, null, 2));
writeFileSync(dir + 'import-local.sql', [
  ...articles.map(a => insert('news_articles', a)),
  `UPDATE facebook_posts SET status = 'review' WHERE article_id IN (${articles.map(a => sqlValue(a.id)).join(', ')});`,
  ...events.map(e => insert('events', e)),
  ...threads.map(t => insert('forum_threads', t)),
].join('\n'));
console.log(JSON.stringify({ articles: articles.map(a => ({ slug: a.slug, words: a.body.split(/\s+/).length })), events: events.map(e => e.slug), threads: threads.length }));
