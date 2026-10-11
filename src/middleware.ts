import { defineMiddleware } from 'astro:middleware';
import { createAuth } from './lib/auth';
import { applyCachePolicy, applySecurityHeaders } from './lib/response-headers';
import { getMemberStatus } from './lib/staff';

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.url.hostname === 'www.firelandscurrent.com') {
    const canonical = new URL(context.request.url);
    canonical.hostname = 'firelandscurrent.com';
    return Response.redirect(canonical, 308);
  }

  context.locals.user = null;
  context.locals.session = null;
  context.locals.staffRole = null;

  // Set-Cookie headers from a sliding session refresh; without them the browser
  // cookie expires on its original date even though the session was extended.
  let refreshedCookies: string[] = [];
  if (!context.url.pathname.startsWith('/api/auth/')) {
    const { headers, response: current } = await createAuth().api.getSession({ headers: context.request.headers, returnHeaders: true });
    refreshedCookies = headers.getSetCookie();
    // Suspending an account deletes its sessions; this also covers a session created in the gap.
    const status = current?.user ? await getMemberStatus(current.user.id) : null;
    if (current && status && !status.suspended) {
      context.locals.user = current.user;
      context.locals.session = current.session;
      context.locals.staffRole = status.role;
    }
  }

  // Redirect responses have immutable headers in the Workers runtime.
  const upstream = await next();
  const response = new Response(upstream.body, upstream);
  for (const cookie of refreshedCookies) response.headers.append('Set-Cookie', cookie);
  applySecurityHeaders(response.headers);
  // After the cookies, so a refreshed session also marks the response private.
  applyCachePolicy(response.headers, { pathname: context.url.pathname, signedIn: context.locals.user !== null });
  return response;
});
