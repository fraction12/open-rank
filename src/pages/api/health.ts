import type { APIRoute } from 'astro';
import { json } from '../../lib/response';

export const GET: APIRoute = async ({ locals }) => {
  return json({
    status: 'ok',
    service: 'open-rank',
    timestamp: new Date().toISOString(),
    request_id: locals.requestId ?? null,
  });
};
