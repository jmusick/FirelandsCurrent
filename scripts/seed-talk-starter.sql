-- Proof-of-concept conversations with fictional participants, prepared October 9, 2026.
-- Talk only: leaves stories, events, media and existing conversations intact.
-- Re-runnable without replacing posts. Stable UUIDs also work with reply/vote endpoints.
-- Participants have reserved .invalid emails and no credentials or staff roles.
-- Apply locally first; apply remotely only when the publisher requests it.

INSERT OR IGNORE INTO "user" (id, name, email, emailVerified, createdAt, updatedAt) VALUES
  ('starter-marge', 'Marge H.', 'marge@starter.invalid', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('starter-dave', 'Dave K.', 'dave@starter.invalid', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('starter-tasha', 'Tasha R.', 'tasha@starter.invalid', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('starter-lena', 'Lena O.', 'lena@starter.invalid', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('starter-bill', 'Bill from Huron', 'bill@starter.invalid', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

WITH topics (number, author, title, body, age_minutes) AS (VALUES
  (1, 'starter-marge', 'Where in the Firelands do you call home?',
   'Thought we could start with introductions. Which town do you call home, and what do you like most about it? Sandusky for me. Give me a quiet evening by the water and I am happy.', 4320),
  (2, 'starter-lena', 'Your ideal autumn afternoon around here',
   'If you had a free afternoon and no errands to run, how would you spend it? I would choose a short walk, a warm drink and somewhere to sit with a view. Curious what everyone else would pick.', 2880),
  (3, 'starter-tasha', 'Rainy-day ideas that do not involve another screen',
   'Looking for simple ways to keep the kids busy when we are stuck inside. Nothing that needs a cart full of supplies. What actually holds their attention for more than ten minutes?', 1440),
  (4, 'starter-bill', 'What little local detail would you miss if you moved away?',
   'Not the big attractions. I mean the small things you stop noticing until you go somewhere else. For me it would be seeing the water on an ordinary drive. What is yours?', 720),
  (5, 'starter-dave', 'What are you reading lately?',
   'I keep starting books and then getting distracted halfway through. Looking for something that pulls you in without taking three chapters to get going. Fiction, history, mysteries: I am open to suggestions.', 360)
)
INSERT OR IGNORE INTO forum_threads (id, author_id, title, body, created_at, updated_at, last_activity_at)
SELECT printf('fc000001-0000-4000-8000-%012d', number), author, title, body,
       unixepoch() * 1000 - age_minutes * 60000,
       unixepoch() * 1000 - age_minutes * 60000,
       unixepoch() * 1000 - age_minutes * 60000
FROM topics;

-- Each community conversation has two top-level comments and two nested replies.
WITH comments (number, topic, author, parent, body, minutes_after) AS (VALUES
  (1, 1, 'starter-dave', NULL, 'Norwalk here. I like that a quick errand can turn into a conversation with someone you know.', 30),
  (2, 1, 'starter-tasha', 1, 'Ha, until you go out for milk and get home an hour later. Wouldn''t trade it though.', 60),
  (3, 1, 'starter-bill', NULL, 'Huron. My favorite part is how easy it is to make a walk by the water part of a normal day.', 90),
  (4, 1, 'starter-marge', 3, 'Yep. Even just 20 minutes clears my head.', 120),
  (5, 2, 'starter-bill', NULL, 'Walk first, coffee after. Otherwise I''m not getting back up', 30),
  (6, 2, 'starter-lena', 5, 'lol same. Once I''m in a comfy chair it''s over', 60),
  (7, 2, 'starter-marge', NULL, 'I would take a book and leave my phone in my bag. The hard part is choosing a book I will actually read instead of watching the water.', 90),
  (8, 2, 'starter-dave', 7, 'Sounds like a good afternoon to me!', 120),
  (9, 3, 'starter-marge', NULL, 'Give them a cardboard box and ask them to build a town. Mine always spent longer arguing about where the roads went than doing the actual building.', 30),
  (10, 3, 'starter-tasha', 9, 'Oh we have SO many boxes in the garage. Trying this.', 60),
  (11, 3, 'starter-dave', NULL, 'A treasure hunt with handwritten clues. Keep the first few easy so they get into it. You do not need a prize bigger than choosing dinner.', 90),
  (12, 3, 'starter-lena', 11, 'Careful, you''re going to be eating pizza all week 😂', 120),
  (13, 4, 'starter-lena', NULL, 'The sound of gulls. Sometimes annoying, but I think I would notice the silence somewhere else.', 30),
  (14, 4, 'starter-bill', 13, 'The one that sounds like it''s laughing at you? Yeah that guy. Always watching my fries.', 60),
  (15, 4, 'starter-marge', NULL, 'Watching the same view change through the seasons. You can walk past the same spot all year and it never quite looks the same.', 90),
  (16, 4, 'starter-tasha', 15, 'This makes me want to take a photo from the same place once a month. Would be fun to compare them next year.', 120),
  (17, 5, 'starter-lena', NULL, 'Short stories! I lose track of who''s who if I put a novel down for too long.', 30),
  (18, 5, 'starter-dave', 17, 'Might try that. Pretty sure I''ve read the same page three times now', 60),
  (19, 5, 'starter-marge', NULL, 'I like local history books you can dip into a chapter at a time. Old photographs will keep me reading longer than almost anything.', 90),
  (20, 5, 'starter-bill', 19, 'Same here. Then I''m on the map trying to work out where the photo was taken.', 120)
)
INSERT OR IGNORE INTO forum_replies (id, thread_id, author_id, parent_id, body, created_at, updated_at)
SELECT printf('fc000002-0000-4000-8000-%012d', c.number), t.id, c.author,
       CASE WHEN c.parent IS NOT NULL THEN printf('fc000002-0000-4000-8000-%012d', c.parent) END,
       c.body, t.created_at + c.minutes_after * 60000, t.created_at + c.minutes_after * 60000
FROM comments c JOIN forum_threads t ON t.id = printf('fc000001-0000-4000-8000-%012d', c.topic);

-- Match story discussions by slug so local and production thread UUIDs may differ.
-- These replies react to the published text without inventing reporting or eyewitness accounts.
WITH comments (number, slug, author, parent, body, age_minutes) AS (VALUES
  (21, 'sandusky-haunt-house-contest-october-16-2026', 'starter-lena', NULL, 'I like that there is a traditional fall category. Pumpkins and warm lights are more my speed than anything that jumps out at you.', 210),
  (22, 'sandusky-haunt-house-contest-october-16-2026', 'starter-tasha', 21, 'Mine love the spooky stuff right up until it moves. Then we''re done lol', 195),
  (23, 'sandusky-haunt-house-contest-october-16-2026', 'starter-dave', NULL, 'Would be nice to see a gallery of the entries once voting opens. I enjoy seeing what people make from ordinary stuff.', 180),
  (24, 'sandusky-haunt-house-contest-october-16-2026', 'starter-marge', 23, 'Yes! Give me a bedsheet ghost over a $300 skeleton any day.', 165),
  (25, 'sandusky-student-art-gifted-showcase-october-12-2026', 'starter-marge', NULL, 'Art, stories and guitar music is a nice mix. I would like to see more photos of student work in the paper after these programs.', 150),
  (26, 'sandusky-student-art-gifted-showcase-october-12-2026', 'starter-lena', 25, 'Especially the art. You get such different ideas when everyone starts with the same theme.', 135),
  (27, 'sandusky-student-art-gifted-showcase-october-12-2026', 'starter-tasha', NULL, 'Anyone know if we need to sign up? I''ll check with the school if nobody''s heard.', 120),
  (28, 'sandusky-student-art-gifted-showcase-october-12-2026', 'starter-bill', 27, 'And knowing whether we can come for just one part of the evening. Helpful to have the two start times spelled out.', 105),
  (29, 'oak-harbor-apple-festival-october-10-11-2026', 'starter-bill', NULL, 'I''ll look at the cars but let''s be honest, I''m going for the food. Who else?', 90),
  (30, 'oak-harbor-apple-festival-october-10-11-2026', 'starter-marge', 29, 'Me 🙋 Everything else is just killing time between snacks.', 75),
  (31, 'oak-harbor-apple-festival-october-10-11-2026', 'starter-tasha', NULL, 'Good to know the parade and car show are on different days. We would choose one rather than try to fit in the whole weekend.', 60),
  (32, 'oak-harbor-apple-festival-october-10-11-2026', 'starter-dave', 31, 'I prefer one unhurried visit too. Leave a little time to wander instead of making it a checklist.', 45),
  (33, 'huron-library-book-sale-october-7-10-2026', 'starter-dave', NULL, 'Do I need more books? No. Am I going to come home with a bag anyway? Probably.', 40),
  (34, 'huron-library-book-sale-october-7-10-2026', 'starter-lena', 33, 'The unexpected book is usually the best part. It is harder to stumble onto something when you only shop from a search box.', 30),
  (35, 'huron-library-book-sale-october-7-10-2026', 'starter-marge', NULL, 'Glad the proceeds go back to the library. A book sale is a nice excuse to pass along books you have finished and find something new.', 20),
  (36, 'huron-library-book-sale-october-7-10-2026', 'starter-tasha', 35, 'I let the kids pick their own. Usually dinosaurs. Always dinosaurs actually.', 10)
)
INSERT OR IGNORE INTO forum_replies (id, thread_id, author_id, parent_id, body, created_at, updated_at)
SELECT printf('fc000002-0000-4000-8000-%012d', c.number), t.id, c.author,
       CASE WHEN c.parent IS NOT NULL THEN printf('fc000002-0000-4000-8000-%012d', c.parent) END,
       c.body, MAX(t.created_at, unixepoch() * 1000 - c.age_minutes * 60000),
       MAX(t.created_at, unixepoch() * 1000 - c.age_minutes * 60000)
FROM comments c JOIN news_articles a ON a.slug = c.slug
JOIN forum_threads t ON t.article_id = a.id
WHERE a.status = 'published' AND t.status = 'published';

UPDATE forum_threads
SET last_activity_at = MAX(last_activity_at,
    (SELECT MAX(r.created_at) FROM forum_replies r WHERE r.thread_id = forum_threads.id))
WHERE id IN (SELECT thread_id FROM forum_replies WHERE id BETWEEN
  'fc000002-0000-4000-8000-000000000001' AND 'fc000002-0000-4000-8000-000000000036');

-- Small, varied vote totals from the five participants; no self-votes.
-- Existing votes are preserved on re-import. Scores are calculated by the normal site queries.
WITH votes (topic, slug, voter, value) AS (VALUES
  (1, NULL, 'starter-dave', 1),
  (1, NULL, 'starter-tasha', 1),
  (1, NULL, 'starter-lena', 1),
  (1, NULL, 'starter-bill', -1),
  (2, NULL, 'starter-marge', 1),
  (2, NULL, 'starter-bill', 1),
  (2, NULL, 'starter-dave', 1),
  (2, NULL, 'starter-tasha', -1),
  (3, NULL, 'starter-marge', 1),
  (3, NULL, 'starter-bill', 1),
  (3, NULL, 'starter-dave', 1),
  (3, NULL, 'starter-lena', 1),
  (4, NULL, 'starter-marge', 1),
  (4, NULL, 'starter-lena', 1),
  (4, NULL, 'starter-dave', -1),
  (5, NULL, 'starter-marge', 1),
  (5, NULL, 'starter-lena', 1),
  (5, NULL, 'starter-bill', 1),
  (5, NULL, 'starter-tasha', -1),
  (NULL, 'sandusky-haunt-house-contest-october-16-2026', 'starter-lena', 1),
  (NULL, 'sandusky-haunt-house-contest-october-16-2026', 'starter-tasha', 1),
  (NULL, 'sandusky-haunt-house-contest-october-16-2026', 'starter-marge', 1),
  (NULL, 'sandusky-haunt-house-contest-october-16-2026', 'starter-dave', -1),
  (NULL, 'sandusky-student-art-gifted-showcase-october-12-2026', 'starter-marge', 1),
  (NULL, 'sandusky-student-art-gifted-showcase-october-12-2026', 'starter-tasha', 1),
  (NULL, 'sandusky-student-art-gifted-showcase-october-12-2026', 'starter-dave', 1),
  (NULL, 'sandusky-student-art-gifted-showcase-october-12-2026', 'starter-bill', 1),
  (NULL, 'oak-harbor-apple-festival-october-10-11-2026', 'starter-bill', 1),
  (NULL, 'oak-harbor-apple-festival-october-10-11-2026', 'starter-marge', 1),
  (NULL, 'oak-harbor-apple-festival-october-10-11-2026', 'starter-tasha', 1),
  (NULL, 'oak-harbor-apple-festival-october-10-11-2026', 'starter-lena', -1),
  (NULL, 'huron-library-book-sale-october-7-10-2026', 'starter-dave', 1),
  (NULL, 'huron-library-book-sale-october-7-10-2026', 'starter-marge', 1),
  (NULL, 'huron-library-book-sale-october-7-10-2026', 'starter-lena', 1)
)
INSERT OR IGNORE INTO forum_thread_votes (thread_id, user_id, value, created_at)
SELECT t.id, v.voter, v.value, MIN(unixepoch() * 1000, t.created_at + 60000)
FROM votes v JOIN forum_threads t ON
  (v.topic IS NOT NULL AND t.id = printf('fc000001-0000-4000-8000-%012d', v.topic))
  OR (v.slug IS NOT NULL AND t.article_id = (SELECT id FROM news_articles WHERE slug = v.slug AND status = 'published'))
WHERE t.status = 'published' AND t.author_id != v.voter;

WITH votes (comment, voter, value) AS (VALUES
  (1, 'starter-marge', 1),
  (1, 'starter-bill', 1),
  (1, 'starter-lena', -1),
  (2, 'starter-dave', 1),
  (2, 'starter-lena', 1),
  (3, 'starter-marge', 1),
  (3, 'starter-dave', 1),
  (3, 'starter-tasha', 1),
  (4, 'starter-bill', 1),
  (5, 'starter-dave', 1),
  (5, 'starter-marge', 1),
  (5, 'starter-lena', 1),
  (6, 'starter-tasha', 1),
  (6, 'starter-dave', -1),
  (7, 'starter-lena', 1),
  (8, 'starter-bill', -1),
  (9, 'starter-dave', 1),
  (9, 'starter-tasha', 1),
  (9, 'starter-lena', 1),
  (9, 'starter-bill', 1),
  (10, 'starter-marge', 1),
  (11, 'starter-marge', 1),
  (11, 'starter-tasha', 1),
  (11, 'starter-lena', 1),
  (12, 'starter-dave', 1),
  (12, 'starter-tasha', -1),
  (12, 'starter-bill', -1),
  (13, 'starter-marge', 1),
  (13, 'starter-bill', -1),
  (14, 'starter-lena', 1),
  (14, 'starter-dave', 1),
  (15, 'starter-tasha', 1),
  (15, 'starter-bill', 1),
  (15, 'starter-dave', 1),
  (16, 'starter-lena', 1),
  (16, 'starter-marge', 1),
  (17, 'starter-dave', 1),
  (17, 'starter-tasha', 1),
  (19, 'starter-lena', 1),
  (19, 'starter-bill', 1),
  (19, 'starter-tasha', 1),
  (20, 'starter-marge', 1),
  (21, 'starter-tasha', 1),
  (21, 'starter-marge', 1),
  (22, 'starter-lena', 1),
  (22, 'starter-dave', 1),
  (22, 'starter-bill', -1),
  (23, 'starter-marge', 1),
  (23, 'starter-bill', 1),
  (23, 'starter-lena', 1),
  (24, 'starter-dave', 1),
  (24, 'starter-lena', -1),
  (25, 'starter-dave', 1),
  (25, 'starter-tasha', 1),
  (25, 'starter-lena', 1),
  (25, 'starter-bill', 1),
  (26, 'starter-marge', 1),
  (26, 'starter-tasha', 1),
  (27, 'starter-bill', 1),
  (27, 'starter-dave', 1),
  (27, 'starter-marge', 1),
  (29, 'starter-marge', 1),
  (29, 'starter-lena', 1),
  (29, 'starter-dave', 1),
  (30, 'starter-bill', 1),
  (30, 'starter-tasha', 1),
  (31, 'starter-dave', 1),
  (32, 'starter-lena', -1),
  (32, 'starter-bill', -1),
  (33, 'starter-lena', 1),
  (33, 'starter-bill', 1),
  (34, 'starter-dave', 1),
  (34, 'starter-marge', 1),
  (34, 'starter-tasha', 1),
  (35, 'starter-dave', 1),
  (35, 'starter-tasha', 1),
  (35, 'starter-lena', 1),
  (35, 'starter-bill', 1),
  (36, 'starter-marge', 1),
  (36, 'starter-dave', 1)
)
INSERT OR IGNORE INTO forum_reply_votes (reply_id, user_id, value, created_at)
SELECT r.id, v.voter, v.value, MIN(unixepoch() * 1000, r.created_at + 60000)
FROM votes v JOIN forum_replies r ON r.id = printf('fc000002-0000-4000-8000-%012d', v.comment)
WHERE r.status = 'published' AND r.author_id != v.voter;

