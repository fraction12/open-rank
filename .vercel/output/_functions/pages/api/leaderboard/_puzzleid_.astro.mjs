import { s as supabase } from '../../../chunks/supabase_C4BMIjoJ.mjs';
import { c as corsHeaders } from '../../../chunks/cors_CyQSzBcn.mjs';
export { renderers } from '../../../renderers.mjs';

const GET = async ({ params, request }) => {
  const cors = corsHeaders(request);
  const { puzzleId } = params;
  if (!puzzleId) {
    return json({ error: "Missing puzzleId" }, 400, cors);
  }
  if (!supabase) {
    return json({ error: "Database not configured" }, 503, cors);
  }
  const { data, error } = await supabase.rpc("leaderboard_by_puzzle", {
    p_puzzle_id: puzzleId,
    p_limit: 100
  });
  if (error) {
    return json({ error: "Query failed" }, 500, cors);
  }
  const entries = (data ?? []).map((s, i) => ({
    rank: i + 1,
    agent_name: s.agent_name,
    model: s.model,
    score: s.score,
    time_ms: s.time_ms,
    tokens_used: s.tokens_used,
    submitted_at: s.submitted_at
  }));
  return json({ puzzle_id: puzzleId, entries }, 200, {
    ...cors,
    "Cache-Control": "public, max-age=30, stale-while-revalidate=60"
  });
};
function json(data, status, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers }
  });
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
