import { campaignDirectory, repositoryDirectory } from '../../project-library.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { readdirSync } from 'node:fs';
const here = campaignDirectory('2026-10-artists');
const repo = repositoryDirectory;
const campaigns = JSON.parse(await readFile(path.join(here,'campaigns.json'),'utf8'));
const images = JSON.parse(await readFile(path.join(here,'manifest.json'),'utf8'));
const args = process.argv.slice(2);
const publish = args.includes('--publish');
const location = args.includes('--remote') ? 'remote' : args.includes('--local') ? 'local' : null;
if (publish && !location) throw new Error('Choose --local or --remote explicitly.');
if (args.some(a=>!['--publish','--local','--remote'].includes(a))) throw new Error('Unknown argument');
if (args.includes('--local') && args.includes('--remote')) throw new Error('Choose one destination per run');
const q = v => v == null ? 'NULL' : typeof v === 'number' ? String(v) : "'"+String(v).replaceAll("'","''")+"'";
const uid = key => { const h=createHash('sha256').update('firelands-current/2026-10-artists/'+key).digest('hex').slice(0,32);return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20); };
const stampPath = path.join(here,'deployment.json');
let stamp;
try { stamp=JSON.parse(await readFile(stampPath,'utf8')); } catch {stamp={created_at:Date.now(),published:[]};await writeFile(stampPath,JSON.stringify(stamp,null,2)+'\n');}
const now=stamp.created_at;
if (campaigns.length!==4 || images.length!==16 || new Set(images.map(i=>i.media_id)).size!==16) throw new Error('Expected 4 campaigns and 16 distinct images');
for (const i of images) {
 const b=await readFile(i.file);
 if (b.length!==i.bytes || b.length>=1024*1024 || createHash('sha256').update(b).digest('hex')!==i.sha256) throw new Error('Asset validation failed: '+i.file);
 if(i.width!==i.display_width*2 || i.height!==i.display_height*2) throw new Error('Image dimensions invalid');
}
const sql=[];
function insert(table,cols,vals,suffix='') {return 'INSERT INTO '+table+' ('+cols.join(',')+') VALUES ('+vals.map(q).join(',')+')'+suffix+';';}
function audit(c,kind,extra={}) {
 return insert('admin_audit_log',['id','actor_id','actor_name','target_business_id','target_ad_id','target_media_id','target_label','action','detail','created_at'],
 [uid(c.slug+'/'+kind+(extra.size||'')),null,'Codex (user-requested)',c.business_id,extra.media ? null : kind==='business-create' ? null : c.ad_id,extra.media||null,extra.label||c.brand,kind,extra.detail||c.name,now],' ON CONFLICT(id) DO NOTHING');
}
for (const c of campaigns) {
 if(c.status!=='active' || c.weight!==5 || c.headline.length>70 || c.body.length>150 || c.cta.length>30 || new URL(c.href).protocol!=='https:') throw new Error('Campaign validation failed');
 sql.push(insert('businesses',['id','name','kind','website','notes','status','created_at','updated_at'],[c.business_id,c.brand,'advertiser',c.website,'Owner project; image campaign requested October 9, 2026.','active',now,now],' ON CONFLICT(id) DO NOTHING'));
 sql.push(audit(c,'business-create',{detail:'Owner project advertiser created for '+c.title}));
 sql.push(insert('ads',['id','business_id','name','status','headline','body','cta','href','theme_bg','theme_fg','theme_accent','placements','sections','weight','starts_on','ends_on','impression_cap','terms','created_at','updated_at'],
 [c.ad_id,c.business_id,c.name,'active',c.headline,c.body,c.cta,c.href,c.bg,c.fg,c.accent,JSON.stringify(c.placements),'[]',5,null,null,null,'Owner project promotion; no sales terms entered.',now,now],' ON CONFLICT(id) DO NOTHING'));
 sql.push(audit(c,'ad-create',{detail:c.name+' — four image sizes; five image placements; weight 5; open-ended.'}));
 for(const i of images.filter(i=>i.ad_id===c.ad_id)) {
  sql.push(insert('media',['id','object_key','content_type','width','height','bytes','filename','alt','caption','credit','source','uploaded_by','created_at','updated_at'],
  [i.media_id,i.object_key,'image/webp',i.width,i.height,i.bytes,path.basename(i.file),i.alt,'','Supplied by '+c.brand,'Owner-requested advertisement. Built-in image generation using approved cover: '+c.source,null,now,now],' ON CONFLICT(id) DO NOTHING'));
  sql.push(insert('ad_images',['ad_id','size','object_key','content_type','width','height','media_id','created_at'],
  [c.ad_id,i.size,i.object_key,'image/webp',i.display_width,i.display_height,i.media_id,now],' ON CONFLICT(ad_id,size) DO NOTHING'));
  sql.push(audit(c,'media-upload',{media:i.media_id,size:i.size,label:path.basename(i.file),detail:i.size+' banner for '+c.name}));
 }
}
const sqlFile=path.join(here,'publish.sql');
await writeFile(sqlFile,'-- Four owner-project campaigns and sixteen credited images. No schema changes.\n'+sql.join('\n')+'\n');
const dbdir=path.join(repo,'.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const localFile=readdirSync(dbdir).find(p=>p.endsWith('.sqlite') && p!=='metadata.sqlite');
const local=new DatabaseSync(path.join(dbdir,localFile),{readOnly:true});
const schema=local.prepare("SELECT sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 ELSE 2 END").all();
local.close();
const rehearsal=new DatabaseSync(':memory:');
rehearsal.exec('PRAGMA foreign_keys=ON;');
for(const row of schema) rehearsal.exec(row.sql);
rehearsal.exec('BEGIN;'+sql.join('\n')+'COMMIT;');
rehearsal.exec('BEGIN;'+sql.join('\n')+'COMMIT;');
const counts=rehearsal.prepare('SELECT (SELECT count(*) FROM businesses) AS businesses,(SELECT count(*) FROM ads) AS ads,(SELECT count(*) FROM media) AS media,(SELECT count(*) FROM ad_images) AS images,(SELECT count(*) FROM admin_audit_log) AS audits').get();
if(counts.businesses!==4 || counts.ads!==4 || counts.media!==16 || counts.images!==16 || counts.audits!==24 || rehearsal.prepare('PRAGMA foreign_key_check').all().length) throw new Error('SQL rehearsal failed');
rehearsal.close();
console.log('Validated files and rehearsed import twice: 4 businesses, 4 ads, 16 images, 24 audit records; no duplicates or foreign-key errors.');
if (!publish) {console.log('Prepared '+sqlFile+'. No database or R2 writes made.');process.exit(0);}
function run(params,json=false) {
 const r=spawnSync(process.execPath,[path.join(repo,'node_modules/wrangler/bin/wrangler.js'),...params],{cwd:repo,encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});
 if(r.status!==0) throw new Error(r.stderr+'\n'+r.stdout);
 return json?JSON.parse(r.stdout):r.stdout;
}
const names=campaigns.map(c=>q(c.brand)).join(',');
const preflight=run(['d1','execute','DB','--'+location,'--command','SELECT id,name,status FROM businesses WHERE name IN ('+names+'); SELECT id,name FROM ads WHERE id IN ('+campaigns.map(c=>q(c.ad_id)).join(',')+'); SELECT id,object_key FROM media WHERE id IN ('+images.map(i=>q(i.media_id)).join(',')+');','--json'],true);
for(const b of preflight[0].results) {const c=campaigns.find(c=>c.brand===b.name);if(!c || b.id!==c.business_id || b.status!=='active') throw new Error('Existing advertiser requires review: '+b.name);}
for(const a of preflight[1].results) if(!campaigns.some(c=>c.ad_id===a.id && c.name===a.name)) throw new Error('Ad ID conflict');
for(const m of preflight[2].results) if(!images.some(i=>i.media_id===m.id && i.object_key===m.object_key)) throw new Error('Media ID conflict');
for(const i of images) {
 run(['r2','object','put','firelands-current-media/'+i.object_key,'--file',i.file,'--content-type','image/webp','--'+location,'--force']);
 console.log('Uploaded '+location+' '+i.slug+' '+i.size);
}
run(['d1','execute','DB','--'+location,'--file',sqlFile,'--yes']);
const verified=run(['d1','execute','DB','--'+location,'--command','SELECT a.id,a.status,a.href,count(i.size) AS images FROM ads a JOIN ad_images i ON i.ad_id=a.id WHERE a.id IN ('+campaigns.map(c=>q(c.ad_id)).join(',')+') GROUP BY a.id;','--json'],true)[0].results;
if(verified.length!==4 || verified.some(a=>a.status!=='active'||a.images!==4||!campaigns.some(c=>c.ad_id===a.id&&c.href===a.href))) throw new Error('Post-import verification failed');
if(location==='remote') for(const i of images) {
 const r=await fetch('https://firelandscurrent.com/media/'+i.object_key);
 if(!r.ok || createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex')!==i.sha256) throw new Error('Live asset differs: '+i.object_key);
}
stamp.published=[...new Set([...stamp.published,location])];
await writeFile(stampPath,JSON.stringify(stamp,null,2)+'\n');
console.log('Verified '+location+': four active campaigns with all sixteen images.');
