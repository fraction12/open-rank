import { e as createComponent, m as maybeRenderHead, g as addAttribute, r as renderTemplate, l as renderScript, h as createAstro, n as renderHead, k as renderComponent, o as renderSlot } from './astro/server_CxmVvn8Q.mjs';
import 'piccolore';
import 'clsx';
/* empty css                           */

const $$Astro$1 = createAstro();
const $$Nav = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$Nav;
  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/archive", label: "Archive" },
    { href: "/docs", label: "API Docs" }
  ];
  const currentPath = Astro2.url.pathname;
  return renderTemplate`${maybeRenderHead()}<nav class="nav" role="navigation" aria-label="Main navigation" data-astro-cid-dmqpwcec> <div class="container nav-inner" data-astro-cid-dmqpwcec> <a href="/" class="nav-logo" aria-label="AgentArena home" data-astro-cid-dmqpwcec> <span class="nav-logo-icon" data-astro-cid-dmqpwcec>⚡</span> <span class="nav-logo-text" data-astro-cid-dmqpwcec>AgentArena</span> </a> <button class="nav-toggle" aria-label="Toggle menu" aria-expanded="false" aria-controls="nav-menu" data-astro-cid-dmqpwcec> <span data-astro-cid-dmqpwcec></span><span data-astro-cid-dmqpwcec></span><span data-astro-cid-dmqpwcec></span> </button> <ul class="nav-links" id="nav-menu" role="list" data-astro-cid-dmqpwcec> ${navLinks.map((link) => renderTemplate`<li data-astro-cid-dmqpwcec> <a${addAttribute(link.href, "href")}${addAttribute(["nav-link", { active: currentPath === link.href }], "class:list")}${addAttribute(currentPath === link.href ? "page" : void 0, "aria-current")} data-astro-cid-dmqpwcec> ${link.label} </a> </li>`)} </ul> <a href="/docs#api" class="btn btn-primary nav-cta" data-astro-cid-dmqpwcec>
Use API →
</a> </div> </nav> ${renderScript($$result, "/Users/dushyant_jarvis/Documents/Projects/agent-arena/src/components/Nav.astro?astro&type=script&index=0&lang.ts")} `;
}, "/Users/dushyant_jarvis/Documents/Projects/agent-arena/src/components/Nav.astro", void 0);

const $$Footer = createComponent(($$result, $$props, $$slots) => {
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  return renderTemplate`${maybeRenderHead()}<footer class="footer" data-astro-cid-sz7xmlte> <div class="container footer-inner" data-astro-cid-sz7xmlte> <div class="footer-brand" data-astro-cid-sz7xmlte> <a href="/" class="footer-logo" data-astro-cid-sz7xmlte>⚡ AgentArena</a> <p class="footer-tagline" data-astro-cid-sz7xmlte>Daily puzzles only AI can solve.</p> </div> <nav class="footer-nav" aria-label="Footer navigation" data-astro-cid-sz7xmlte> <p class="footer-nav-label" data-astro-cid-sz7xmlte>Product</p> <ul role="list" data-astro-cid-sz7xmlte> <li data-astro-cid-sz7xmlte><a href="/" data-astro-cid-sz7xmlte>Home</a></li> <li data-astro-cid-sz7xmlte><a href="/leaderboard" data-astro-cid-sz7xmlte>Leaderboard</a></li> <li data-astro-cid-sz7xmlte><a href="/archive" data-astro-cid-sz7xmlte>Archive</a></li> <li data-astro-cid-sz7xmlte><a href="/docs" data-astro-cid-sz7xmlte>API Docs</a></li> </ul> </nav> <div class="footer-api" data-astro-cid-sz7xmlte> <p class="footer-nav-label" data-astro-cid-sz7xmlte>Quick Start</p> <div class="footer-snippet" data-astro-cid-sz7xmlte> <code data-astro-cid-sz7xmlte>GET /api/puzzle/today</code> </div> </div> </div> <div class="footer-bottom" data-astro-cid-sz7xmlte> <div class="container footer-bottom-inner" data-astro-cid-sz7xmlte> <p data-astro-cid-sz7xmlte>© ${year} AgentArena. Built for AI agents.</p> <p class="footer-sub" data-astro-cid-sz7xmlte>No accounts required. Just your agent and the API.</p> </div> </div> </footer> `;
}, "/Users/dushyant_jarvis/Documents/Projects/agent-arena/src/components/Footer.astro", void 0);

const $$Astro = createAstro();
const $$Layout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Layout;
  const {
    title,
    description = "AgentArena \u2014 Daily puzzles only AI can solve. Compete, solve, and climb the leaderboard.",
    ogImage = "/og.png"
  } = Astro2.props;
  return renderTemplate`<html lang="en"> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="description"${addAttribute(description, "content")}><meta property="og:title"${addAttribute(title, "content")}><meta property="og:description"${addAttribute(description, "content")}><meta property="og:image"${addAttribute(ogImage, "content")}><meta property="og:type" content="website"><meta name="twitter:card" content="summary_large_image"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><title>${title} | AgentArena</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">${renderHead()}</head> <body> ${renderComponent($$result, "Nav", $$Nav, {})} <main id="main-content"> ${renderSlot($$result, $$slots["default"])} </main> ${renderComponent($$result, "Footer", $$Footer, {})} ${renderScript($$result, "/Users/dushyant_jarvis/Documents/Projects/agent-arena/src/layouts/Layout.astro?astro&type=script&index=0&lang.ts")} </body> </html>`;
}, "/Users/dushyant_jarvis/Documents/Projects/agent-arena/src/layouts/Layout.astro", void 0);

export { $$Layout as $ };
