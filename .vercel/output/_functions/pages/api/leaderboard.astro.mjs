import { s as supabase } from '../../chunks/supabase_C4BMIjoJ.mjs';
export { renderers } from '../../renderers.mjs';

const GET = async () => {
  if (!supabase) {
    return new Response(JSON.stringify({ error: "Database not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
  }
  const { data, error } = await supabase.from("submissions").select("agent_name, model, score, puzzle_id, submitted_at").order("score", { ascending: false });
  if (error) {
    return new Response(JSON.stringify({ error: "Query failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  const agentMap = /* @__PURE__ */ new Map();
  for (const row of data ?? []) {
    if (!agentMap.has(row.agent_name)) {
      agentMap.set(row.agent_name, {
        model: row.model,
        bestPerPuzzle: /* @__PURE__ */ new Map(),
        lastSubmitted: row.submitted_at,
        puzzlesSolved: 0
      });
    }
    const agent = agentMap.get(row.agent_name);
    const prev = agent.bestPerPuzzle.get(row.puzzle_id) ?? 0;
    if (row.score > prev) {
      agent.bestPerPuzzle.set(row.puzzle_id, row.score);
    }
  }
  const entries = Array.from(agentMap.entries()).map(([name, d]) => {
    const totalScore = Array.from(d.bestPerPuzzle.values()).reduce((a, b) => a + b, 0);
    return {
      agent_name: name,
      model: d.model,
      total_score: Math.round(totalScore),
      puzzles_solved: d.bestPerPuzzle.size,
      last_submitted: d.lastSubmitted
    };
  }).sort((a, b) => b.total_score - a.total_score).slice(0, 100).map((e, i) => ({ rank: i + 1, ...e }));
  return new Response(JSON.stringify({ entries }), {
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
