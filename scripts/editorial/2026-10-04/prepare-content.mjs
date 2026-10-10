import { editorialDirectory } from '../../project-library.mjs';
import { writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

const out = editorialDirectory('2026-10-04');
const stamp = Date.now();
const sources = {
  soccer: 'https://www.pccsd.net/apps/news/show_news.jsp?REC_ID=1032099&id=0',
  huron: 'https://files.smartsites.parentsquare.com/7972/september_2026_central_office_newsletter.pdf',
  conversations: 'https://huronk12.org/67931?articleID=74924',
  oberlin: 'https://cityofoberlin.com/2026/09/25897/',
  parks: 'https://eriemetroparks.org/wp-content/uploads/2026/08/October-2026.pdf',
  ohgo: 'https://www.raise.pub/events/10998',
};

const articles = [
  {
    slug: 'port-clinton-sandusky-kick-for-the-cure-october-5-2026',
    headline: 'Port Clinton and Sandusky soccer teams to play for a student fundraiser Monday',
    summary: 'Kick for the Cure at True Lay Stadium includes boys and girls games and $1 shots against school resource officers.',
    section: 'community', community: 'Port Clinton',
    body: `Port Clinton and Sandusky high school soccer teams will meet Monday, Oct. 5, at True Lay Stadium for a fundraiser benefiting a Port Clinton student.

The boys game starts at 5 p.m., followed by the girls game at 7 p.m., according to [Port Clinton City Schools' announcement](${sources.soccer}).

About 6:30 p.m., children can pay $1 to take a shot against school resource officers serving as guest goalies. The district also plans a 50/50 fundraiser.

The district says proceeds will support a high school student with cancer. Fans wearing a Kick for the Cure T-shirt receive free game admission; the announcement does not give the regular admission price.

Port Clinton cheerleaders will participate, and the concession stand will offer Crumbl cookies.`,
  },
  {
    slug: 'huron-woodlands-entrance-student-stadium-rules-2026',
    headline: 'Huron schools change Woodlands traffic flow, reinforce football spectator rules',
    summary: 'Drivers enter from Buckeye Boulevard and exit onto Deerwood Drive. Elementary students attending football games should sit with a responsible adult.',
    section: 'schools', community: 'Huron',
    body: `Huron City Schools has changed the entrance traffic pattern at Woodlands Elementary and added a covered walkway for children arriving by car, the district says in its September newsletter.

Vehicles now enter from Buckeye Boulevard and leave onto Deerwood Drive. A community donation paid for the walkway between the curb and the school entrance, Superintendent James Tatman wrote in the [newsletter posted Sept. 29](${sources.huron}).

The district also reminded families of its expectations at football games. Middle and high school students should stay in their designated sections. Elementary students should watch from the stands with a responsible adult.

Students may leave for concessions or restrooms, then return to the stands. The district discourages running, ball play and horseplay inside the stadium.

Residents can ask district leaders questions at an [informal community conversation](${sources.conversations}) Oct. 17 from 8 to 9 a.m. at Gathering Grounds Coffee House. No registration is required.`,
  },
  {
    slug: 'oberlin-city-council-vacancy-applications-october-16-2026',
    headline: 'Oberlin seeks applicants for council vacancy; deadline is Oct. 16',
    summary: 'Residents have until 4 p.m. Oct. 16 to apply for an appointment to a council seat that becomes vacant at year-end.',
    section: 'government', community: 'Oberlin',
    body: `Oberlin residents have until 4 p.m. Friday, Oct. 16, to apply for a City Council seat that will become vacant at the end of 2026.

The remaining council members will choose an appointee by majority vote, according to the city's [vacancy notice](${sources.oberlin}). The appointee will serve the remaining term or until a successor is elected and qualified.

Applications can be submitted online or sent to Clerk of Council Belinda Anderson by email, mail or in person. Her office is at 85 S. Main St., Oberlin, OH 44074; her email is banderson@cityofoberlin.com. The city provides a downloadable application through the notice.

The notice says applicants must meet state and city charter qualifications and remain Oberlin residents while serving. City employees are ineligible, while school employees may serve.

The notice does not name the departing council member or give an appointment date.`,
  },
];

const events = [
  {
    slug: 'port-clinton-kick-for-the-cure-2026', title: 'Kick for the Cure soccer fundraiser',
    summary: 'Port Clinton hosts Sandusky in a student fundraiser.',
    description: 'Boys: 5 p.m.; girls: 7 p.m. Children’s $1 goalie challenge about 6:30 p.m.',
    category: 'community', starts_on: '2026-10-05', start_time: '17:00', end_time: null,
    venue: 'True Lay Stadium', address: '', community: 'Port Clinton', organizer: 'Port Clinton High School',
    cost: 'Regular admission not stated; fundraiser T-shirt wearers admitted free.', link: sources.soccer,
  },
  {
    slug: 'ohgo-empty-bowls-winerie-october-5-2026', title: 'OHgo Empty Bowls — sold out',
    summary: 'Sold-out dinner fundraiser supports OHgo’s food pantry and fresh markets.',
    description: `**Sold out:** OHgo's ticket page says tickets are no longer available. This event is for existing ticket holders.

The adult-only fundraiser includes a hand-painted keepsake bowl, soups and chilis, desserts, wine and live entertainment. Additional parking is at Woussickett Golf Course, 6311 W. Mason Road, with a free shuttle to the venue.`,
    category: 'food', starts_on: '2026-10-05', start_time: '16:30', end_time: '19:30',
    venue: 'The Winerie', address: '6413 Hayes Ave., Sandusky, OH 44870', community: 'Sandusky', organizer: 'OHgo',
    cost: 'Sold out; original ticket price not confirmed.', link: sources.ohgo,
  },
  {
    slug: 'erie-metroparks-bat-night-october-8-2026', title: 'Bat Night at Edison Woods',
    summary: 'Look for bats with detection equipment. All ages; no registration.',
    description: 'Meet at Edison Woods MetroPark. Walk-ins welcome.',
    category: 'outdoors', starts_on: '2026-10-08', start_time: '19:00', end_time: '20:00',
    venue: 'Edison Woods MetroPark', address: '8111 Smokey Road, Berlin Heights, OH', community: 'Berlin Heights', organizer: 'Erie MetroParks',
    cost: '', link: sources.parks,
  },
  {
    slug: 'osborn-halloween-hike-october-10-2026', title: 'Halloween hike at Osborn MetroPark',
    summary: 'Costumes welcome for an all-ages nature walk; no registration.',
    description: 'Meet in the nature center atrium. Coffee and hot cocoa provided.',
    category: 'outdoors', starts_on: '2026-10-10', start_time: '12:00', end_time: '13:00',
    venue: 'Roger Johnson Nature Center', address: '3910 Perkins Ave., Huron, OH', community: 'Huron', organizer: 'Erie MetroParks',
    cost: '', link: sources.parks,
  },
  {
    slug: 'erie-metro-live-steamers-train-rides-october-17-2026', title: 'Miniature train rides at Eagle Point',
    summary: 'Weather-dependent rides for all ages. No registration.',
    description: 'Erie Metro Live Steamers provide miniature steam-powered train rides.',
    category: 'family', starts_on: '2026-10-17', start_time: '10:00', end_time: '12:00',
    venue: 'Community Foundation Preserve at Eagle Point', address: '3819 Cleveland Road W., Sandusky, OH', community: 'Sandusky', organizer: 'Erie MetroParks',
    cost: '', link: sources.parks,
  },
  {
    slug: 'roger-johnson-nature-center-trick-or-treat-2026', title: 'Trick or treat at the nature center',
    summary: 'All ages; costumes encouraged. No registration.',
    description: 'Rain location is inside the nature center.',
    category: 'family', starts_on: '2026-10-17', start_time: '14:00', end_time: '15:00',
    venue: 'Roger Johnson Nature Center', address: '3910 Perkins Ave., Huron, OH', community: 'Huron', organizer: 'Erie MetroParks',
    cost: '', link: sources.parks,
  },
  ...[
    ['2026-10-17', '08:00', '09:00'],
    ['2026-11-18', '07:30', '08:30'],
  ].map(([day, start, end]) => ({
    slug: `huron-school-community-conversation-${day}`, title: 'Huron schools community conversation',
    summary: 'Meet Superintendent James Tatman and Treasurer Mike Limberios.',
    description: 'Open to all Huron residents, including those without students in the district. No formal agenda or registration; bring questions about district academics, facilities or finances.',
    category: 'meetings', starts_on: day, start_time: start, end_time: end,
    venue: 'Gathering Grounds Coffee House', address: '', community: 'Huron', organizer: 'Huron City Schools',
    cost: '', link: sources.conversations,
  })),
];

const sqlValue = (value) => value == null ? 'NULL' : typeof value === 'number' ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
const insert = (table, row) => `INSERT INTO ${table} (${Object.keys(row).join(', ')}) VALUES (${Object.values(row).map(sqlValue).join(', ')});`;
const sql = ['-- Editorial additions researched Oct. 4, 2026. Imported locally only. No production authorization.', '-- Author is resolved in the target database; do not sync until the editor approves.'];
for (const article of articles) {
  article.id = randomUUID();
  article.thread_id = randomUUID();
  const { thread_id, ...row } = article;
  row.byline = 'JD'; row.status = 'published'; row.published_at = stamp; row.created_at = stamp; row.updated_at = stamp;
  const query = insert('news_articles', row);
  sql.push(query.replace('updated_at)', 'updated_at, author_id)').replace(/\);$/, `, (SELECT id FROM "user" WHERE lower(email) = 'jd@orboro.net'));`));
  sql.push(insert('forum_threads', { id: thread_id, author_id: 'newsroom', title: row.headline, body: row.summary, article_id: row.id, status: 'published', created_at: stamp, updated_at: stamp, last_activity_at: stamp }));
}
for (const event of events) {
  event.id = randomUUID(); event.thread_id = randomUUID();
  const { thread_id, ...row } = event;
  row.ends_on = null; row.hours_note = ''; row.image_media_id = null;
  row.performer = ''; row.performer_type = 'PerformingGroup'; row.ticket_price = '';
  row.ticket_url ??= ''; row.ticket_availability ??= '';
  row.status = 'published'; row.created_at = stamp; row.updated_at = stamp;
  sql.push(insert('events', row));
  sql.push(insert('forum_threads', { id: thread_id, author_id: 'newsroom', title: row.title, body: row.summary, event_id: row.id, status: 'published', created_at: stamp, updated_at: stamp, last_activity_at: stamp }));
}
writeFileSync(join(out, 'content.json'), JSON.stringify({ researched_on: '2026-10-04', imported_at: stamp, sources, articles, events }, null, 2) + '\n');
writeFileSync(join(out, 'import.sql'), sql.join('\n\n') + '\n');
let review = '# Firelands Current editorial review — Oct. 4, 2026\n\nPrepared for local review only. Three stories, eight events and matching discussions. No production sync or Facebook posting authorized. All stories use JD’s account. No external photos copied into the media library.\n\n';
for (const a of articles) review += `## ${a.headline}\n\nSection: ${a.section}; community: ${a.community}.\n\n${a.summary}\n\n${a.body}\n\nLocal preview: http://127.0.0.1:4321/news/${a.slug}\n\n`;
review += '## Calendar additions\n\n';
for (const e of events) review += `### ${e.title}\n\n${e.starts_on}, ${e.start_time}${e.end_time ? '–' + e.end_time : ''} Eastern. ${e.venue}${e.address ? ', ' + e.address : ''}.\n\n${e.summary}\n\n${e.description}\n\nCost: ${e.cost || 'Not confirmed; left blank.'}\n\n[Organizer source](${e.link})\n\nLocal preview: http://127.0.0.1:4321/events/${e.slug}\n\n`;
review += `## Verification and follow-up\n\n- Duplicate check: all local news titles and events reviewed; live /news and /events checked. No matching additions found.\n- Soccer: district announcement posted Sept. 25, 2026; event is Monday, Oct. 5. No end time, regular admission price or stadium street address confirmed. No unconditional free-admission offer entered.\n- Huron safety: Sept. 29 website post links to September 2026 newsletter; pages 1–2 visually reviewed. Traffic changes reported as school-year changes, without claiming they began today.\n- Oberlin: homepage dates notice Sept. 17; deadline verified on notice itself: Oct. 16, 2026, 4 p.m. City notice used for its stated qualifications; no independent legal interpretation. Application packet also reviewed.\n- Parks: October 2026 brochure, page 2, visually reviewed. The primary brochure gives Halloween hikes noon–1 p.m.; a secondary ECBDD listing says 1:15 p.m. Primary organizer schedule used. Fees not explicitly confirmed for these four programs, so cost and offers left blank. Registration catalog did not expose individual details reliably.\n- Huron conversations: Aug. 31 announcement remains linked from current school homepage; Oct. 17 also appears in September newsletter. Nov. 18 confirmed in announcement. Venue address and admission cost left blank.\n- OHgo: new primary source, linked to Raise from official website. Browser inspection of the ticket page confirms Oct. 5, 2026, 4:30–7:30 p.m., 6413 Hayes Ave., adult-only access, sold-out status and shuttle. Homepage still says tickets are live; the ticket page takes precedence. Original price and named musicians unconfirmed. Sold-out status appears in title, summary, description and cost. All structured offer fields left blank because the original price is unconfirmed; this preserves the admin editor’s validation rules.\n- Signed-in Facebook: official Sandusky city/police pages mostly repeat covered items; OHgo page confirms active local food-distribution posts. No posts, reactions or messages sent.\n- Held: health department pumpkin giveaway began Sept. 21 while supplies last; current inventory unconfirmed. Linda Miller-Moore story appeared Oct. 2 online but actual release is Sept. 14, so not treated as new news. Library sidewalk notice concerns August; skipped.\n- Additional leads: [OHgo food resources](https://www.ohgoreach.org/get-help.html), [Care & Share hours](https://careandshareerieco.org/hours/), [Sandusky County Job and Family Services food assistance](https://sanduskycountydjfs.org/public/food-assistance/) are useful direct service sources; figures, eligibility and schedules need checking for any future story. [Mix 102.7 Community Focus](https://mix1027.com/news/community-focus/) is a useful lead list, with date/time errors possible; verify against organizers. Maritime Museum calendar exposed no upcoming events.\n\nSource PDFs and production list snapshots are saved alongside this review for editorial reference. No version bump needed for content data.\n`;
writeFileSync(join(out, 'review.md'), review);
console.log(`Prepared ${articles.length} stories and ${events.length} events. Import file: ${join(out, 'import.sql')}`);
