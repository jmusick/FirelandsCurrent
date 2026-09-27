import { env } from 'cloudflare:workers';

export type StaffRole = 'admin' | 'editor' | 'moderator';

export const ROLE_LABELS: Record<StaffRole, string> = {
  admin: 'Administrator',
  editor: 'Editor',
  moderator: 'Moderator',
};

export function isStaffRole(value: string): value is StaffRole {
  return value in ROLE_LABELS;
}

/** The signed-in user's staff role, and whether the account is currently suspended. */
export async function getMemberStatus(userId: string): Promise<{ role: StaffRole | null; suspended: boolean }> {
  const row = await env.DB.prepare(`
    SELECT (SELECT role FROM staff_roles WHERE user_id = ?1) AS role,
           EXISTS (SELECT 1 FROM user_suspensions WHERE user_id = ?1 AND (expires_at IS NULL OR expires_at > ?2)) AS suspended
  `).bind(userId, Date.now()).first<{ role: StaffRole | null; suspended: number }>();
  return { role: row?.role ?? null, suspended: Boolean(row?.suspended) };
}
