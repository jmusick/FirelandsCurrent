import { env } from 'cloudflare:workers';
import { betterAuth } from 'better-auth';
import { importPKCS8, SignJWT } from 'jose';

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

export function enabledProviders(): Array<'google' | 'facebook' | 'apple'> {
  const providers: Array<'google' | 'facebook' | 'apple'> = [];
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) providers.push('google');
  if (env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET) providers.push('facebook');
  if (env.APPLE_CLIENT_ID && env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_PRIVATE_KEY) providers.push('apple');
  return providers;
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
  return betterAuth({
    appName: 'Firelands Current',
    database: env.DB,
    baseURL: env.SITE_URL,
    secret: env.BETTER_AUTH_SECRET,
    emailAndPassword: { enabled: true, minPasswordLength: 12 },
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
      ...(appleId && appleTeam && appleKeyId && appleKey ? { apple: async () => ({ clientId: appleId, clientSecret: await appleClientSecret(appleId, appleTeam, appleKeyId, appleKey) }) } : {}),
    },
    trustedOrigins: providers.includes('apple') ? ['https://appleid.apple.com'] : [],
  });
}

export type SiteAuth = ReturnType<typeof createAuth>;
