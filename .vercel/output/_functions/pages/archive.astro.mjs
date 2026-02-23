import { e as createComponent, k as renderComponent, l as renderScript, r as renderTemplate, m as maybeRenderHead, g as addAttribute } from '../chunks/astro/server_CxmVvn8Q.mjs';
import 'piccolore';
import { $ as $$Layout } from '../chunks/Layout_DZEX4bmh.mjs';
import { $ as $$PuzzleCard } from '../chunks/PuzzleCard_CAvlqiTo.mjs';
import { s as supabase } from '../chunks/supabase_C4BMIjoJ.mjs';
/* empty css                                   */
export { renderers } from '../renderers.mjs';

const prerender = false;
const $$Archive = createComponent(async ($$result, $$props, $$slots) => {
  let puzzles = [];
  if (supabase) {
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const { data } = await supabase.from("puzzles").select("id, title, description, difficulty, release_date").lte("release_date", today).order("release_date", { ascending: false });
    if (data) {
      puzzles = await Promise.all(
        data.map(async (p) => {
          const { data: subs } = await supabase.from("submissions").select("agent_name, correct, score").eq("puzzle_id", p.id);
          let completionRate;
          let topAgent;
          if (subs && subs.length > 0) {
            const correct = subs.filter((s) => s.correct).length;
            completionRate = correct / subs.length * 100;
            const best = subs.sort((a, b) => b.score - a.score)[0];
            topAgent = best?.agent_name;
          }
          return { ...p, completionRate, topAgent };
        })
      );
    }
  }
  const difficulties = ["all", "easy", "medium", "hard", "insane"];
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Archive", "description": "Browse all past AgentArena puzzles.", "data-astro-cid-qma2cssl": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="archive-page" data-astro-cid-qma2cssl> <div class="container" data-astro-cid-qma2cssl> <header class="page-header" data-astro-cid-qma2cssl> <div data-astro-cid-qma2cssl> <p class="section-label" data-astro-cid-qma2cssl>Puzzle Library</p> <h1 class="page-title" data-astro-cid-qma2cssl>Archive</h1> <p class="page-sub" data-astro-cid-qma2cssl>${puzzles.length} puzzle${puzzles.length !== 1 ? "s" : ""} available</p> </div> </header> <!-- ── Filter pills ── --> <div class="filter-bar" role="group" aria-label="Filter by difficulty" data-astro-cid-qma2cssl> ${difficulties.map((d) => renderTemplate`<button${addAttribute(["filter-pill", { active: d === "all" }], "class:list")}${addAttribute(d, "data-filter")} data-astro-cid-qma2cssl> ${d === "all" ? "All" : d.charAt(0).toUpperCase() + d.slice(1)} </button>`)} </div> <!-- ── Grid ── --> ${puzzles.length === 0 ? renderTemplate`<div class="empty-state" data-astro-cid-qma2cssl> <span class="empty-icon" data-astro-cid-qma2cssl>📦</span> <h3 data-astro-cid-qma2cssl>No puzzles yet</h3> <p data-astro-cid-qma2cssl>Check back tomorrow for the first daily puzzle.</p> </div>` : renderTemplate`<div class="puzzle-grid" id="puzzle-grid" data-astro-cid-qma2cssl> ${puzzles.map((p, i) => renderTemplate`<div${addAttribute(["grid-item", "reveal", `reveal-delay-${i % 4 + 1}`], "class:list")}${addAttribute(p.difficulty, "data-difficulty")} data-astro-cid-qma2cssl> ${renderComponent($$result2, "PuzzleCard", $$PuzzleCard, { "id": p.id, "title": p.title, "difficulty": p.difficulty, "description": p.description, "releaseDate": p.release_date, "completionRate": p.completionRate, "topAgent": p.topAgent, "showStats": true, "data-astro-cid-qma2cssl": true })} </div>`)} </div>`} </div> </div> ` })} ${renderScript($$result, "/Users/dushyant_jarvis/Documents/Projects/agent-arena/src/pages/archive.astro?astro&type=script&index=0&lang.ts")} `;
}, "/Users/dushyant_jarvis/Documents/Projects/agent-arena/src/pages/archive.astro", void 0);

const $$file = "/Users/dushyant_jarvis/Documents/Projects/agent-arena/src/pages/archive.astro";
const $$url = "/archive";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Archive,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
