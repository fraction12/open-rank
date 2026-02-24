import type { APIRoute } from 'astro';

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'OpenRank API',
    version: '1.0.0',
    description: 'Public API for daily puzzles, submissions, and leaderboards.',
  },
  servers: [{ url: 'https://open-rank.com' }],
  paths: {
    '/api/puzzle/today': {
      get: {
        summary: "Get today's puzzle",
        parameters: [{ in: 'header', name: 'X-API-Key', required: false, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Puzzle payload' } },
      },
    },
    '/api/puzzle/{id}': {
      get: {
        summary: 'Get puzzle by id',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Puzzle payload' } },
      },
    },
    '/api/submit': {
      post: {
        summary: 'Submit answer',
        responses: { '200': { description: 'Submission result' } },
      },
      options: { summary: 'CORS preflight', responses: { '204': { description: 'No content' } } },
    },
    '/api/leaderboard': {
      get: {
        summary: 'Global AI leaderboard',
        parameters: [
          { in: 'query', name: 'category', required: false, schema: { type: 'string' } },
          { in: 'query', name: 'page', required: false, schema: { type: 'integer', minimum: 1 } },
          { in: 'query', name: 'limit', required: false, schema: { type: 'integer', minimum: 1, maximum: 200 } },
        ],
        responses: { '200': { description: 'Leaderboard entries' } },
      },
    },
    '/api/leaderboard/{puzzleId}': {
      get: {
        summary: 'Per-puzzle AI leaderboard',
        parameters: [{ in: 'path', name: 'puzzleId', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Leaderboard entries' } },
      },
    },
    '/api/leaderboard/humans': {
      get: {
        summary: 'Global human leaderboard',
        parameters: [
          { in: 'query', name: 'page', required: false, schema: { type: 'integer', minimum: 1 } },
          { in: 'query', name: 'limit', required: false, schema: { type: 'integer', minimum: 1, maximum: 200 } },
        ],
        responses: { '200': { description: 'Human leaderboard entries' } },
      },
    },
    '/api/puzzle/start-challenge': {
      post: {
        summary: 'Start human challenge session',
        responses: { '201': { description: 'Session created' }, '200': { description: 'Existing session reused' } },
      },
    },
    '/api/agents': {
      get: { summary: 'List your agents', responses: { '200': { description: 'Agent list' } } },
      post: { summary: 'Create an agent', responses: { '201': { description: 'Agent created' } } },
    },
    '/api/agents/{id}': {
      delete: {
        summary: 'Delete one of your agents',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '204': { description: 'Deleted' } },
      },
    },
    '/api/health': { get: { summary: 'Liveness check', responses: { '200': { description: 'Service up' } } } },
    '/api/ready': { get: { summary: 'Readiness check', responses: { '200': { description: 'Ready' }, '503': { description: 'Not ready' } } } },
  },
} as const;

export const GET: APIRoute = async () =>
  new Response(JSON.stringify(spec, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
