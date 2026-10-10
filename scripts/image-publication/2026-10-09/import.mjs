import { imagePublicationDirectory } from '../../project-library.mjs';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { getPlatformProxy } from 'wrangler';

const dir = imagePublicationDirectory('2026-10-09');
const research = imagePublicationDirectory('2026-10-09') + '../';
const proxy = await getPlatformProxy({ configPath: 'wrangler.jsonc', persist: { path: '.wrangler/state/v3' }, remoteBindings: false });
globalThis.__imageImportEnv = proxy.env;
const envModule = 'data:text/javascript,export const env = globalThis.__imageImportEnv;';
function sourceModule(path, replacements) {
  let source = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
  }).outputText;
  source = source.replace(/from ['"]([^'"]+)['"]/g, (_, specifier) => `from ${JSON.stringify(replacements[specifier] ?? import.meta.resolve(specifier))}`);
  return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
}
const forumModule = sourceModule('src/lib/forum.ts', { 'cloudflare:workers': envModule });
const media = await import(sourceModule('src/lib/media.ts', { 'cloudflare:workers': envModule, './forum': forumModule }));
const news = await import(sourceModule('src/lib/news.ts', { 'cloudflare:workers': envModule }));
const license = 'https://creativecommons.org/licenses/by-sa/4.0/';
const candidates = [
  {
    slug: 'pipe-creek-parking-lot-access-project-october-2026',
    file: 'pipe-creek.jpg', width: 3072, height: 2043,
    creator: 'Alexandra Fries, Integration and Application Network',
    sourceUrl: 'https://ian.umces.edu/media-library/pipe-creek-wildlife-area-1/',
    alt: 'Open water at Pipe Creek Wildlife Area, with lily pads near the shore and overhanging tree branches.',
    caption: 'Pipe Creek Wildlife Area in Sandusky, photographed July 26, 2012. File photo.',
    credit: 'Alexandra Fries, Integration and Application Network (ian.umces.edu/media-library) / CC BY-SA 4.0',
  },
  {
    slug: 'saints-peter-paul-church-roof-closure-october-2026',
    file: 'saints-peter-and-paul.jpg', width: 2696, height: 3497,
    creator: 'Nheyob / Wikimedia Commons',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Saints_Peter_and_Paul_Roman_Catholic_Church_(Sandusky,_Ohio)_-_exterior.JPG',
    alt: 'Stone facade and bell tower of Saints Peter and Paul Roman Catholic Church in Sandusky.',
    caption: 'Saints Peter and Paul Roman Catholic Church in Sandusky, photographed April 29, 2016. File photo.',
    credit: 'Nheyob / Wikimedia Commons / CC BY-SA 4.0',
  },
];
try {
  const actor = await proxy.env.DB.prepare('SELECT id, name FROM "user" WHERE email = ?').bind('jd@orboro.net').first();
  assert(actor && actor.name === 'JD', 'JD account not found');
  const manifest = JSON.parse(readFileSync(research + 'evidence/manifest.json', 'utf8'));
  const prepared = [];
  for (const candidate of candidates) {
    const article = await proxy.env.DB.prepare('SELECT * FROM news_articles WHERE slug = ?').bind(candidate.slug).first();
    assert(article && article.status === 'published' && article.lead_media_id === null, 'Article absent or already has a lead image');
    const bytes = readFileSync(research + candidate.file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.find(entry => entry.file === candidate.file).sha256);
    const image = await media.checkUpload(new File([bytes], candidate.file, { type: 'image/jpeg' }));
    assert.notEqual(typeof image, 'string');
    assert.equal(image.width, candidate.width);
    assert.equal(image.height, candidate.height);
    const details = {
      alt: candidate.alt, caption: candidate.caption, credit: candidate.credit,
      source: `Source: ${candidate.sourceUrl} | License: CC BY-SA 4.0, ${license} | Verified Oct. 9, 2026; creator/uploader license page saved with SHA-256 manifest in image-research/2026-10-09/evidence. Original image pixels retained; JPEG metadata removed by the media-library upload validator. No crop or visual edits.`,
    };
    assert.deepEqual(media.validateDetails(details), []);
    const sourceLink = candidate.sourceUrl.replaceAll('(', '%28').replaceAll(')', '%29');
    const note = `*Photo: [${candidate.creator}](${sourceLink}), [CC BY-SA 4.0](${license}). Image unchanged; embedded metadata removed.*`;
    const body = `${note}\n\n${article.body}`;
    const html = news.renderBodyBlocks(note).join('');
    assert(html.includes(`href="${license}"`) && html.includes(`href="${sourceLink}"`));
    prepared.push({ candidate, article, image, details, body });
  }
  writeFileSync(dir + 'before.json', JSON.stringify(prepared.map(({ article }) => article), null, 2));
  const statements = [];
  const updates = [];
  for (const { candidate, article, image, details, body } of prepared) {
    const { record, statement } = await media.storeMedia(image, candidate.file, details, actor.id);
    statements.push(statement, media.mediaAudit(actor, record, 'media-upload', `${record.width}×${record.height}; CC BY-SA 4.0 file photo for ${candidate.slug}`));
    statements.push(proxy.env.DB.prepare('UPDATE news_articles SET lead_media_id = ?, body = ?, updated_at = ? WHERE id = ? AND lead_media_id IS NULL AND body = ?')
      .bind(record.id, body, Date.now(), article.id, article.body));
    updates.push({ articleId: article.id, slug: candidate.slug, media: record, body, published_at: article.published_at });
  }
  writeFileSync(dir + 'updates.json', JSON.stringify(updates, null, 2));
  const results = await proxy.env.DB.batch(statements);
  assert(results.every(result => result.success));
  assert.equal(results[2].meta.changes, 1);
  assert.equal(results[5].meta.changes, 1);
  for (const update of updates) {
    const article = await news.getArticle(update.slug);
    assert.equal(article.lead_key, update.media.object_key);
    assert.equal(article.body, update.body);
    assert.equal(article.published_at, update.published_at);
    const object = await proxy.env.MEDIA.get(update.media.object_key);
    assert(object && object.size === update.media.bytes);
    const uploaded = new Uint8Array(await object.arrayBuffer());
    assert.deepEqual(media.imageInfo(uploaded), { type: 'image/jpeg', width: update.media.width, height: update.media.height });
    const usage = await media.mediaUsage(update.media);
    assert(usage.stories.some(story => story.id === update.articleId && story.lead === 1));
  }
  console.log(JSON.stringify(updates.map(update => ({ slug: update.slug, mediaId: update.media.id, bytes: update.media.bytes, dimensions: `${update.media.width}×${update.media.height}` })), null, 2));
} finally {
  await proxy.dispose();
}
