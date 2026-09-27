import { defineMiddleware } from 'astro:middleware';
import { createAuth } from './lib/auth';
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

  if (!context.url.pathname.startsWith('/api/auth/')) {
    const current = await createAuth().api.getSession({ headers: context.request.headers });
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
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  return response;
});
