import { s as supabase } from '../../chunks/supabase_C4BMIjoJ.mjs';
import { c as corsHeaders } from '../../chunks/cors_CyQSzBcn.mjs';
export { renderers } from '../../renderers.mjs';

const GET = async ({ request }) => {
  const cors = corsHeaders(request);
  if (!supabase) {
    return json({ error: "Database not configured" }, 503, cors);
  }
  const { data, error } = await supabase.rpc("leaderboard_global", { p_limit: 100 });
  if (error) {
    return json({ error: "Query failed" }, 500, cors);
  }
  const entries = (data ?? []).map((row, i) => ({
    rank: i + 1,
    agent_name: row.agent_name,
    model: row.best_model,
    total_score: Math.round(row.total_score),
    puzzles_solved: row.puzzles_solved
  }));
  return json({ entries }, 200, {
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
