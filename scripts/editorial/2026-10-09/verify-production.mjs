import { editorialDirectory } from '../../project-library.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const data=JSON.parse(readFileSync(editorialDirectory('2026-10-09') + 'reviewed-content.json','utf8'));
const ids=rows=>rows.map(r=>"'"+r.id+"'").join(',');
const sql=`SELECT * FROM news_articles WHERE id IN (${ids(data.articles)}); SELECT * FROM events WHERE id IN (${ids(data.events)}); SELECT * FROM forum_threads WHERE id IN (${ids(data.threads)}); SELECT article_id,status,attempts FROM facebook_posts WHERE article_id IN (${ids(data.articles)}); SELECT action,detail FROM admin_audit_log WHERE action='facebook_queue' AND (${data.articles.map(r=>`detail LIKE '%${r.id}%'`).join(' OR ')}); SELECT section,COUNT(*) AS n FROM news_articles WHERE status='published' GROUP BY section ORDER BY section; SELECT status,COUNT(*) AS n FROM events GROUP BY status ORDER BY status;`;
function query(mode){const out=execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','DB',mode,'--command',sql,'--json'],{encoding:'utf8'});return JSON.parse(out.slice(out.indexOf('[')));}
const remote=query('--remote');const local=query('--local');
for(const [i,rows] of [data.articles,data.events,data.threads].entries()) {
 assert.equal(remote[i].results.length,rows.length);
 for(const row of rows) assert.deepEqual(remote[i].results.find(r=>r.id===row.id),row);
}
assert.equal(remote[3].results.length,3);assert(remote[3].results.every(r=>['pending','posting','posted'].includes(r.status)));
assert.equal(remote[4].results.length,3);
assert.deepEqual(remote[5].results,local[5].results);assert.deepEqual(remote[6].results,local[6].results);
console.log('Exact production content and seven discussions match local; 3 audited Facebook queue actions; section and event-status counts match.');
console.log(JSON.stringify(remote[3].results));
writeFileSync(editorialDirectory('2026-10-09') + 'production-verification.json',JSON.stringify({verifiedAt:new Date().toISOString(),contentMatches:true,discussionCount:remote[2].results.length,facebook:remote[3].results,auditActions:remote[4].results,sections:remote[5].results,eventStatuses:remote[6].results},null,2));
for(const [kind,rows] of [['news',data.articles],['events',data.events]]) for(const row of rows){
 const url=`https://firelandscurrent.com/${kind}/${row.slug}`;
 const response=await fetch(url);const html=await response.text();assert.equal(response.status,200,url);
 assert(html.includes(row.summary.replaceAll('&','&amp;')),`${url} summary`);assert(html.includes('/talk/'),`${url} discussion`);
 if(kind==='news')assert(html.includes(`/profile/${row.author_id}`),`${url} byline`);
 console.log(`HTTP 200: ${url}`);
}
for(const row of data.threads){
 const url=`https://firelandscurrent.com/talk/${row.id}`;
 const response=await fetch(url);assert.equal(response.status,200,url);
 const html=await response.text();assert(html.includes(row.id),`${url} discussion id`);
 console.log(`HTTP 200 discussion: ${url}`);
}
for(const path of ['/news','/events']){
 const response=await fetch(`https://firelandscurrent.com${path}`);assert.equal(response.status,200,path);
 console.log(`HTTP 200 listing: ${path}`);
}
