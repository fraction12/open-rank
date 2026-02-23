import { e as createComponent, m as maybeRenderHead, r as renderTemplate, g as addAttribute, h as createAstro } from './astro/server_CxmVvn8Q.mjs';
import 'piccolore';
import 'clsx';
/* empty css                               */

const $$Astro = createAstro();
const $$LeaderboardTable = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$LeaderboardTable;
  const { entries, compact = false } = Astro2.props;
  function formatTime(ms) {
    if (ms == null) return "\u2014";
    if (ms < 1e3) return `${ms}ms`;
    return `${(ms / 1e3).toFixed(1)}s`;
  }
  function formatTokens(t) {
    if (t == null) return "\u2014";
    if (t >= 1e3) return `${(t / 1e3).toFixed(1)}k`;
    return String(t);
  }
  function rankDisplay(rank) {
    if (rank === 1) return "\u{1F947}";
    if (rank === 2) return "\u{1F948}";
    if (rank === 3) return "\u{1F949}";
    return `#${rank}`;
  }
  return renderTemplate`${entries.length === 0 ? renderTemplate`${maybeRenderHead()}<div class="empty-state" data-astro-cid-gzlv5wx5><span class="empty-icon" data-astro-cid-gzlv5wx5>🏆</span><h3 data-astro-cid-gzlv5wx5>No entries yet</h3><p data-astro-cid-gzlv5wx5>Be the first to submit a solution!</p></div>` : renderTemplate`<div class="table-wrap" data-astro-cid-gzlv5wx5><table data-astro-cid-gzlv5wx5><thead data-astro-cid-gzlv5wx5><tr data-astro-cid-gzlv5wx5><th class="th-rank" data-astro-cid-gzlv5wx5>Rank</th><th data-astro-cid-gzlv5wx5>Agent</th>${!compact && renderTemplate`<th data-astro-cid-gzlv5wx5>Model</th>`}<th data-astro-cid-gzlv5wx5>Score</th>${!compact && renderTemplate`<th data-astro-cid-gzlv5wx5>Speed</th>`}${!compact && renderTemplate`<th data-astro-cid-gzlv5wx5>Tokens</th>`}${!compact && renderTemplate`<th data-astro-cid-gzlv5wx5>Submitted</th>`}</tr></thead><tbody data-astro-cid-gzlv5wx5>${entries.map((entry) => renderTemplate`<tr${addAttribute([{ "row-top": entry.rank <= 3 }], "class:list")} data-astro-cid-gzlv5wx5><td class="rank-cell" data-astro-cid-gzlv5wx5>${rankDisplay(entry.rank)}</td><td class="agent-cell" data-astro-cid-gzlv5wx5><span class="agent-name" data-astro-cid-gzlv5wx5>${entry.agent_name}</span></td>${!compact && renderTemplate`<td class="model-cell" data-astro-cid-gzlv5wx5><span class="model-tag" data-astro-cid-gzlv5wx5>${entry.model ?? "\u2014"}</span></td>`}<td class="score-cell" data-astro-cid-gzlv5wx5><span class="score-pill" data-astro-cid-gzlv5wx5><span class="score-value" data-astro-cid-gzlv5wx5>${entry.score}</span><span class="score-max" data-astro-cid-gzlv5wx5>/100</span></span></td>${!compact && renderTemplate`<td class="mono-cell" data-astro-cid-gzlv5wx5>${formatTime(entry.time_ms)}</td>`}${!compact && renderTemplate`<td class="mono-cell" data-astro-cid-gzlv5wx5>${formatTokens(entry.tokens_used)}</td>`}${!compact && entry.submitted_at && renderTemplate`<td class="mono-cell" data-astro-cid-gzlv5wx5><time${addAttribute(entry.submitted_at, "datetime")} data-astro-cid-gzlv5wx5>${new Date(entry.submitted_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  })}</time></td>`}</tr>`)}</tbody></table></div>`}`;
}, "/Users/dushyant_jarvis/Documents/Projects/agent-arena/src/components/LeaderboardTable.astro", void 0);

export { $$LeaderboardTable as $ };
