import { s as supabase } from '../../chunks/supabase_C4BMIjoJ.mjs';
export { renderers } from '../../renderers.mjs';

async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function computeSpeedBonus(time_ms, best_time_ms) {
  if (time_ms == null) return 10;
  if (best_time_ms == null || best_time_ms <= 0) return 30;
  const ratio = best_time_ms / time_ms;
  return Math.round(Math.min(30, 30 * Math.min(ratio, 1)));
}
function computeEfficiencyBonus(tokens_used, best_tokens) {
  if (tokens_used == null) return 7;
  if (best_tokens == null || best_tokens <= 0) return 20;
  const ratio = best_tokens / tokens_used;
  return Math.round(Math.min(20, 20 * Math.min(ratio, 1)));
}

const POST = async ({ request }) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const { puzzle_id, answer, agent_name, model, time_ms, tokens_used } = body;
  if (!puzzle_id || typeof puzzle_id !== "string") return json({ error: "puzzle_id is required" }, 400);
  if (!answer || typeof answer !== "string") return json({ error: "answer is required" }, 400);
  if (!agent_name || typeof agent_name !== "string") return json({ error: "agent_name is required" }, 400);
  if (!supabase) return json({ error: "Database not configured" }, 503);
  const { data: puzzle, error: pErr } = await supabase.from("puzzles").select("id, answer_hash").eq("id", puzzle_id).single();
  if (pErr || !puzzle) return json({ error: "Puzzle not found" }, 404);
  const answerHash = await sha256(answer.trim());
  const correct = answerHash === puzzle.answer_hash;
  let bestTimeMs = null;
  let bestTokens = null;
  if (correct) {
    const { data: bestSubs } = await supabase.from("submissions").select("time_ms, tokens_used").eq("puzzle_id", puzzle_id).eq("correct", true).order("time_ms", { ascending: true }).limit(1);
    if (bestSubs && bestSubs.length > 0) {
      bestTimeMs = bestSubs[0].time_ms;
      bestTokens = bestSubs[0].tokens_used;
    }
  }
  const correctness = correct ? 50 : 0;
  const speed_bonus = correct ? computeSpeedBonus(time_ms, bestTimeMs) : 0;
  const efficiency_bonus = correct ? computeEfficiencyBonus(tokens_used, bestTokens) : 0;
  const score = correctness + speed_bonus + efficiency_bonus;
  const { data: inserted, error: insErr } = await supabase.from("submissions").insert({
    puzzle_id,
    agent_name: agent_name.trim(),
    model: model?.trim() ?? null,
    answer_hash: answerHash,
    correct,
    score,
    time_ms: time_ms ?? null,
    tokens_used: tokens_used ?? null
  }).select("id").single();
  if (insErr || !inserted) {
    console.error("Insert error:", insErr);
    return json({ error: "Failed to record submission" }, 500);
  }
  const { count } = await supabase.from("submissions").select("id", { count: "exact", head: true }).eq("puzzle_id", puzzle_id).gte("score", score);
  const rank = count ?? 1;
  return json({
    correct,
    score,
    rank,
    breakdown: { correctness, speed_bonus, efficiency_bonus }
  }, 200);
};
function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
