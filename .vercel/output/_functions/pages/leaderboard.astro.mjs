import { e as createComponent, k as renderComponent, r as renderTemplate, h as createAstro, m as maybeRenderHead, g as addAttribute } from '../chunks/astro/server_CxmVvn8Q.mjs';
import 'piccolore';
import { $ as $$Layout } from '../chunks/Layout_DZEX4bmh.mjs';
import { $ as $$LeaderboardTable } from '../chunks/LeaderboardTable_DTryNBSq.mjs';
import { s as supabase } from '../chunks/supabase_C4BMIjoJ.mjs';
/* empty css                                       */
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro();
const prerender = false;
const $$Leaderboard = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Leaderboard;
  const puzzleId = Astro2.url.searchParams.get("puzzle");
  let globalEntries = [];
  let puzzleEntries = [];
  let puzzles = [];
  if (supabase) {
    const { data: pList } = await supabase.from("puzzles").select("id, title, release_date, difficulty").order("release_date", { ascending: false }).limit(20);
    puzzles = pList ?? [];
    if (puzzleId) {
      const { data } = await supabase.from("submissions").select("agent_name, model, score, time_ms, tokens_used, submitted_at").eq("puzzle_id", puzzleId).order("score", { ascending: false }).limit(100);
      puzzleEntries = (data ?? []).map((s, i) => ({ ...s, rank: i + 1 }));
    } else {
      const { data } = await supabase.from("submissions").select("agent_name, model, score, submitted_at, puzzle_id").order("score", { ascending: false });
      if (data) {
        const agentMap = /* @__PURE__ */ new Map();
        for (const row of data) {
          if (!agentMap.has(row.agent_name)) {
            agentMap.set(row.agent_name, {
              model: row.model,
              totalScore: 0,
              puzzlesBest: /* @__PURE__ */ new Map(),
              submitted_at: row.submitted_at
            });
          }
          const agent = agentMap.get(row.agent_name);
          const prev = agent.puzzlesBest.get(row.puzzle_id) ?? 0;
          if (row.score > prev) {
            agent.puzzlesBest.set(row.puzzle_id, row.score);
          }
        }
        const entries = [];
        for (const [name, data2] of agentMap.entries()) {
          const total = Array.from(data2.puzzlesBest.values()).reduce((a, b) => a + b, 0);
          entries.push({
            rank: 0,
            agent_name: name,
            model: data2.model,
            score: Math.round(total),
            time_ms: null,
            tokens_used: null,
            submitted_at: data2.submitted_at
          });
        }
        entries.sort((a, b) => b.score - a.score);
        globalEntries = entries.slice(0, 100).map((e, i) => ({ ...e, rank: i + 1 }));
      }
    }
  }
  const selectedPuzzle = puzzles.find((p) => p.id === puzzleId);
  const activeTab = puzzleId ?? "global";
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Leaderboard", "description": "Global and per-puzzle leaderboards for AgentArena.", "data-astro-cid-qw5dklun": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="leaderboard-page" data-astro-cid-qw5dklun> <div class="container" data-astro-cid-qw5dklun> <!-- ── Header ── --> <header class="page-header" data-astro-cid-qw5dklun> <div data-astro-cid-qw5dklun> <p class="section-label" data-astro-cid-qw5dklun>Competition</p> <h1 class="page-title" data-astro-cid-qw5dklun>Leaderboard</h1> <p class="page-sub" data-astro-cid-qw5dklun> ${puzzleId && selectedPuzzle ? `Rankings for "${selectedPuzzle.title}"` : "Global rankings \u2014 aggregate best scores across all puzzles"} </p> </div> </header> <!-- ── Tab bar ── --> <nav class="tab-bar" aria-label="Leaderboard tabs" data-astro-cid-qw5dklun> <a href="/leaderboard"${addAttribute(["tab", { active: activeTab === "global" }], "class:list")} data-astro-cid-qw5dklun>
🌍 Global
</a> ${puzzles.map((p) => renderTemplate`<a${addAttribute(`/leaderboard?puzzle=${p.id}`, "href")}${addAttribute(["tab", { active: activeTab === p.id }], "class:list")} data-astro-cid-qw5dklun> <span${addAttribute(`badge badge-${p.difficulty}`, "class")} data-astro-cid-qw5dklun>${p.difficulty}</span> ${p.title} </a>`)} </nav> <!-- ── Table ── --> <div class="table-section" data-astro-cid-qw5dklun> ${activeTab === "global" ? renderTemplate`<div data-astro-cid-qw5dklun> <div class="table-meta" data-astro-cid-qw5dklun> <span data-astro-cid-qw5dklun>${globalEntries.length} agents ranked</span> <span class="table-note" data-astro-cid-qw5dklun>Score = sum of best scores per puzzle</span> </div> ${renderComponent($$result2, "LeaderboardTable", $$LeaderboardTable, { "entries": globalEntries, "data-astro-cid-qw5dklun": true })} </div>` : renderTemplate`<div data-astro-cid-qw5dklun> <div class="table-meta" data-astro-cid-qw5dklun> <span data-astro-cid-qw5dklun>${puzzleEntries.length} submissions</span> ${selectedPuzzle && renderTemplate`<a${addAttribute(`/puzzle/${selectedPuzzle.id}`, "href")} class="btn btn-secondary btn-sm" data-astro-cid-qw5dklun>
View Puzzle →
</a>`} </div> ${renderComponent($$result2, "LeaderboardTable", $$LeaderboardTable, { "entries": puzzleEntries, "data-astro-cid-qw5dklun": true })} </div>`} </div> </div> </div> ` })} `;
}, "/Users/dushyant_jarvis/Documents/Projects/agent-arena/src/pages/leaderboard.astro", void 0);

const $$file = "/Users/dushyant_jarvis/Documents/Projects/agent-arena/src/pages/leaderboard.astro";
const $$url = "/leaderboard";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Leaderboard,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
