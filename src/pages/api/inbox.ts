import type { APIRoute } from 'astro';
import { cleanText, sameOrigin } from '../../lib/forum';
import { INBOXES, isInboxKind, sendToInbox, verifyTurnstile } from '../../lib/inbox';

const EMAIL = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;

export const POST: APIRoute = async ({ request }) => {
  if (!sameOrigin(request)) return new Response('Invalid request origin', { status: 403 });

  const form = await request.formData();
  const kind = cleanText(form.get('kind'));
  if (!isInboxKind(kind)) return new Response('Unknown form', { status: 400 });
  const back = (param: string) => Response.redirect(new URL(`${INBOXES[kind].path}?${param}`, request.url), 303);

  // Hidden field real visitors never fill in; pretend success so bots learn nothing.
  if (cleanText(form.get('website'))) return back('sent=1');

  if (!(await verifyTurnstile(cleanText(form.get('cf-turnstile-response')), request.headers.get('CF-Connecting-IP')))) {
    return back('error=captcha');
  }

  const name = cleanText(form.get('name'));
  const email = cleanText(form.get('email'));
  const subject = cleanText(form.get('subject')).replace(/[\r\n]+/g, ' ');
  const body = cleanText(form.get('body'));
  if (!name || name.length > 100 || email.length > 200 || !EMAIL.test(email) ||
      subject.length < 3 || subject.length > 120 || body.length < 20 || body.length > 10000) {
    return back('error=invalid');
  }

  try {
    await sendToInbox(kind, { name: name.replace(/[\r\n]+/g, ' '), email, subject, body });
  } catch (err) {
    console.error('inbox send failed', err);
    return back('error=send');
  }
  return back('sent=1');
};
