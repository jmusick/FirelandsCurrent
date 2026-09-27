import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { ADMIN, canAccess } from '../../../lib/admin';
import { cleanText, sameOrigin } from '../../../lib/forum';
import { ROLE_LABELS, isStaffRole } from '../../../lib/staff';
import { EMAIL, MAX_PASSWORD, MIN_PASSWORD, auditStatement, createPasswordUser, hashPassword } from '../../../lib/users';

const DURATIONS: Record<string, number | null> = { '1': 1, '7': 7, '30': 30, permanent: null };

export const POST: APIRoute = async ({ request, locals }) => {
  const actor = locals.user;
  if (!actor || !canAccess(locals.staffRole, ADMIN.users)) return new Response('Forbidden', { status: 403 });
  if (!sameOrigin(request)) return new Response('Invalid request origin', { status: 403 });

  const form = await request.formData();
  const action = cleanText(form.get('action'));
  const go = (path: string, params: Record<string, string>) => {
    const url = new URL(path, request.url);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    return Response.redirect(url, 303);
  };

  if (action === 'create') {
    const name = cleanText(form.get('name'));
    const email = cleanText(form.get('email')).toLowerCase();
    const password = typeof form.get('password') === 'string' ? String(form.get('password')) : '';
    const role = cleanText(form.get('role'));
    if (!name || name.length > 80 || !EMAIL.test(email) || email.length > 254) return go('/admin/users/new', { error: 'profile' });
    if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) return go('/admin/users/new', { error: 'password' });
    if (role && !isStaffRole(role)) return go('/admin/users/new', { error: 'role' });
    if (await env.DB.prepare('SELECT 1 FROM "user" WHERE email = ?').bind(email).first()) return go('/admin/users/new', { error: 'email-taken' });

    const id = await createPasswordUser(name, email, password);
    const target = { user: { id, name, email } };
    await env.DB.batch([
      auditStatement(actor, target, 'create', role ? `Role: ${ROLE_LABELS[role as keyof typeof ROLE_LABELS]}` : undefined),
      ...(role ? [
        env.DB.prepare('INSERT INTO staff_roles (user_id, role, created_at) VALUES (?, ?, ?)').bind(id, role, Date.now()),
        auditStatement(actor, target, 'set-role', `None → ${ROLE_LABELS[role as keyof typeof ROLE_LABELS]}`),
      ] : []),
    ]);
    return go(`/admin/users/${id}`, { notice: 'created' });
  }

  const userId = cleanText(form.get('userId'));
  const target = await env.DB.prepare(`
    SELECT u.id, u.name, u.email, u.emailVerified, sr.role
    FROM "user" u LEFT JOIN staff_roles sr ON sr.user_id = u.id WHERE u.id = ?
  `).bind(userId).first<{ id: string; name: string; email: string; emailVerified: number; role: string | null }>();
  if (!target) return new Response('User not found', { status: 404 });

  const page = `/admin/users/${target.id}`;
  const self = target.id === actor.id;
  const now = Date.now();
  const audit = (name: string, detail?: string) => auditStatement(actor, { user: target }, name, detail);

  switch (action) {
    case 'update-profile': {
      const name = cleanText(form.get('name'));
      const email = cleanText(form.get('email')).toLowerCase();
      const verified = form.get('emailVerified') === 'on' ? 1 : 0;
      if (!name || name.length > 80 || !EMAIL.test(email) || email.length > 254) return go(page, { error: 'profile' });
      if (email !== target.email && await env.DB.prepare('SELECT 1 FROM "user" WHERE email = ? AND id != ?').bind(email, target.id).first()) {
        return go(page, { error: 'email-taken' });
      }
      const changes = [
        name !== target.name && `Name: ${target.name} → ${name}`,
        email !== target.email && `Email: ${target.email} → ${email}`,
        verified !== target.emailVerified && `Email verified: ${verified ? 'yes' : 'no'}`,
      ].filter(Boolean);
      if (!changes.length) return go(page, { notice: 'unchanged' });
      await env.DB.batch([
        env.DB.prepare('UPDATE "user" SET name = ?, email = ?, emailVerified = ?, updatedAt = ? WHERE id = ?')
          .bind(name, email, verified, new Date(now).toISOString(), target.id),
        audit('update-profile', changes.join('; ')),
      ]);
      return go(page, { notice: 'profile' });
    }

    case 'set-role': {
      const role = cleanText(form.get('role'));
      if (self) return go(page, { error: 'self-role' });
      if (role && !isStaffRole(role)) return go(page, { error: 'role' });
      if ((role || null) === target.role) return go(page, { notice: 'unchanged' });
      const label = (r: string | null) => (r && isStaffRole(r) ? ROLE_LABELS[r] : 'None');
      const suspended = await env.DB.prepare('SELECT 1 FROM user_suspensions WHERE user_id = ? AND (expires_at IS NULL OR expires_at > ?)').bind(target.id, now).first();
      if (role && suspended) return go(page, { error: 'suspended-role' });
      await env.DB.batch([
        role
          ? env.DB.prepare('INSERT INTO staff_roles (user_id, role, created_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET role = excluded.role').bind(target.id, role, now)
          : env.DB.prepare('DELETE FROM staff_roles WHERE user_id = ?').bind(target.id),
        audit('set-role', `${label(target.role)} → ${label(role || null)}`),
      ]);
      return go(page, { notice: 'role' });
    }

    case 'suspend': {
      const reason = cleanText(form.get('reason'));
      const duration = cleanText(form.get('duration'));
      const hideContent = form.get('hideContent') === 'on';
      if (self) return go(page, { error: 'self' });
      if (target.role) return go(page, { error: 'staff' });
      if (reason.length < 3 || reason.length > 500 || !(duration in DURATIONS)) return go(page, { error: 'suspend' });
      const days = DURATIONS[duration];
      const expiresAt = days === null ? null : now + days * 86400000;
      await env.DB.batch([
        env.DB.prepare(`
          INSERT INTO user_suspensions (user_id, reason, suspended_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET reason = excluded.reason, suspended_by = excluded.suspended_by, created_at = excluded.created_at, expires_at = excluded.expires_at
        `).bind(target.id, reason, actor.id, now, expiresAt),
        env.DB.prepare('DELETE FROM session WHERE userId = ?').bind(target.id),
        ...(hideContent ? hideAll(target.id, now) : []),
        audit('suspend', `${days === null ? 'Until lifted' : `${days} day${days === 1 ? '' : 's'}`}: ${reason}${hideContent ? ' (posts hidden)' : ''}`),
      ]);
      return go(page, { notice: 'suspended' });
    }

    case 'unsuspend': {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM user_suspensions WHERE user_id = ?').bind(target.id),
        audit('unsuspend'),
      ]);
      return go(page, { notice: 'unsuspended' });
    }

    case 'revoke-session': {
      const sessionId = cleanText(form.get('sessionId'));
      if (sessionId === locals.session?.id) return go(page, { error: 'current-session' });
      const removed = await env.DB.prepare('DELETE FROM session WHERE id = ? AND userId = ?').bind(sessionId, target.id).run();
      if (removed.meta.changes) await audit('revoke-session').run();
      return go(page, { notice: 'session' });
    }

    case 'revoke-sessions': {
      // Your own current session is kept so an admin doesn't lock themselves out of this page.
      await env.DB.batch([
        env.DB.prepare('DELETE FROM session WHERE userId = ? AND id != ?').bind(target.id, locals.session?.id ?? ''),
        audit('revoke-sessions'),
      ]);
      return go(page, { notice: 'sessions' });
    }

    case 'set-password': {
      const password = typeof form.get('password') === 'string' ? String(form.get('password')) : '';
      if (self) return go(page, { error: 'self-password' });
      if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) return go(page, { error: 'password' });
      const hash = await hashPassword(password);
      const iso = new Date(now).toISOString();
      const existing = await env.DB.prepare("SELECT id FROM account WHERE userId = ? AND providerId = 'credential'").bind(target.id).first<{ id: string }>();
      await env.DB.batch([
        existing
          ? env.DB.prepare('UPDATE account SET password = ?, updatedAt = ? WHERE id = ?').bind(hash, iso, existing.id)
          : env.DB.prepare("INSERT INTO account (id, accountId, providerId, userId, password, createdAt, updatedAt) VALUES (?, ?, 'credential', ?, ?, ?, ?)")
            .bind(crypto.randomUUID(), target.id, target.id, hash, iso, iso),
        env.DB.prepare('DELETE FROM session WHERE userId = ?').bind(target.id),
        audit('set-password', existing ? undefined : 'Added email & password sign-in'),
      ]);
      return go(page, { notice: 'password' });
    }

    case 'hide-content': {
      await env.DB.batch([...hideAll(target.id, now), audit('hide-content')]);
      return go(page, { notice: 'hidden' });
    }

    case 'delete': {
      if (self) return go(page, { error: 'self' });
      if (target.role) return go(page, { error: 'staff' });
      if (cleanText(form.get('confirm')).toLowerCase() !== target.email) return go(page, { error: 'confirm' });
      // Threads, replies, reports, sessions and sign-in methods cascade with the user row.
      await env.DB.batch([
        audit('delete'),
        env.DB.prepare('DELETE FROM "user" WHERE id = ?').bind(target.id),
      ]);
      return go('/admin/users', { deleted: target.email });
    }
  }

  return new Response('Invalid action', { status: 400 });
};

/** Hides every thread and reply by a user and closes the open reports about them. */
function hideAll(userId: string, now: number) {
  return [
    env.DB.prepare("UPDATE forum_threads SET status = 'hidden', updated_at = ? WHERE author_id = ? AND status = 'published'").bind(now, userId),
    env.DB.prepare("UPDATE forum_replies SET status = 'hidden', updated_at = ? WHERE author_id = ? AND status = 'published'").bind(now, userId),
    env.DB.prepare(`
      UPDATE forum_reports SET status = 'resolved', resolved_at = ?1
      WHERE status = 'open' AND (
        thread_id IN (SELECT id FROM forum_threads WHERE author_id = ?2) OR
        reply_id IN (SELECT id FROM forum_replies WHERE author_id = ?2))
    `).bind(now, userId),
  ];
}
