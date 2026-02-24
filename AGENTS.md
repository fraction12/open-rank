# Repository Guidelines

## Project Structure & Module Organization
- `src/pages/`: Astro pages and API routes. API handlers live under `src/pages/api/**` (for example `src/pages/api/submit.ts`).
- `src/lib/`: shared server/client utilities (Supabase clients, hashing, rate limiting, CORS, CSRF, validation, response helpers).
- `src/components/` and `src/layouts/`: reusable UI blocks and page shell.
- `public/`: static assets (`favicon`, OG images, puzzle files).
- `supabase/migrations/`: SQL migrations applied in order.
- `tests/`: Vitest unit/integration tests (`*.test.ts`).
- `scripts/`: operational/admin scripts (seeding, smoke tests).

## Build, Test, and Development Commands
- `npm run dev`: start local Astro dev server.
- `npm run build`: production build (`dist/` + Vercel adapter output).
- `npm run preview`: preview built output locally.
- `npm run typecheck`: TypeScript checks with CI config (`tsconfig.ci.json`).
- `npm test`: run all Vitest tests once.
- `npm run test:watch`: watch mode for local iteration.
- `npm run smoke`: basic endpoint smoke tests (set `SMOKE_BASE_URL` for deployed env).

## Coding Style & Naming Conventions
- Language: TypeScript (strict Astro config); keep code strongly typed.
- Indentation: 2 spaces; prefer readable early returns in API handlers.
- Filenames: kebab-case for utilities/scripts, dynamic API routes in Astro style (`[id].ts`).
- Tests: colocated under `tests/` with `*.test.ts` suffix.
- Reuse helpers from `src/lib/` instead of duplicating validation, JSON response, or security logic.

## Testing Guidelines
- Framework: Vitest (`node` environment).
- Add tests for every API behavior change, especially auth/CSRF/validation/rate-limit paths.
- Keep deterministic test inputs (use fixed UUIDs and mocked Supabase behavior).
- Run before PR: `npm run typecheck && npm test && npm run build`.

## Commit & Pull Request Guidelines
- Follow existing history style: concise imperative summaries, often with prefixes like `fix:` or `design:`.
- Good format: `fix: validate puzzle_id UUID in submit route`.
- PRs should include:
  - clear scope and risk summary,
  - linked issue (if any),
  - migration notes when `supabase/migrations/` changes,
  - screenshots for UI changes,
  - confirmation that typecheck/tests/build passed.

## Security & Configuration Tips
- Never commit secrets. Use `.env.local` for local development only.
- Required runtime envs include: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANSWER_SALT`.
- For cookie-authenticated write endpoints, include CSRF token (`X-CSRF-Token` or `csrf_token` form field).

## Astro Component Rules (critical — read before touching any component)

### Scoped styles DO NOT apply to dynamically created elements
- Astro scopes `<style>` blocks in `.astro` components by adding a unique attribute (e.g. `data-astro-cid-xxx`) to static template elements only.
- **Any element created via `document.createElement()` at runtime will NOT receive the scoped attribute** — the styles will silently not apply.
- **Rule:** If a component creates DOM elements dynamically in a `<script>` block, its styles MUST go in `src/styles/global.css`, not in a `<style>` block inside the component.
- This applies to: ToastHost, any modal/dialog, dropdown menus, or any JS-driven UI.

### ToastHost specifically
- Toast styles live in `src/styles/global.css` under `/* ── Toast notifications ── */`.
- Do not add a `<style>` block to `ToastHost.astro` — it will not work.
- The `#toast-region` div must be placed **after** `<Footer />` in `Layout.astro` so it renders at body level and isn't clipped by parent overflow.

## Design System Rules (critical — never hardcode colours or spacing)

- **All colours must use CSS variables** from `src/styles/global.css`. Never use hardcoded hex values (`#fee2e2`, `#b91c1c`, `#dbeafe` etc.) anywhere in components or styles.
- Available semantic tokens: `--text`, `--dim`, `--bg`, `--surface`, `--surface-2`, `--border`, `--border-strong`, `--accent`, `--accent-hover`, `--accent-subtle`, `--accent-subtle-border`, `--success`, `--success-subtle`, `--success-subtle-border`, `--warning`, `--warning`, `--warning-subtle`, `--warning-subtle-border`, `--error`, `--error-subtle`, `--error-subtle-border`.
- Use `--radius` and `--radius-sm` for border-radius. Use `--shadow-sm`, `--shadow-md`, `--shadow-lg` for shadows.
- When creating new UI components, check `src/styles/global.css` for existing tokens before inventing new values.
- The design is **light-mode only** with a single dark-mode override (`--row-highlight`). Do not assume dark-mode variants exist for subtle colours.

## Astro-Specific Rules (critical — read before writing any script or auth code)

### Script blocks
- `<script define:vars={{ ... }}>` blocks are compiled as **plain JavaScript** — no TypeScript allowed inside them. Never use `as Type`, `as HTMLElement`, type unions, or any TS syntax. Use plain JS equivalents:
  - ❌ `(el as HTMLMetaElement).content`
  - ✅ `el?.content`
  - ❌ `document.getElementById('x') as HTMLFormElement`
  - ✅ `document.getElementById('x')`
- Regular `<script>` blocks (without `define:vars`) DO support TypeScript — casts are fine there.

### Fetch calls to API routes
- All POST fetch calls must include `'Content-Type': 'application/json'` in headers. Without it, Astro's built-in CSRF middleware treats the request as a form POST and blocks it with 403.
- Always include `'X-CSRF-Token': csrfToken` alongside Content-Type.
- Correct pattern:
  ```js
  fetch('/api/...', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    body: JSON.stringify({ ... }),
  });
  ```

### CSRF token ownership
- The Layout (`src/layouts/Layout.astro`) owns the CSRF token — it calls `ensureCsrfCookie()` and injects `<meta name="csrf-token">`.
- **Never** call `ensureCsrfCookie()` again in individual pages — it can generate a mismatched token and break all CSRF verification.
- Always read the token client-side from the meta tag: `document.querySelector('meta[name="csrf-token"]')?.content ?? ''`

### Signout and auth flows
- Never use native HTML `<form method="POST">` for signout or any auth action — Vercel/Astro blocks cross-site form POSTs with 403. Use `fetch()` instead.

### Vercel + Supabase OAuth
- `request.url` in Vercel serverless functions resolves to an **internal localhost URL**, not the public domain. Never use `new URL(request.url).origin` to build OAuth `redirectTo` URLs.
- The public origin is set in `astro.config.mjs` (`site: 'https://open-rank.com'`) and hardcoded in `src/pages/api/auth/signin.ts`.
- GitHub OAuth App callback URL must point to **Supabase** (`https://<project>.supabase.co/auth/v1/callback`), not our app. Supabase handles the GitHub exchange and then redirects to our `/api/auth/callback`.
