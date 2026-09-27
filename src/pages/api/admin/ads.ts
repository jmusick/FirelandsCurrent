import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { ADMIN, canAccess } from '../../../lib/admin';
import { adAudit, deleteMedia, getAd } from '../../../lib/ads-admin';
import { cleanText, sameOrigin } from '../../../lib/forum';

// Creating and editing an ad happens on its admin pages, which can redisplay the form with errors.
// Status changes and deletion go through here.
export const POST: APIRoute = async ({ request, locals }) => {
  const actor = locals.user;
  if (!actor || !canAccess(locals.staffRole, ADMIN.ads)) return new Response('Forbidden', { status: 403 });
  if (!sameOrigin(request)) return new Response('Invalid request origin', { status: 403 });

  const form = await request.formData();
  const action = cleanText(form.get('action'));
  const found = await getAd(cleanText(form.get('adId')));
  if (!found) return new Response('Ad not found', { status: 404 });
  const { record, images } = found;
  const ad = { id: record.id, name: record.name };
  const business = { id: record.business_id, name: record.business_name };
  const back = (params: Record<string, string>) => {
    const url = new URL(`/admin/ads/${record.id}`, request.url);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    return Response.redirect(url, 303);
  };

  switch (action) {
    case 'activate':
    case 'pause': {
      const status = action === 'activate' ? 'active' : 'paused';
      if (record.status === status) return back({ notice: 'unchanged' });
      if (status === 'active' && record.business_status === 'archived') return back({ error: 'archived' });
      await env.DB.batch([
        env.DB.prepare('UPDATE ads SET status = ?, updated_at = ? WHERE id = ?').bind(status, Date.now(), record.id),
        adAudit(actor, ad, business, `ad-${action}`),
      ]);
      return back({ notice: action === 'activate' ? 'activated' : 'paused' });
    }

    case 'delete': {
      if (cleanText(form.get('confirm')).toLowerCase() !== record.name.toLowerCase()) return back({ error: 'confirm' });
      await env.DB.batch([
        adAudit(actor, ad, business, 'ad-delete', record.impressions ? `${record.impressions.toLocaleString('en-US')} impressions, ${record.clicks.toLocaleString('en-US')} clicks` : undefined),
        env.DB.prepare('DELETE FROM ads WHERE id = ?').bind(record.id),
      ]);
      await deleteMedia(images.map((i) => i.object_key));
      const url = new URL('/admin/ads', request.url);
      url.searchParams.set('deleted', record.name);
      return Response.redirect(url, 303);
    }
  }

  return new Response('Invalid action', { status: 400 });
};
