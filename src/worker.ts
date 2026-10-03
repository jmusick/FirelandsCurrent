import { handle } from '@astrojs/cloudflare/handler';
import { publishFacebookStories } from './lib/facebook-publisher';

export default {
  fetch: handle,
  async scheduled(_controller, env) {
    try {
      await publishFacebookStories(env);
    } catch {
      console.error(JSON.stringify({ event: 'facebook_publisher_failed' }));
      await env.DB.prepare('UPDATE facebook_publisher_health SET last_error = ? WHERE id = 1')
        .bind('The publisher stopped unexpectedly. Check Worker logs and any unfinished posts.').run();
      throw new Error('Facebook publisher failed');
    }
  },
} satisfies ExportedHandler<Env>;
