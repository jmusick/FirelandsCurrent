import { imagePublicationDirectory } from '../../project-library.mjs';
import { getPlatformProxy } from 'wrangler';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const proxy = await getPlatformProxy({ configPath: 'wrangler.jsonc', persist: { path: '.wrangler/state/v3' }, remoteBindings: false });
try {
  const slug = 'pipe-creek-parking-lot-access-project-october-2026';
  const article = await proxy.env.DB.prepare('SELECT id,slug,lead_media_id,status FROM news_articles WHERE slug=?').bind(slug).first();
  assert(article?.lead_media_id && article.status === 'published');
  const previous = await proxy.env.DB.prepare('SELECT id,slug,featured,updated_at FROM news_articles WHERE featured=1 OR id=?').bind(article.id).all();
  writeFileSync(imagePublicationDirectory('2026-10-09') + 'before-featured.json', JSON.stringify(previous.results, null, 2));
  await proxy.env.DB.batch([
    proxy.env.DB.prepare('UPDATE news_articles SET featured=0,updated_at=? WHERE featured=1 AND id<>?').bind(Date.now(), article.id),
    proxy.env.DB.prepare('UPDATE news_articles SET featured=1,updated_at=? WHERE id=?').bind(Date.now(), article.id),
  ]);
  const lead = await proxy.env.DB.prepare('SELECT a.slug,a.headline,a.featured,m.object_key,m.credit FROM news_articles a LEFT JOIN media m ON m.id=a.lead_media_id WHERE a.status=? ORDER BY a.featured DESC,a.published_at DESC LIMIT 1').bind('published').first();
  assert.equal(lead.slug, slug);
  assert(lead.object_key);
  console.log(JSON.stringify(lead, null, 2));
} finally {
  await proxy.dispose();
}
