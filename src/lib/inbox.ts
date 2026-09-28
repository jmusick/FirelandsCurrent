import { env } from 'cloudflare:workers';

export const INBOXES = {
  news: { address: 'news@firelandscurrent.com', subject: 'News tip', path: '/submit-news' },
  contact: { address: 'contact@firelandscurrent.com', subject: 'Contact form', path: '/contact' },
} as const;

export type InboxKind = keyof typeof INBOXES;

export function isInboxKind(value: string): value is InboxKind {
  return value === 'news' || value === 'contact';
}

export async function verifyTurnstile(token: string, ip: string | null): Promise<boolean> {
  if (!token) return false;
  const body = new FormData();
  body.set('secret', env.TURNSTILE_SECRET_KEY);
  body.set('response', token);
  if (ip) body.set('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  return res.ok && ((await res.json()) as { success: boolean }).success === true;
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Sender must be on the onboarded domain; the visitor's address goes in Reply-To so
// staff can answer straight from their inbox.
export async function sendToInbox(kind: InboxKind, msg: { name: string; email: string; subject: string; body: string }) {
  const inbox = INBOXES[kind];
  const subject = `${inbox.subject}: ${msg.subject}`.slice(0, 200);
  const text = `From: ${msg.name} <${msg.email}>\n\n${msg.body}`;
  await env.EMAIL.send({
    to: inbox.address,
    from: { email: 'noreply@firelandscurrent.com', name: 'Firelands Current website' },
    replyTo: { email: msg.email, name: msg.name },
    subject,
    text,
    html: `<p><strong>From:</strong> ${escapeHtml(msg.name)} &lt;${escapeHtml(msg.email)}&gt;</p><p style="white-space:pre-wrap">${escapeHtml(msg.body)}</p>`,
  });
}
