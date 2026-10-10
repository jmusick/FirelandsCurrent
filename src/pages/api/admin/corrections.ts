import { readForm } from '../../../lib/request-body';
import type { APIRoute } from 'astro';
import { ADMIN, canAccess } from '../../../lib/admin';
import { resolveCorrection, type CorrectionStatus } from '../../../lib/corrections';
import { cleanText, sameOrigin } from '../../../lib/forum';

const ACTIONS: Record<string, CorrectionStatus> = { corrected: 'corrected', declined: 'declined', reopen: 'open' };

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return Response.redirect(new URL('/sign-in?next=/admin/corrections', request.url), 303);
  if (!canAccess(locals.staffRole, ADMIN.corrections)) return new Response('Forbidden', { status: 403 });
  if (!sameOrigin(request)) return new Response('Invalid request origin', { status: 403 });
  const form = await readForm(request);
  if (form instanceof Response) return form;
  const id = cleanText(form.get('id'));
  const status = ACTIONS[cleanText(form.get('action'))];
  const note = cleanText(form.get('note'));
  if (!/^[\w-]{8,64}$/.test(id) || !status || note.length > 2000) return new Response('Invalid correction action', { status: 400 });
  if (!(await resolveCorrection(id, status, note, locals.user.id))) return new Response('Correction not found', { status: 404 });
  return Response.redirect(new URL(`/admin/corrections/${id}`, request.url), 303);
};
