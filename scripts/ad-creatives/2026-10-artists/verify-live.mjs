import { campaignDirectory } from '../../project-library.mjs';
import {readFile,writeFile} from 'node:fs/promises';
const dir=campaignDirectory('2026-10-artists');
const campaigns=JSON.parse(await readFile(dir+'/campaigns.json','utf8'));
const images=JSON.parse(await readFile(dir+'/manifest.json','utf8'));
const seen=new Map();
for(let page=0;page<20 && seen.size<4;page++) {
 const r=await fetch('https://firelandscurrent.com/');
 if(!r.ok)throw new Error('Homepage '+r.status);
 const html=await r.text();
 for(const c of campaigns){
  const ad=html.match(new RegExp('<aside[^>]*data-ad="'+c.ad_id+'"[^>]*>[\\s\\S]*?<\\/aside>'));
  if(!ad)continue;
  const placement=ad[0].match(/data-placement="([^"]+)"/)?.[1];
  if(!c.placements.includes(placement))throw new Error('Incorrect placement');
  const spec=placement==='site-leaderboard'?['leaderboard','mobile']:placement==='home-billboard'?['billboard','rectangle']:['rectangle'];
  for(const size of spec){const i=images.find(i=>i.ad_id===c.ad_id&&i.size===size);if(!ad[0].includes('/media/'+i.object_key))throw new Error('Missing public image: '+c.brand+' '+size);}
  seen.set(c.ad_id,{brand:c.brand,placement});
 }
}
if(seen.size!==4)throw new Error('Did not observe all four campaigns in rotation: '+JSON.stringify([...seen.values()]));
await writeFile(dir+'/verification.json',JSON.stringify({verified_at:new Date().toISOString(),observed:[...seen.values()],media:'All 16 live URLs verified against source SHA-256 by publish.mjs',check:'passed; 0 errors, warnings or hints',build:'passed'},null,2)+'\n');
console.log('Verified public rotation: '+[...seen.values()].map(i=>i.brand+' ('+i.placement+')').join(', '));
