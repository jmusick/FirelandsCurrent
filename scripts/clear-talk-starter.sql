-- Remove only the proof-of-concept posts from seed-talk-starter.sql.
-- Community threads with later reader comments and participants reused elsewhere are retained.
DELETE FROM forum_thread_votes
WHERE user_id IN ('starter-marge', 'starter-dave', 'starter-tasha', 'starter-lena', 'starter-bill')
  AND (thread_id BETWEEN 'fc000001-0000-4000-8000-000000000001' AND 'fc000001-0000-4000-8000-000000000005'
    OR thread_id IN (SELECT t.id FROM forum_threads t JOIN news_articles a ON a.id = t.article_id WHERE a.slug IN (
      'sandusky-haunt-house-contest-october-16-2026',
      'sandusky-student-art-gifted-showcase-october-12-2026',
      'oak-harbor-apple-festival-october-10-11-2026',
      'huron-library-book-sale-october-7-10-2026')));

-- Comment votes cascade when their seeded comment is removed.
DELETE FROM forum_replies WHERE id BETWEEN
  'fc000002-0000-4000-8000-000000000001' AND 'fc000002-0000-4000-8000-000000000036';

UPDATE forum_threads
SET last_activity_at = MAX(created_at, COALESCE(
    (SELECT MAX(r.created_at) FROM forum_replies r WHERE r.thread_id = forum_threads.id), created_at))
WHERE id BETWEEN 'fc000001-0000-4000-8000-000000000001' AND 'fc000001-0000-4000-8000-000000000005'
   OR article_id IN (SELECT id FROM news_articles WHERE slug IN (
    'sandusky-haunt-house-contest-october-16-2026',
    'sandusky-student-art-gifted-showcase-october-12-2026',
    'oak-harbor-apple-festival-october-10-11-2026',
    'huron-library-book-sale-october-7-10-2026'));

DELETE FROM forum_threads
WHERE id BETWEEN 'fc000001-0000-4000-8000-000000000001' AND 'fc000001-0000-4000-8000-000000000005'
  AND NOT EXISTS (SELECT 1 FROM forum_replies r WHERE r.thread_id = forum_threads.id);

DELETE FROM "user"
WHERE id IN ('starter-marge', 'starter-dave', 'starter-tasha', 'starter-lena', 'starter-bill')
  AND email LIKE '%@starter.invalid'
  AND NOT EXISTS (SELECT 1 FROM forum_threads t WHERE t.author_id = "user".id)
  AND NOT EXISTS (SELECT 1 FROM forum_replies r WHERE r.author_id = "user".id)
  AND NOT EXISTS (SELECT 1 FROM news_articles a WHERE a.author_id = "user".id)
  AND NOT EXISTS (SELECT 1 FROM media m WHERE m.uploaded_by = "user".id)
  AND NOT EXISTS (SELECT 1 FROM account a WHERE a.userId = "user".id)
  AND NOT EXISTS (SELECT 1 FROM session s WHERE s.userId = "user".id)
  AND NOT EXISTS (SELECT 1 FROM staff_roles s WHERE s.user_id = "user".id)
  AND NOT EXISTS (SELECT 1 FROM business_members b WHERE b.user_id = "user".id);
