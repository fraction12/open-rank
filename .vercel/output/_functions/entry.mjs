import { renderers } from './renderers.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_Cc0BM9Ip.mjs';
import { manifest } from './manifest_DRLAKLV7.mjs';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/api/leaderboard/_puzzleid_.astro.mjs');
const _page2 = () => import('./pages/api/leaderboard.astro.mjs');
const _page3 = () => import('./pages/api/puzzle/today.astro.mjs');
const _page4 = () => import('./pages/api/puzzle/_id_.astro.mjs');
const _page5 = () => import('./pages/api/submit.astro.mjs');
const _page6 = () => import('./pages/archive.astro.mjs');
const _page7 = () => import('./pages/docs.astro.mjs');
const _page8 = () => import('./pages/leaderboard.astro.mjs');
const _page9 = () => import('./pages/puzzle/_id_.astro.mjs');
const _page10 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/api/leaderboard/[puzzleId].ts", _page1],
    ["src/pages/api/leaderboard/index.ts", _page2],
    ["src/pages/api/puzzle/today.ts", _page3],
    ["src/pages/api/puzzle/[id].ts", _page4],
    ["src/pages/api/submit.ts", _page5],
    ["src/pages/archive.astro", _page6],
    ["src/pages/docs.astro", _page7],
    ["src/pages/leaderboard.astro", _page8],
    ["src/pages/puzzle/[id].astro", _page9],
    ["src/pages/index.astro", _page10]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./noop-entrypoint.mjs'),
    middleware: () => import('./_noop-middleware.mjs')
});
const _args = {
    "middlewareSecret": "0f8a207e-cf90-4d28-8177-9800ce3230ab",
    "skewProtection": false
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) ;

export { __astrojsSsrVirtualEntry as default, pageMap };
