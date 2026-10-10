import { editorialDirectory } from '../../project-library.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

const directory = editorialDirectory('2026-10-06');
const now = Date.now();
const authorId = 'oau9jXEaHtcRwXDqYxRL4VOsujos8vy1';
const physicianSource = 'https://eriehealthohio.com/erie-county-community-health-center-welcomes-dr-robert-cromley-do-to-team/';
const exhibitSource = 'https://www.rbhayes.org/events/2026/10/18/exhibit/special-exhibit-warrior-dogs-faithful-companions/';
const visitorSource = 'https://www.rbhayes.org/visit-us/visitor-information/';
const roundtableSource = 'https://www.rbhayes.org/news/2026/09/27/general/history-roundtable-s-october-sessions-focus-on-revolution-s-effect-on-british-empire-alexander-hamilton/';
const revolutionSource = 'https://www.rbhayes.org/events/2026/10/10/events/history-roundtable-with-mike-gilbert-the-american-revolution-and-its-effects-on-the-british-empire/';
const fleaSource = 'https://www.sanduskycountyfair.com/flea-markets';

const stories = [
  {
    id: randomUUID(), slug: 'erie-county-health-center-robert-cromley-new-patients-2026',
    headline: 'New family physician accepts patients at Erie County health center',
    summary: 'Dr. Robert Cromley is seeing patients of all ages at the Sandusky main campus. The health center says he brings 18 years of experience.',
    section: 'local', community: 'Sandusky',
    body: `Dr. Robert Cromley, a family physician, is accepting new patients of all ages at the Erie County Community Health Center's main campus in Sandusky, the health department announced.

The [announcement](${physicianSource}) appeared on the department's website Oct. 6. The attached news release is dated Sept. 28.

Cromley joins the center's primary care staff with 18 years of experience, according to the release. The department says he is board-certified in family medicine and osteopathic manipulative medicine, has practiced across Ohio and has helped train medical students.

Patients can call central scheduling at 567-867-5174 to arrange an appointment or ask about primary care services. The main campus is at [420 Superior St.](${'https://eriehealthohio.com/locations/'})

The release does not give Cromley's appointment hours or waiting times for new patients. Call scheduling for current availability.`,
  },
  {
    id: randomUUID(), slug: 'hayes-museum-warrior-dogs-exhibit-october-2026',
    headline: 'Canine sculptures honor veterans in new Hayes museum exhibit',
    summary: 'Nine works by Ohio artist James Mellick are on display in Fremont through Oct. 31. The exhibit is included with museum admission.',
    section: 'community', community: 'Fremont',
    body: `Nine wooden canine sculptures exploring military service and veterans' injuries are on display through Oct. 31 at the Rutherford B. Hayes Presidential Library & Museums in Fremont.

[“Warrior Dogs & Faithful Companions”](${exhibitSource}), by Ohio artist James Mellick, is in the museum rotunda. Each sculpture represents a military campaign and injuries experienced by the people who served, according to the museum.

The museum says Mellick created the works to draw attention to veterans' continuing needs and their bonds with dogs. The exhibition is part of its America 250 programming.

Admission to the exhibit is included with regular museum admission; Hayes Presidential members enter free.

The museum's [visitor information page](${visitorSource}) lists adult museum-only admission at $13. Museum hours are 9 a.m. to 5 p.m. Monday through Saturday and noon to 5 p.m. Sunday.

Hayes Presidential is at Spiegel Grove on Buckland Avenue. For information, call 419-332-2081.`,
  },
];

const museum = { venue: 'Rutherford B. Hayes Presidential Library & Museums', address: 'Spiegel Grove, Buckland Avenue', community: 'Fremont', organizer: 'Rutherford B. Hayes Presidential Library & Museums' };
const events = [
  {
    ...museum, id: randomUUID(), slug: 'hayes-warrior-dogs-exhibit-october-2026', title: 'Warrior Dogs & Faithful Companions exhibit',
    summary: 'James Mellick sculptures honoring veterans, included with museum admission.', category: 'arts',
    starts_on: '2026-10-02', ends_on: '2026-10-31', start_time: null, end_time: null,
    hours_note: 'Monday–Saturday, 9 a.m. to 5 p.m.; Sunday, noon to 5 p.m.',
    cost: 'Adult museum-only admission $13; Hayes Presidential members free', ticket_price: '', link: exhibitSource,
    description: `Nine canine sculptures are displayed in the museum rotunda. See the [exhibit announcement](${exhibitSource}) and [admission details](${visitorSource}).`,
  },
  {
    ...museum, venue: `${museum.venue} — museum auditorium`, id: randomUUID(), slug: 'hayes-history-roundtable-british-empire-october-10-2026',
    title: 'History Roundtable: American Revolution and the British Empire',
    summary: 'Mike Gilbert discusses the revolution’s consequences. Advance registration and payment are required.', category: 'classes',
    starts_on: '2026-10-10', ends_on: null, start_time: '10:00', end_time: '11:30', hours_note: '',
    cost: '$5 per session; advance registration and payment required', ticket_price: '5', link: revolutionSource,
    description: `The program looks at people affected by Britain's defeat, including displaced Loyalists and prisoners. Prerecorded sessions are available for those unable to attend in person.

Register and pay through curator Julie Mayle using the contact link in the [organizer's event listing](${revolutionSource}). The museum lists no refunds. For information, call 419-332-2081.`,
  },
  {
    ...museum, venue: `${museum.venue} — museum auditorium`, id: randomUUID(), slug: 'hayes-history-roundtable-hamilton-october-17-2026',
    title: 'History Roundtable: Alexander Hamilton',
    summary: 'Mike Gilbert discusses a murder trial involving Hamilton and Aaron Burr. Advance registration and payment are required.', category: 'classes',
    starts_on: '2026-10-17', ends_on: null, start_time: '10:00', end_time: '11:30', hours_note: '',
    cost: '$5 per session; advance registration and payment required', ticket_price: '5', link: roundtableSource,
    description: `The last session of the 2026 series examines the murder case that Alexander Hamilton and Aaron Burr defended in 1800. Prerecorded virtual sessions are also offered.

See the [museum's announcement](${roundtableSource}) for details. Call 419-332-2081 for registration information.`,
  },
  {
    id: randomUUID(), slug: 'fremont-flea-market-october-10-11-2026', title: 'Fremont flea market',
    summary: 'A two-day flea market at the Sandusky County Fairgrounds offers free admission and parking.', category: 'community',
    starts_on: '2026-10-10', ends_on: '2026-10-11', start_time: null, end_time: null,
    hours_note: 'Saturday, 9 a.m. to 4 p.m.; Sunday, 9 a.m. to 3 p.m.',
    venue: 'Sandusky County Fairgrounds', address: '901 Rawson Ave.', community: 'Fremont', organizer: 'Sandusky County Agricultural Society',
    cost: 'Free admission and parking', ticket_price: '0', link: fleaSource,
    description: `The fairgrounds' [2026 flea market schedule](${fleaSource}) lists Oct. 10–11. Admission and parking are free. Call 419-332-5604 for vendor information.`,
  },
];

const literal = value => value === null ? 'NULL' : typeof value === 'number' ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
const insert = (table, row) => `INSERT INTO ${table} (${Object.keys(row).join(', ')}) VALUES (${Object.values(row).map(literal).join(', ')});`;
const statements = [];
for (const story of stories) {
  statements.push(insert('news_articles', { ...story, byline: 'JD', author_id: authorId, status: 'published', published_at: now, created_at: now, updated_at: now }));
  statements.push(insert('forum_threads', { id: randomUUID(), author_id: 'newsroom', title: story.headline, body: story.summary, article_id: story.id, created_at: now, updated_at: now, last_activity_at: now }));
  writeFileSync(join(directory, `${story.slug}.md`), `# ${story.headline}\n\nBy JD · Oct. 6, 2026\n\n${story.summary}\n\n${story.body}\n`);
}
for (const event of events) {
  statements.push(insert('events', { ...event, status: 'published', created_at: now, updated_at: now }));
  statements.push(insert('forum_threads', { id: randomUUID(), author_id: 'newsroom', title: event.title, body: event.summary, event_id: event.id, created_at: now, updated_at: now, last_activity_at: now }));
}
mkdirSync(directory, { recursive: true });
writeFileSync(join(directory, 'stories-and-events.sql'), `-- Editorial content for local review. Production import requires editor approval.\n${statements.join('\n\n')}\n`);
writeFileSync(join(directory, 'manifest.json'), JSON.stringify({ date: '2026-10-06', authorId, createdAt: now, stories, events }, null, 2));
writeFileSync(join(directory, 'review-notes.md'), `# Oct. 6, 2026 editorial review\n\nTwo stories and four events prepared for local review. No photos imported.\n\n- Physician: website index says Oct. 6; release itself says Sept. 28. Dates are distinguished in the story. Qualifications, experience and patient acceptance are attributed to the department. Appointment hours and waiting times are not given. Release inspected directly at https://eriehealthohio.com/wp-content/uploads/2026/10/New-Doc-Cromley-scaled.jpg.webp.\n- Exhibit: detailed event listing says Oct. 2–31; the broader America 250 page says Oct. 1–31. Use the detailed listing for the calendar; the story avoids asserting an opening date. The calendar's midnight placeholder is not a visiting hour. Museum hours and prices come from the visitor information page.\n- Roundtable: confirmed 2026 dates, 10–11:30 a.m., $5 and advance registration/payment. Virtual sessions are prerecorded. Do not imply a live stream.\n- Flea market: organizer's schedule explicitly lists 2026, Oct. 10–11, differing daily hours, and free admission/parking.\n- Skipped pumpkin giveaway: Sept. 21 start, while supplies last, with no verified remaining availability.\n- Checked official Sandusky and Perkins police Facebook pages; those checks did not supply facts used in the saved stories.\n\nSources were checked Oct. 6, 2026. The import file is an initial snapshot; re-export reviewed local rows before any authorized production sync so edits are preserved.\n`);
console.log(JSON.stringify({ stories: stories.map(s => ({ id: s.id, slug: s.slug })), events: events.map(e => ({ id: e.id, slug: e.slug })) }, null, 2));
