import { env } from 'cloudflare:workers';
import { type AdminEvent, type Category, type EventStatus, STATUS_LABELS, isCategory } from './events';
import { cleanText, ensureEventThread } from './forum';
import { isMediaId } from './media';
import { sanitizeSlug } from './news';

export type EventFormValues = {
  title: string; slug: string; summary: string; description: string; category: Category | '';
  starts_on: string; start_time: string; ends_on: string; end_time: string;
  venue: string; address: string; community: string; organizer: string; cost: string; link: string;
  /** Media library item shown with the event; empty for none. */
  image_media_id: string;
  status: EventStatus;
};

export type EventFormResult =
  | { ok: true; id: string }
  | { ok: false; values: EventFormValues; errors: string[] };

export const emptyEvent: EventFormValues = {
  title: '', slug: '', summary: '', description: '', category: '', starts_on: '', start_time: '', ends_on: '', end_time: '',
  venue: '', address: '', community: '', organizer: '', cost: '', link: '', image_media_id: '', status: 'draft',
};

export function valuesFromEvent(e: AdminEvent): EventFormValues {
  const { title, slug, summary, description, category, starts_on, venue, address, community, organizer, cost, link, status } = e;
  return {
    title, slug, summary, description, category, starts_on, venue, address, community, organizer, cost, link, status,
    start_time: e.start_time ?? '', ends_on: e.ends_on ?? '', end_time: e.end_time ?? '', image_media_id: e.image_media_id ?? '',
  };
}

/** A new draft with an existing event's details, for repeating events: the dates and URL are left for the editor. */
export function copyOfEvent(e: AdminEvent): EventFormValues {
  return { ...valuesFromEvent(e), slug: '', starts_on: '', ends_on: '', status: 'draft' };
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const validDate = (d: string) => DATE.test(d) && !Number.isNaN(Date.parse(d));
const MAX_SPAN_DAYS = 366;

export async function saveEventFromForm(form: FormData, existing: AdminEvent | null): Promise<EventFormResult> {
  const category = cleanText(form.get('category'));
  const status = cleanText(form.get('status'));
  const typedSlug = sanitizeSlug(cleanText(form.get('slug')));
  let link = cleanText(form.get('link'));
  if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`;
  const values: EventFormValues = {
    title: cleanText(form.get('title')),
    slug: typedSlug,
    summary: cleanText(form.get('summary')),
    description: cleanText(form.get('description')),
    category: isCategory(category) ? category : '',
    starts_on: cleanText(form.get('starts_on')),
    start_time: cleanText(form.get('start_time')),
    ends_on: cleanText(form.get('ends_on')),
    end_time: cleanText(form.get('end_time')),
    venue: cleanText(form.get('venue')),
    address: cleanText(form.get('address')),
    community: cleanText(form.get('community')),
    organizer: cleanText(form.get('organizer')),
    cost: cleanText(form.get('cost')),
    link,
    image_media_id: cleanText(form.get('image_media_id')),
    status: Object.hasOwn(STATUS_LABELS, status) ? status as EventStatus : 'draft',
  };
  // A last day the same as the first is a single-day event.
  if (values.ends_on === values.starts_on) values.ends_on = '';

  const errors: string[] = [];
  if (values.title.length < 3 || values.title.length > 140) errors.push('Title must be 3–140 characters.');
  if (values.summary.length < 10 || values.summary.length > 300) errors.push('Summary must be 10–300 characters.');
  if (values.description.length > 20000) errors.push('Details must be under 20,000 characters.');
  if (!values.category) errors.push('Choose a category.');
  if (!validDate(values.starts_on)) errors.push('Choose the date the event starts.');
  if (values.ends_on) {
    if (!validDate(values.ends_on)) errors.push('Last day must be a valid date.');
    else if (values.ends_on < values.starts_on) errors.push('Last day must be on or after the first day.');
    else if ((Date.parse(values.ends_on) - Date.parse(values.starts_on)) / 86400000 > MAX_SPAN_DAYS) errors.push('An event can run for at most a year.');
  }
  if (values.start_time && !TIME.test(values.start_time)) errors.push('Start time must be a valid time.');
  if (values.end_time && !TIME.test(values.end_time)) errors.push('End time must be a valid time.');
  if (values.end_time && !values.start_time) errors.push('Add a start time, or clear the end time for an all-day event.');
  if (!values.ends_on && values.start_time && values.end_time && values.end_time <= values.start_time) errors.push('End time must be after the start time.');
  if (values.venue.length < 2 || values.venue.length > 120) errors.push('Venue is required (up to 120 characters).');
  if (values.address.length > 200) errors.push('Address must be under 200 characters.');
  if (!values.community || values.community.length > 60) errors.push('Community is required (up to 60 characters).');
  if (values.organizer.length > 120) errors.push('Organizer must be under 120 characters.');
  if (values.cost.length > 80) errors.push('Cost must be under 80 characters.');
  if (values.link) {
    try {
      const url = new URL(values.link);
      if (!/^https?:$/.test(url.protocol) || values.link.length > 500) throw new Error();
    } catch { errors.push('Link must be a valid web address.'); }
  }
  if (values.image_media_id && !(isMediaId(values.image_media_id) && await env.DB.prepare('SELECT 1 FROM media WHERE id = ?').bind(values.image_media_id).first())) {
    errors.push('The image is no longer in the media library. Choose another.');
    values.image_media_id = '';
  }

  // Without a typed slug, the title makes one; repeating events with the same title get their date added.
  const id = existing?.id ?? crypto.randomUUID();
  const slugTaken = (slug: string) => env.DB.prepare('SELECT 1 FROM events WHERE slug = ? AND id != ?').bind(slug, id).first();
  if (!errors.length) {
    if (typedSlug) {
      if (await slugTaken(typedSlug)) errors.push('Another event already uses that URL slug.');
    } else {
      const base = sanitizeSlug(values.title);
      values.slug = await slugTaken(base) ? sanitizeSlug(`${base.slice(0, 108)}-${values.starts_on}`) : base;
      if (!values.slug || await slugTaken(values.slug)) errors.push('Another event already uses this title and date. Enter a URL slug.');
    }
  }
  if (errors.length) return { ok: false, values: { ...values, slug: typedSlug }, errors };

  const now = Date.now();
  await env.DB.prepare(`
    INSERT INTO events (id, slug, title, summary, description, category, starts_on, start_time, ends_on, end_time,
      venue, address, community, organizer, cost, link, image_media_id, status, created_at, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?19)
    ON CONFLICT(id) DO UPDATE SET
      slug = excluded.slug, title = excluded.title, summary = excluded.summary, description = excluded.description,
      category = excluded.category, starts_on = excluded.starts_on, start_time = excluded.start_time, ends_on = excluded.ends_on,
      end_time = excluded.end_time, venue = excluded.venue, address = excluded.address, community = excluded.community,
      organizer = excluded.organizer, cost = excluded.cost, link = excluded.link, image_media_id = excluded.image_media_id,
      status = excluded.status, updated_at = excluded.updated_at
  `).bind(id, values.slug, values.title, values.summary, values.description, values.category, values.starts_on,
    values.start_time || null, values.ends_on || null, (values.start_time && values.end_time) || null,
    values.venue, values.address, values.community, values.organizer, values.cost, values.link,
    values.image_media_id || null, values.status, now).run();
  if (values.status !== 'draft') await ensureEventThread({ id, title: values.title, summary: values.summary });
  return { ok: true, id };
}
