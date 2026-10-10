import { editorialDirectory } from '../../project-library.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const out = editorialDirectory('2026-10-04');
const data = JSON.parse(readFileSync(join(out, 'content.json'), 'utf8'));
const event = data.events.find(e => e.slug === 'ohgo-empty-bowls-winerie-october-5-2026');
delete event.ticket_url;
delete event.ticket_availability;
writeFileSync(join(out, 'content.json'), JSON.stringify(data, null, 2) + '\n');
const sql = readFileSync(join(out, 'import.sql'), 'utf8').replace("'PerformingGroup', '', 'https://www.raise.pub/events/10998', 'SoldOut', 'published'", "'PerformingGroup', '', '', '', 'published'");
writeFileSync(join(out, 'import.sql'), sql);
const previous = 'SoldOut stored, but ticket_price blank; no priced Offer is generated.';
const corrected = 'Sold-out status appears in title, summary, description and cost. All structured offer fields left blank because the original price is unconfirmed; this preserves the admin editor’s validation rules.';
for (const file of [join(out, 'review.md'), new URL('./prepare-content.mjs', import.meta.url)]) {
  writeFileSync(file, readFileSync(file, 'utf8').replace(previous, corrected));
}
