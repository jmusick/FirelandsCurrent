import type { APIRoute } from 'astro';
import { createAuth } from '../../../lib/auth';

export const ALL: APIRoute = async ({ request }) => createAuth().handler(request);
