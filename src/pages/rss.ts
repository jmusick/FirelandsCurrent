import type { APIRoute } from 'astro';

// /feed and /rss are the addresses people guess first.
export const GET: APIRoute = ({ url, redirect }) => redirect(`/rss.xml${url.search}`, 301);
