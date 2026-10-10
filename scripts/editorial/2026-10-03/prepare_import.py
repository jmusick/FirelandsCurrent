import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from project_library import editorial_directory
import json
import sqlite3
import time
import uuid

root = editorial_directory('2026-10-03')
packet = json.loads((root / 'content.json').read_text(encoding='utf-8'))
db = Path('.wrangler/state/v3/d1/miniflare-D1DatabaseObject/a4c345e40c3c0b930ffe84f07cdaf30b63e86564cfbac49aaef91a26a207ae2c.sqlite').resolve()
connection = sqlite3.connect(db.as_uri() + '?mode=ro', uri=True)
authors = connection.execute('SELECT id, name FROM user WHERE lower(email) = ?', ('jd@orboro.net',)).fetchall()
assert len(authors) == 1, 'Resolve the JD author account before importing stories'
author_id, byline = authors[0]
now = int(time.time() * 1000)

for index, article in enumerate(packet['articles']):
    assert 8 <= len(article['headline']) <= 160
    assert 20 <= len(article['summary']) <= 400
    assert len(article['body'].split('\n\n')[0].split()) <= 35
    assert connection.execute('SELECT 1 FROM news_articles WHERE slug=?', (article['slug'],)).fetchone() is None
    published = now - index * 60000
    article.update(id=str(uuid.uuid5(uuid.NAMESPACE_URL, 'https://firelandscurrent.com/news/' + article['slug'])), author_id=author_id, byline=byline, status='published', published_at=published, created_at=published, updated_at=published)
    print(article['slug'], len(article['body'].split()), 'body words')

for event in packet['events']:
    assert 3 <= len(event['title']) <= 140
    assert 10 <= len(event['summary']) <= 300
    assert event['start_time'] < event['end_time']
    assert connection.execute('SELECT 1 FROM events WHERE slug=?', (event['slug'],)).fetchone() is None
    event.update(id=str(uuid.uuid5(uuid.NAMESPACE_URL, 'https://firelandscurrent.com/events/' + event['slug'])), status='published', created_at=now, updated_at=now)

backup = Path('.wrangler/backups/2026-10-03-before-editorial-import.sqlite')
backup.parent.mkdir(parents=True, exist_ok=True)
assert not backup.exists(), 'Preserve the existing backup'
with sqlite3.connect(backup) as destination:
    connection.backup(destination)

serializer = sqlite3.connect(':memory:')


def insert(table, row):
    values = [serializer.execute('SELECT quote(?)', (value,)).fetchone()[0] for value in row.values()]
    return 'INSERT OR IGNORE INTO ' + table + ' (' + ', '.join(row) + ') VALUES (' + ', '.join(values) + ');'


lines = ['-- Oct. 3, 2026 editorial batch. Review locally before any production sync.']
for article in packet['articles']:
    lines.append(insert('news_articles', article))
    lines.append(insert('forum_threads', dict(id=str(uuid.uuid5(uuid.NAMESPACE_URL, 'https://firelandscurrent.com/discussion/news/' + article['slug'])), author_id='newsroom', title=article['headline'], body=article['summary'], article_id=article['id'], created_at=article['published_at'], updated_at=article['published_at'], last_activity_at=article['published_at'])))
for event in packet['events']:
    lines.append(insert('events', event))
    lines.append(insert('forum_threads', dict(id=str(uuid.uuid5(uuid.NAMESPACE_URL, 'https://firelandscurrent.com/discussion/events/' + event['slug'])), author_id='newsroom', title=event['title'], body=event['summary'], event_id=event['id'], created_at=now, updated_at=now, last_activity_at=now)))

(root / 'content.json').write_text(json.dumps(packet, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
(root / 'content.sql').write_text('\n\n'.join(lines) + '\n', encoding='utf-8')
print('Saved import for three articles, four events and seven discussions; local backup saved.')
