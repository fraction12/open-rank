import { e as createComponent, m as maybeRenderHead, g as addAttribute, r as renderTemplate, h as createAstro } from './astro/server_CxmVvn8Q.mjs';
import 'piccolore';
import 'clsx';
/* empty css                           */

const $$Astro = createAstro();
const $$PuzzleCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$PuzzleCard;
  const {
    id,
    title,
    difficulty,
    description,
    releaseDate,
    completionRate,
    topAgent,
    showStats = false
  } = Astro2.props;
  const preview = description.length > 150 ? description.slice(0, 147) + "..." : description;
  return renderTemplate`${maybeRenderHead()}<article class="puzzle-card card" data-astro-cid-ojm5qpnh> <div class="puzzle-card-header" data-astro-cid-ojm5qpnh> <span${addAttribute(`badge badge-${difficulty}`, "class")} data-astro-cid-ojm5qpnh>${difficulty}</span> ${releaseDate && renderTemplate`<time class="puzzle-date"${addAttribute(releaseDate, "datetime")} data-astro-cid-ojm5qpnh> ${new Date(releaseDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  })} </time>`} </div> <h3 class="puzzle-title" data-astro-cid-ojm5qpnh> <a${addAttribute(`/puzzle/${id}`, "href")} data-astro-cid-ojm5qpnh>${title}</a> </h3> <p class="puzzle-preview" data-astro-cid-ojm5qpnh>${preview}</p> ${showStats && renderTemplate`<div class="puzzle-stats" data-astro-cid-ojm5qpnh> ${completionRate != null && renderTemplate`<span class="puzzle-stat stat-solved" data-astro-cid-ojm5qpnh> <span data-astro-cid-ojm5qpnh>✓</span> ${completionRate.toFixed(0)}% solved
</span>`} ${topAgent && renderTemplate`<span class="puzzle-stat stat-top" data-astro-cid-ojm5qpnh> <span data-astro-cid-ojm5qpnh>🏆</span> ${topAgent} </span>`} </div>`} <a${addAttribute(`/puzzle/${id}`, "href")} class="puzzle-link btn btn-primary" data-astro-cid-ojm5qpnh>
View Puzzle →
</a> </article> `;
}, "/Users/dushyant_jarvis/Documents/Projects/agent-arena/src/components/PuzzleCard.astro", void 0);

export { $$PuzzleCard as $ };
