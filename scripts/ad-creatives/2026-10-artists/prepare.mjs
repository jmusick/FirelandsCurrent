import { campaignDirectory } from '../../project-library.mjs';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import sharp from 'sharp';
import path from 'node:path';
import { createHash } from 'node:crypto';
const here = campaignDirectory('2026-10-artists');
const sources = JSON.parse(await readFile(path.join(here, 'sources.json'), 'utf8'));
const sizes = { leaderboard: [728, 90], mobile: [320, 100], rectangle: [300, 250], billboard: [970, 250] };
const placements = ['site-leaderboard', 'home-rail', 'home-billboard', 'article-inline', 'article-rail'];
const campaigns = [
 { slug: 'simon-rook', brand: 'Simon Rook', title: 'The Stoic Mind for Overthinkers', website: 'https://simonrook.com', href: 'https://simonrook.com/books/the-stoic-mind-for-overthinkers/', headline: 'The Stoic Mind for Overthinkers', body: 'A 21-day practical guide to making decisions and taking action without perfect certainty.', cta: 'Explore the book', bg: '#0b1925', fg: '#f2ead6', accent: '#c4914e', source: 'C:/Users/JD/source/SimonRook/src/assets/stoic-mind-cover.png' },
 { slug: 'pneumaris', brand: 'Pneumaris', title: 'Anathema', website: 'https://pneumarisband.com', href: 'https://pneumarisband.com/music/', headline: 'Anathema by Pneumaris', body: '13 tracks moving through progressive metal, dark pop and cinematic atmosphere.', cta: 'Listen now', bg: '#10100f', fg: '#f0e6cd', accent: '#c2a16b', source: 'C:/Users/JD/Projects/Pneumaris/Assets/Albums/Anathema/Artwork/anathema-3000x3000.png' },
 { slug: 'dorian-black', brand: 'Dorian Black', title: 'After Tonight', website: 'https://dorianblack.com', href: 'https://dorianblack.com/music/', headline: 'After Tonight by Dorian Black', body: '12 synth-pop songs from last call to sunrise.', cta: 'Listen now', bg: '#10091c', fg: '#f3eafa', accent: '#ef69d2', source: 'C:/Users/JD/source/DorianBlack/src/assets/after-tonight-cover.png' },
 { slug: 'jd-musick', brand: 'JD Musick', title: 'The Road Still Knows', website: 'https://jdmusick.band', href: 'https://jdmusick.band/music/', headline: 'The Road Still Knows by JD Musick', body: '11 late-night blues stories, carried by smoky guitar, warm organ and a weathered voice.', cta: 'Listen now', bg: '#19100c', fg: '#f0e3cc', accent: '#dca352', source: 'C:/Users/JD/source/JDMusick/src/assets/the-road-still-knows-cover.png' },
];
function id(key) {
 const h = createHash('sha256').update('firelands-current/2026-10-artists/' + key).digest('hex').slice(0,32);
 return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
}
await mkdir(path.join(here,'webp'), {recursive:true});
await mkdir(path.join(here,'originals'), {recursive:true});
const images = [];
for (const c of campaigns) {
 c.business_id = id(c.slug+'/business'); c.ad_id = id(c.slug+'/ad'); c.name = c.brand+' / '+c.title;
 c.placements = placements; c.weight = 5; c.status = 'active';
 for (const [size, file] of Object.entries(sources[c.slug] || {})) {
  const [w,h] = sizes[size]; const original = path.join(here,'originals',c.slug+'-'+size+'.png');
  await copyFile(file,original);
  const wide = size === 'leaderboard' || size === 'billboard';
  const input = wide ? await sharp(original).trim({ background: '#ffffff', threshold: 30 }).toBuffer() : original;
  const metadata = await sharp(input).metadata();
  const aspectError = Math.abs((metadata.width/metadata.height)/(w/h)-1);
  if (!wide && aspectError > .04) throw new Error(c.slug+' '+size+' has wrong aspect ratio: '+metadata.width+'x'+metadata.height);
  if (wide && metadata.width / metadata.height < (size === 'leaderboard' ? 4 : 3)) throw new Error('Wide banner was not separated from its white sheet: '+c.slug+' '+size);
  const output = path.join(here,'webp',c.slug+'-'+size+'.webp');
  await sharp(input).resize(w*2,h*2, wide ? { fit:'contain', background:c.bg } : { fit:'fill' }).webp({quality:88,effort:6}).toFile(output);
  const bytes = await readFile(output);
  if (bytes.length >= 1024*1024) throw new Error('Image exceeds ad upload limit');
  const media_id = id(c.slug+'/'+size);
  images.push({ad_id:c.ad_id,brand:c.brand,slug:c.slug,size,width:w*2,height:h*2,display_width:w,display_height:h,media_id,object_key:'library/'+media_id+'.webp',file:output,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),alt:c.brand+': '+c.headline+'. '+c.cta+'.',source:c.source});
 }
}
await writeFile(path.join(here,'campaigns.json'),JSON.stringify(campaigns,null,2)+'\n');
await writeFile(path.join(here,'manifest.json'),JSON.stringify(images,null,2)+'\n');
const esc = s => s.replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const html = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Firelands Current project ads</title><style>body{font:16px/1.5 system-ui;background:#f3f1eb;color:#142f38;margin:32px}main{max-width:1100px;margin:auto}section{margin:30px 0;padding:24px;background:white;border:1px solid #d8dedb;border-radius:8px}.formats{display:grid;gap:20px}.format{overflow:auto}img{display:block;max-width:none}h2{margin:0}p{margin:8px 0 18px}small{display:block;color:#52676e;margin-bottom:6px}a{color:#1c6880}</style><main><h1>Four project campaigns</h1><p>Prepared October 9, 2026. Four image sizes per campaign at twice their display resolution. Weight 5, all news sections, five image placements, no end date or impression cap. Existing covers supplied by the project owner; creatives made using the built-in image generation tool.</p>'+campaigns.map(c=>'<section><h2>'+esc(c.brand)+' · '+esc(c.title)+'</h2><p>'+esc(c.body)+' <a href="'+esc(c.href)+'">'+esc(c.cta)+'</a></p><div class="formats">'+Object.entries(sizes).map(([size,[w,h]])=>images.some(i=>i.slug===c.slug&&i.size===size)?'<div class="format"><small>'+size+' · '+w+'×'+h+' display</small><img width="'+w+'" height="'+h+'" alt="'+esc(c.headline)+'" src="webp/'+c.slug+'-'+size+'.webp"></div>':'').join('')+'</div></section>').join('')+'</main></html>';
await writeFile(path.join(here,'review.html'),html);
const tiles = [];
for (let n=0;n<campaigns.length;n++) {
 const c=campaigns[n]; const file=images.find(i=>i.slug===c.slug&&i.size==='rectangle')?.file;
 if (file) tiles.push({input:await sharp(file).resize(300,250).png().toBuffer(),left:20+n*320,top:20});
}
await sharp({create:{width:1300,height:290,channels:3,background:'#f3f1eb'}}).composite(tiles).jpeg({quality:93}).toFile(path.join(here,'contact-sheet.jpg'));
console.log('Prepared '+images.length+' WebP files and review.html');
