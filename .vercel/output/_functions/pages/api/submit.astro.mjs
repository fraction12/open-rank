import { s as supabase } from '../../chunks/supabase_C4BMIjoJ.mjs';
import { c as corsHeaders } from '../../chunks/cors_CyQSzBcn.mjs';
export { renderers } from '../../renderers.mjs';

async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function saltedHash(answer, puzzleId) {
  const salt = (typeof process !== "undefined" ? process.env.ANSWER_SALT : void 0) || "dev-salt-not-for-production";
  return sha256(`${answer}:${puzzleId}:${salt}`);
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

const store = /* @__PURE__ */ new Map();
function checkRateLimit(key, maxRequests, windowMs) {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (entry.count >= maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1e3) };
  }
  entry.count++;
  return { allowed: true };
}

const OPTIONS = async ({ request }) => {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
};
const POST = async ({ request }) => {
  const cors = corsHeaders(request);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400, cors);
  }
  const { puzzle_id, answer, agent_name, model, time_ms, tokens_used } = body;
  if (!puzzle_id || typeof puzzle_id !== "string") return json({ error: "puzzle_id is required" }, 400, cors);
  if (!answer || typeof answer !== "string") return json({ error: "answer is required" }, 400, cors);
  if (!agent_name || typeof agent_name !== "string") return json({ error: "agent_name is required" }, 400, cors);
  if (agent_name.length > 50) return json({ error: "agent_name must be 50 characters or less" }, 400, cors);
  if (model && model.length > 100) return json({ error: "model must be 100 characters or less" }, 400, cors);
  if (!/^[\w\s\-\.\/:]+$/i.test(agent_name)) return json({ error: "agent_name contains invalid characters" }, 400, cors);
  if (time_ms !== void 0 && (typeof time_ms !== "number" || time_ms < 0 || time_ms > 864e5))
    return json({ error: "time_ms must be 0–86400000" }, 400, cors);
  if (tokens_used !== void 0 && (typeof tokens_used !== "number" || tokens_used < 0 || tokens_used > 1e7))
    return json({ error: "tokens_used must be 0–10000000" }, 400, cors);
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const rlKey = `${ip}:${puzzle_id}`;
  const rl = checkRateLimit(rlKey, 10, 60 * 60 * 1e3);
  if (!rl.allowed) {
    return json(
      { error: "Rate limit exceeded. Try again later.", retry_after: rl.retryAfter },
      429,
      cors
    );
  }
  if (!supabase) return json({ error: "Database not configured" }, 503, cors);
  const { data: puzzle, error: pErr } = await supabase.from("puzzles").select("id, answer_hash").eq("id", puzzle_id).single();
  if (pErr || !puzzle) return json({ error: "Puzzle not found" }, 404, cors);
  const answerHash = await saltedHash(answer.trim(), puzzle_id);
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
    return json({ error: "Failed to record submission" }, 500, cors);
  }
  const { count } = await supabase.from("submissions").select("id", { count: "exact", head: true }).eq("puzzle_id", puzzle_id).gte("score", score);
  const rank = count ?? 1;
  return json(
    { correct, score, rank, breakdown: { correctness, speed_bonus, efficiency_bonus } },
    200,
    cors
  );
};
function json(data, status, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers }
  });
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  OPTIONS,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
