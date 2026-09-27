-- Demo content for Talk of the Town and News. Local development only.
-- News stories are fictional: invented people and events in real Firelands communities.
-- Re-runnable: removes previous demo rows (ids prefixed "demo-") before inserting.
-- Demo users have no account rows, so nobody can sign in as them.
-- Timestamps are relative to the moment the seed runs.

DELETE FROM forum_replies WHERE id LIKE 'demo-%';
DELETE FROM forum_threads WHERE id LIKE 'demo-%';
DELETE FROM news_articles WHERE id LIKE 'demo-%';
DELETE FROM "user" WHERE id LIKE 'demo-%';

INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt) VALUES
  ('demo-marge', 'Marge Hoffman', 'marge@demo.invalid', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-14 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-14 days')),
  ('demo-dave', 'Dave K.', 'dave@demo.invalid', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-13 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-13 days')),
  ('demo-tasha', 'Tasha R.', 'tasha@demo.invalid', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-12 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-12 days')),
  ('demo-bill', 'Bill from Huron', 'bill@demo.invalid', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-11 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-11 days')),
  ('demo-lena', 'Lena Ortiz', 'lena@demo.invalid', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-10 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-10 days'));

-- Timestamps are epoch ms: now minus N minutes.
INSERT INTO forum_threads (id, author_id, title, body, created_at, updated_at, last_activity_at) VALUES
  ('demo-t1', 'demo-marge', 'Welcome to Talk of the Town — introduce yourself!',
   'New here? Tell us which corner of the Firelands you call home and what you''d like to see covered. I''ll start: I''ve lived in Sandusky for thirty-odd years and I''m mostly here for the local news and the gossip about new restaurants.',
   (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 10080 * 60000), (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 10080 * 60000), (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 9000 * 60000)),
  ('demo-t2', 'demo-lena', 'Favorite lakeside walks in Vermilion once the summer crowds are gone',
   'Now that it''s quieter along the water, I''m looking for good walking routes in and around Vermilion. Bonus points for somewhere with a bench and a view of the lake at sunset.',
   (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 7200 * 60000), (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 7200 * 60000), (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 6500 * 60000)),
  ('demo-t3', 'demo-bill', 'Best spots for walleye off the Marblehead shoreline this fall?',
   'The fall bite should be picking up soon. Anyone having luck from shore around Marblehead, or is it boat-only this time of year? Happy to trade tips on lures.',
   (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 4320 * 60000), (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 4320 * 60000), (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 3800 * 60000)),
  ('demo-t4', 'demo-tasha', 'Looking for a good family dentist in Norwalk or Huron',
   'We just moved to the area with two kids and need a dentist who is patient with little ones. Recommendations appreciated, and let me know which offices are taking new patients.',
   (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 2880 * 60000), (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 2880 * 60000), (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 2700 * 60000)),
  ('demo-t5', 'demo-marge', 'Downtown Sandusky farmers market — worth going this Saturday?',
   'Haven''t been since August. Are there still plenty of vendors this late in the season, or is it mostly pumpkins and mums at this point? Thinking of bringing my sister.',
   (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 1440 * 60000), (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 1440 * 60000), (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 1200 * 60000)),
  ('demo-t6', 'demo-dave', 'Road work on US-250 near the Milan exit: how long will this last?',
   'Sat in the lane closure for twenty minutes this morning. Has anyone seen an official end date for the construction? Looking for a decent detour for the morning commute in the meantime.',
   (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 600 * 60000), (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 600 * 60000), (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 120 * 60000)),
  ('demo-t7', 'demo-lena', 'Volunteers needed: shoreline cleanup at the end of October',
   'A few of us are organizing a Saturday morning cleanup along the bay. Gloves and bags provided. Reply here if you can make it so we know how much coffee to bring.',
   (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 200 * 60000), (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 200 * 60000), (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 150 * 60000)),
  ('demo-t8', 'demo-bill', 'Anyone else notice the geese at Battery Park are back early?',
   'Counted at least forty of them on the lawn this afternoon. Feels early to me. Is this a sign of an early winter or am I reading too much into it?',
   (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 90 * 60000), (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 90 * 60000), (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 90 * 60000));

INSERT INTO forum_replies (id, thread_id, author_id, body, created_at, updated_at) VALUES
  ('demo-r1', 'demo-t1', 'demo-dave', 'Dave here, from Norwalk. Mostly interested in road and school board news.', (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 10000 * 60000), (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 10000 * 60000)),
  ('demo-r2', 'demo-t1', 'demo-tasha', 'Hi all! Brand new to Huron. Still figuring out where everything is.', (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 9800 * 60000), (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 9800 * 60000)),
  ('demo-r3', 'demo-t1', 'demo-lena', 'Vermilion born and raised. Glad to see a local paper starting up.', (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 9500 * 60000), (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 9500 * 60000)),
  ('demo-r4', 'demo-t1', 'demo-bill', 'Bill from Huron, obviously. Fishing reports are my department.', (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 9000 * 60000), (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 9000 * 60000)),
  ('demo-r5', 'demo-t2', 'demo-bill', 'The walk out along the harbor is hard to beat on a clear evening.', (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 7000 * 60000), (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 7000 * 60000)),
  ('demo-r6', 'demo-t2', 'demo-tasha', 'Adding these to my list. Are any of them stroller friendly?', (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 6500 * 60000), (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 6500 * 60000)),
  ('demo-r7', 'demo-t3', 'demo-dave', 'Had some luck casting at dusk last fall. Mornings were dead for me.', (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 4000 * 60000), (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 4000 * 60000)),
  ('demo-r8', 'demo-t3', 'demo-marge', 'My late husband swore by the rocks near the lighthouse. Worth a try.', (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 3900 * 60000), (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 3900 * 60000)),
  ('demo-r9', 'demo-t3', 'demo-bill', 'Thanks both. I''ll try dusk this weekend and report back.', (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 3800 * 60000), (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 3800 * 60000)),
  ('demo-r10', 'demo-t4', 'demo-marge', 'Welcome to the area! Ask around at the library, too; the staff always know who''s good.', (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 2700 * 60000), (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 2700 * 60000)),
  ('demo-r11', 'demo-t5', 'demo-tasha', 'Went last week. Fewer stands but the apple cider alone was worth it.', (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 1300 * 60000), (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 1300 * 60000)),
  ('demo-r12', 'demo-t5', 'demo-lena', 'Go early. The bakery table usually sells out before ten.', (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 1200 * 60000), (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 1200 * 60000)),
  ('demo-r13', 'demo-t6', 'demo-lena', 'I''ve been taking the back roads through town. Adds five minutes but no stopping.', (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 540 * 60000), (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 540 * 60000)),
  ('demo-r14', 'demo-t6', 'demo-bill', 'Heard it''s supposed to wrap up before the first freeze, but that''s secondhand.', (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 300 * 60000), (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 300 * 60000)),
  ('demo-r15', 'demo-t6', 'demo-marge', 'Would love for Firelands Current to look into this one!', (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 120 * 60000), (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 120 * 60000)),
  ('demo-r16', 'demo-t7', 'demo-dave', 'Count me in. I can bring a wagon for hauling bags.', (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 150 * 60000), (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 150 * 60000));

-- Fictional news stories. Paragraphs are separated by blank lines.
-- Inserted with a placeholder age in hours, then converted to epoch ms below.
INSERT INTO news_articles (id, slug, headline, summary, body, section, community, byline, status, published_at, created_at, updated_at) VALUES
  ('demo-a1', 'sandusky-bayfront-benches-restored',
   'Volunteers restore 40 bayfront benches ahead of fall festival season',
   'A weekend work crew sanded, sealed and repainted weathered benches along the Sandusky waterfront, finishing a project that began with one neighbor’s complaint.',
   'The project started with an email. Last spring, retired machinist Walter Brenner wrote to a neighborhood association asking why so many benches along the bayfront had splintered seats and peeling paint.

By Saturday afternoon, about 60 volunteers had answered that question by fixing the benches themselves. Working in shifts, they sanded, sealed and repainted 40 benches between the marina and the downtown piers.

“I figured someone would write back and say it was on a list somewhere,” Brenner said. “Instead they wrote back and asked if I owned a sander.”

Organizers said local hardware suppliers donated most of the paint and sealant, and a youth sports league provided lunch for the crew. The work cost the city nothing beyond a permit.

The benches will get a second coat of sealant next spring. Organizers are collecting names for that crew now and say anyone who can hold a brush is welcome.',
   'community', 'Sandusky', 'Claire Whitaker', 'published', 3, 0, 0),

  ('demo-a2', 'huron-council-weighs-parking-changes',
   'Huron council weighs new parking limits near the riverfront',
   'A proposal would add two-hour limits to a handful of downtown blocks during the summer months. Business owners are split on whether it would help or hurt.',
   'Huron City Council heard the first reading this week of a proposal that would set two-hour parking limits on several blocks near the riverfront from Memorial Day through Labor Day.

Supporters say the change would open spaces for shoppers and diners that are now filled most of the day. Opponents worry that visitors who come for a boat ride or a long lunch would get tickets and not come back.

“I want turnover, but I don’t want to punish the people we’re trying to attract,” said Denise Albrecht, who owns a gift shop on one of the affected blocks.

A council committee has asked city staff to count how long cars actually stay in those spaces on a typical summer weekend. That count will not happen until next year, so any change would not take effect before the 2027 season.

The proposal will get a second reading at the council’s next regular meeting. Residents can comment in person or in writing before then.',
   'government', 'Huron', 'Marcus Bell', 'published', 9, 0, 0),

  ('demo-a3', 'norwalk-bakery-marks-50-years',
   'Family bakery marks 50 years on the same Norwalk corner',
   'Three generations of the Kessler family have run the shop, which still opens at 5 a.m. and still makes its cinnamon rolls from the founder’s handwritten recipe.',
   'The ovens at Kessler’s Bakery have been lit before sunrise six days a week since 1976. On Saturday the family will mark the shop’s 50th year with free coffee and, they promise, extra cinnamon rolls.

Ruth Kessler opened the bakery with her husband after years of selling pies from her kitchen. Her grandson, Evan Kessler, runs it now, though he said his grandmother still stops by most mornings to check the dough.

“She doesn’t say anything. She just pokes it,” he said. “If she walks away, it’s fine.”

The bakery has expanded twice and added a small seating area, but the recipes have barely changed. The cinnamon roll recipe still lives on a stained index card taped inside a cabinet door.

The anniversary celebration runs from 7 a.m. until the rolls run out.',
   'business', 'Norwalk', 'Claire Whitaker', 'published', 20, 0, 0),

  ('demo-a4', 'vermilion-students-build-weather-station',
   'Vermilion students build a weather station that reports to the web',
   'A high school physics class assembled the station from a kit and some spare parts. It now posts temperature, wind and rainfall readings every five minutes.',
   'A group of physics students has put their school on the weather map. The station they built this month now uploads readings to a public weather network every five minutes.

The class started with a kit, then added a rain gauge made from a coffee can and a funnel after the kit’s gauge cracked in shipping. Teacher Alan Pruitt said the repair turned out to be the best lesson of the unit.

“They had to figure out how to calibrate something that wasn’t designed to be calibrated,” he said. “That’s real science.”

Students plan to compare their readings with a nearby airport station through the winter, paying special attention to lake-effect snow.

The class is looking for a local business willing to host a second station farther inland so students can compare the two.',
   'schools', 'Vermilion', 'Marcus Bell', 'published', 28, 0, 0),

  ('demo-a5', 'fall-walleye-outlook',
   'Anglers expect a strong fall walleye run on the western basin',
   'Charter captains say summer catches point to a healthy population heading into October, though windy weekends could keep smaller boats at the dock.',
   'Charter captains working out of Port Clinton and Marblehead say this fall could be one of the better walleye seasons in recent memory, based on the size and number of fish they caught through the summer.

“We saw a lot of fish in that 20-inch range,” said Capt. Rick Dunleavy, who has run charters for 18 years. “Those fish will be fat and feeding hard by mid-October.”

The outlook comes with a caution. Fall weather on Lake Erie changes quickly, and captains urged anglers in smaller boats to watch forecasts closely and stay near shore when the wind picks up.

Shore anglers are likely to have their best luck in November, when walleye move closer to rocky shorelines and breakwalls after dark.

Anglers should check current state limits and regulations before heading out.',
   'outdoors', 'Port Clinton', 'Firelands Current Staff', 'published', 44, 0, 0),

  ('demo-a6', 'milan-library-extends-hours',
   'Milan library adds evening hours after community survey',
   'The branch will stay open until 8 p.m. two nights a week starting next month, a change requested by parents and commuters in a survey this summer.',
   'Starting next month, the library branch in Milan will stay open until 8 p.m. on Tuesdays and Thursdays.

Branch manager Priya Natarajan said the change came directly from a summer survey in which more than 300 residents took part. The most common request was simply more time after work.

“A lot of people told us they drive past at 5:30 and we’re already closed,” she said.

The extra hours will be covered by shifting staff schedules rather than hiring, Natarajan said. The branch will try the new schedule through spring and then decide whether to keep it.

The library also plans a Thursday evening homework help session for middle schoolers, staffed by volunteers.',
   'community', 'Milan', 'Claire Whitaker', 'published', 60, 0, 0),

  ('demo-a7', 'bellevue-water-main-project',
   'Bellevue water main work to close two blocks through November',
   'Crews are replacing a century-old line beneath a residential stretch. Residents will keep water service but should expect detours and brief pressure drops.',
   'Two residential blocks in Bellevue will be closed to through traffic through mid-November while crews replace a water main that city records say was laid more than 100 years ago.

Residents on the affected blocks will keep access to their driveways, and water service will stay on for most of the project. The city expects a handful of short shutoffs and will notify each household at least a day in advance.

“The line has had three breaks in the last two years,” said utilities supervisor Tom Reinholt. “We’d rather replace it on our schedule than on its schedule.”

The project is paid for with a mix of local water funds and a state infrastructure loan. Detour signs are posted, and school bus routes have been adjusted.

Residents with questions can contact the city utilities office.',
   'local', 'Bellevue', 'Marcus Bell', 'published', 80, 0, 0),

  ('demo-a8', 'sandusky-teachers-grant-reading-program',
   'Sandusky teachers win grant to expand a buddy-reading program',
   'A small grant will pay for books and training so more elementary classrooms can pair older and younger students as reading partners.',
   'A group of elementary teachers in Sandusky has won a grant to expand a buddy-reading program that pairs fourth graders with kindergarten and first-grade readers.

The program started two years ago in three classrooms. Teachers said the younger students gained confidence reading aloud, and the older students took their role as mentors seriously.

“The fourth graders get nervous before their buddies arrive,” said teacher Monica Farris. “They want to get it right.”

The grant will pay for new books sized for small hands and for a training session so teachers in more buildings can start their own pairs this winter.

The teachers plan to share what they learn at a regional education conference in the spring.',
   'schools', 'Sandusky', 'Claire Whitaker', 'published', 110, 0, 0);

-- Convert the placeholder hours above into real timestamps.
UPDATE news_articles
SET published_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000 - published_at * 3600000,
    created_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000 - published_at * 3600000,
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000 - published_at * 3600000
WHERE id LIKE 'demo-a%';
