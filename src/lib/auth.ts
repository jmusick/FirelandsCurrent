import { env } from 'cloudflare:workers';
import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { captcha } from 'better-auth/plugins';
import { importPKCS8, SignJWT } from 'jose';
import { sendPasswordResetMail, sendVerificationMail } from './mail';

async function appleClientSecret(clientId: string, teamId: string, keyId: string, privateKey: string): Promise<string> {
  const key = await importPKCS8(privateKey.replace(/\\n/g, '\n'), 'ES256');
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setSubject(clientId)
    .setAudience('https://appleid.apple.com')
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 60 * 24 * 30)
    .sign(key);
}

export type SocialProvider = 'google' | 'facebook' | 'apple' | 'microsoft';

export function enabledProviders(): SocialProvider[] {
  const providers: SocialProvider[] = [];
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) providers.push('google');
  if (env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET) providers.push('facebook');
  if (env.APPLE_CLIENT_ID && env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_PRIVATE_KEY) providers.push('apple');
  if (env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET) providers.push('microsoft');
  return providers;
}

/** Refuses new sessions for suspended accounts, so they can't sign in by any method. */
async function refuseSuspended(session: { userId: string }): Promise<void> {
  const suspension = await env.DB.prepare('SELECT expires_at FROM user_suspensions WHERE user_id = ? AND (expires_at IS NULL OR expires_at > ?)')
    .bind(session.userId, Date.now()).first<{ expires_at: number | null }>();
  if (!suspension) return;
  const until = suspension.expires_at
    ? ` until ${new Date(suspension.expires_at).toLocaleDateString('en-US', { dateStyle: 'long', timeZone: 'America/New_York' })}`
    : '';
  throw new APIError('FORBIDDEN', { message: `This account is suspended${until}.`, code: 'ACCOUNT_SUSPENDED' });
}

export function createAuth() {
  if (!env.BETTER_AUTH_SECRET || !env.SITE_URL) {
    throw new Error('BETTER_AUTH_SECRET and SITE_URL must be configured');
  }

  const providers = enabledProviders();
  const googleId = env.GOOGLE_CLIENT_ID;
  const googleSecret = env.GOOGLE_CLIENT_SECRET;
  const facebookId = env.FACEBOOK_CLIENT_ID;
  const facebookSecret = env.FACEBOOK_CLIENT_SECRET;
  const appleId = env.APPLE_CLIENT_ID;
  const appleTeam = env.APPLE_TEAM_ID;
  const appleKeyId = env.APPLE_KEY_ID;
  const appleKey = env.APPLE_PRIVATE_KEY;
  const microsoftId = env.MICROSOFT_CLIENT_ID;
  const microsoftSecret = env.MICROSOFT_CLIENT_SECRET;
  return betterAuth({
    appName: 'Firelands Current',
    database: env.DB,
    baseURL: env.SITE_URL,
    secret: env.BETTER_AUTH_SECRET,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      // Nobody gets a session until they prove they own the address.
      requireEmailVerification: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      sendResetPassword: async ({ user, url }) => sendPasswordResetMail(user, url),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60,
      sendVerificationEmail: async ({ user, url }) => sendVerificationMail(user, url),
    },
    plugins: [
      // Sending email to arbitrary addresses is the abuse risk, so those endpoints need a Turnstile token
      // in the x-captcha-response header. Sign-in is left alone: it only mails after a correct password.
      captcha({
        provider: 'cloudflare-turnstile',
        secretKey: env.TURNSTILE_SECRET_KEY,
        endpoints: ['/sign-up/email', '/request-password-reset', '/send-verification-email'],
      }),
    ],
    account: {
      accountLinking: {
        enabled: true,
        // Linking providers from a signed-in account is supported. Avoid merging
        // unrelated accounts merely because their email strings match.
        disableImplicitLinking: true,
      },
    },
    socialProviders: {
      ...(googleId && googleSecret ? { google: { clientId: googleId, clientSecret: googleSecret } } : {}),
      ...(facebookId && facebookSecret ? { facebook: { clientId: facebookId, clientSecret: facebookSecret } } : {}),
      ...(microsoftId && microsoftSecret ? { microsoft: { clientId: microsoftId, clientSecret: microsoftSecret, tenantId: 'common' } } : {}),
      ...(appleId && appleTeam && appleKeyId && appleKey ? { apple: async () => ({ clientId: appleId, clientSecret: await appleClientSecret(appleId, appleTeam, appleKeyId, appleKey) }) } : {}),
    },
    // Failed social sign-ins land on our own sign-in page (as ?error=code) instead of Better Auth's stock error page.
    onAPIError: { errorURL: '/sign-in' },
    databaseHooks: { session: { create: { before: refuseSuspended } } },
    trustedOrigins: providers.includes('apple') ? ['https://appleid.apple.com'] : [],
  });
}

export type SiteAuth = ReturnType<typeof createAuth>;
