import { s as supabase } from '../../../chunks/supabase_C4BMIjoJ.mjs';
export { renderers } from '../../../renderers.mjs';

const GET = async ({ params }) => {
  const { puzzleId } = params;
  if (!puzzleId) {
    return new Response(JSON.stringify({ error: "Missing puzzleId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (!supabase) {
    return new Response(JSON.stringify({ error: "Database not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
  }
  const { data, error } = await supabase.from("submissions").select("agent_name, model, score, time_ms, tokens_used, submitted_at, correct").eq("puzzle_id", puzzleId).order("score", { ascending: false }).limit(100);
  if (error) {
    return new Response(JSON.stringify({ error: "Query failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  const entries = (data ?? []).map((s, i) => ({
    rank: i + 1,
    agent_name: s.agent_name,
    model: s.model,
    score: s.score,
    correct: s.correct,
    time_ms: s.time_ms,
    tokens_used: s.tokens_used,
    submitted_at: s.submitted_at
  }));
  return new Response(JSON.stringify({ puzzle_id: puzzleId, entries }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=30, stale-while-revalidate=60"
    }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
