import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from project_library import editorial_directory
import json
import sqlite3
import subprocess

root = editorial_directory('2026-10-02')
db = next(Path('.wrangler/state/v3/d1/miniflare-D1DatabaseObject').glob('*.sqlite'))
connection = sqlite3.connect(db.resolve().as_uri() + '?mode=ro', uri=True)
connection.row_factory = sqlite3.Row
requested = json.loads((root / 'content.json').read_text(encoding='utf-8'))

def literal(value):
    if value is None:
        return 'NULL'
    if isinstance(value, int):
        return str(value)
    return "'" + value.replace("'", "''") + "'"

def remote(sql):
    process = subprocess.run(['npx.cmd', 'wrangler', 'd1', 'execute', 'DB', '--remote', '--command', sql, '--json'], capture_output=True, text=True, encoding='utf-8')
    if process.returncode:
        raise RuntimeError(process.stderr)
    result = json.loads(process.stdout)
    assert all(item['success'] for item in result)
    return result

rows = []
queries = []
for table, key, field in [('news_articles', 'articles', 'article_id'), ('events', 'events', 'event_id')]:
    for item in requested[key]:
        row = dict(connection.execute(f'SELECT * FROM {table} WHERE slug=?', (item['slug'],)).fetchone())
        assert row['status'] == 'published'
        threads = connection.execute(f'SELECT * FROM forum_threads WHERE {field}=?', (row['id'],)).fetchall()
        assert len(threads) == 1
        rows.extend([(table, row), ('forum_threads', dict(threads[0]))])
        queries.append(f"SELECT * FROM {table} WHERE id={literal(row['id'])} OR slug={literal(row['slug'])};")
        queries.append(f"SELECT * FROM forum_threads WHERE id={literal(threads[0]['id'])} OR {field}={literal(row['id'])};")

if sys.argv[1] == 'prepare':
    before = remote(''.join(queries))
    assert all(not item['results'] for item in before), 'An addition already exists in production; inspect before writing.'
    sql = '\n'.join(f"INSERT INTO {table} ({', '.join(row)}) VALUES ({', '.join(literal(value) for value in row.values())});" for table, row in rows)
    (root / 'production-content.sql').write_bytes((sql + '\n').encode('utf-8'))
    (root / 'production-before.json').write_text(json.dumps(before, indent=2), encoding='utf-8')
    print('Prepared current local rows: 3 articles, 7 events, 10 discussions. None exists in production.')
elif sys.argv[1] == 'repair-newlines':
    statements = []
    for table, row in rows:
        field = 'body' if table == 'news_articles' else 'description' if table == 'events' else None
        if field:
            encoded = row[field].encode('utf-8').hex()
            statements.append(f"UPDATE {table} SET {field}=CAST(X'{encoded}' AS TEXT) WHERE id={literal(row['id'])};")
    (root / 'production-newlines.sql').write_bytes(('\n'.join(statements) + '\n').encode('utf-8'))
    print('Prepared exact UTF-8 text restoration for the ten new content rows.')
elif sys.argv[1] == 'verify':
    result = remote(''.join(queries))
    for (table, expected), actual in zip(rows, result):
        assert len(actual['results']) == 1, f'Missing or duplicate production row: {expected["id"]}'
        found = actual['results'][0]
        differences = {key: (expected.get(key), found.get(key)) for key in set(expected) | set(found) if expected.get(key) != found.get(key)}
        assert not differences, f'Production mismatch in {table}: {differences!r}'
    totals_sql = 'SELECT section,status,COUNT(*) AS count FROM news_articles GROUP BY section,status ORDER BY section,status; SELECT status,COUNT(*) AS count FROM events GROUP BY status ORDER BY status;'
    production_totals = remote(totals_sql)
    local_totals = [[dict(row) for row in connection.execute(query)] for query in totals_sql.split(';') if query.strip()]
    assert [item['results'] for item in production_totals] == local_totals, 'Local and production totals differ.'
    (root / 'production-verification.json').write_text(json.dumps(dict(rows=result, totals=production_totals), indent=2), encoding='utf-8')
    print('All 20 production rows match local exactly. Article section counts and event totals match.')
    print(json.dumps(local_totals))
