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
