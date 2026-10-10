import { editorialDirectory } from '../../project-library.mjs';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const data = JSON.parse(readFileSync(editorialDirectory('2026-10-07') + 'content.json','utf8'));
const quote = v => "'" + v.replaceAll("'", "''") + "'";
const query = `SELECT * FROM news_articles WHERE id IN (${data.articles.map(r=>quote(r.id)).join(',')}); SELECT * FROM events WHERE id IN (${data.events.map(r=>quote(r.id)).join(',')}); SELECT * FROM forum_threads WHERE id IN (${data.threads.map(r=>quote(r.id)).join(',')}); SELECT article_id,status FROM facebook_posts WHERE article_id IN (${data.articles.map(r=>quote(r.id)).join(',')});`;
const result = execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--command',query,'--json'],{encoding:'utf8'});
const groups = JSON.parse(result.slice(result.indexOf('[')));
for (const [i,expected] of [data.articles,data.events,data.threads].entries()) {
  assert.equal(groups[i].results.length,expected.length);
  for(const row of expected) {
    const saved = groups[i].results.find(r=>r.id===row.id);
    for(const [k,v] of Object.entries(row)) assert.equal(saved[k],v,`${row.id}.${k}`);
  }
}
assert.equal(groups[3].results.length,3);
assert(groups[3].results.every(r=>r.status==='review'));
console.log('Exact local content, JD attribution, six discussions and three Facebook review holds verified.');
for (const [kind,rows] of [['news',data.articles],['events',data.events]]) {
  for(const row of rows) {
    const url = `http://127.0.0.1:4321/${kind}/${row.slug}`;
    const response = await fetch(url);
    const html = await response.text();
    assert.equal(response.status,200,url);
    assert(html.includes(row.summary.replaceAll('&','&amp;')),`${url} summary`);
    assert(html.includes('/talk/'),`${url} discussion`);
    if(kind==='news') assert(html.includes(`/profile/${row.author_id}`),`${url} account byline`);
    else assert(html.includes(row.starts_on),`${url} date`);
    console.log(`HTTP 200: ${url}`);
  }
}
