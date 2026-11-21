# AGENTS.md

IELTS Writing practice platform: SvelteKit 3 (Svelte 5 runes) on Cloudflare Workers — D1 + Drizzle, Better Auth (GitHub OAuth + email/password), DaisyUI/Tailwind v4, Workers AI for streamed chat/evaluation feedback. No Redis/Upstash, no KV: rate limiting uses Workers rate-limit bindings, and all config (AI prompts/settings) lives in D1.

## Commands

Use the `package.json` scripts; never call the `wrangler` or `svelte-kit` CLIs directly (including `npx wrangler d1 execute`).

- `npm run dev` - single Vite dev server (local D1/R2/Images/rate-limit bindings are simulated by miniflare; the AI binding is `"remote": true`, so Workers AI calls run remotely).
- `npm run gen` - regenerate `worker-configuration.d.ts` (`wrangler types`). Required after any `wrangler.jsonc` change: `build` and `check` run `wrangler types --check` first and fail if it is stale.
- `npm run check` - typecheck. Known issue: it reports many errors from stale generated files under `.svelte-kit/output` and `.svelte-kit/cloudflare`; `src/` itself is clean. Delete `.svelte-kit` and re-run before trusting output.
- `npm run build` - `wrangler types --check && vite build`. `npm run preview` serves the built worker on port 5173 (`preview:e2e` additionally uses `--persist-to .wrangler/state/e2e`).
- `npm run lint` / `npm run lint:fix` (ESLint), `npm run format` (Prettier).
- `npm run test:unit -- --run <filter>` - run one unit test file/pattern; `npm run test:unit` alone is watch mode. `npm run test:e2e` runs Playwright (`playwright install` first); `npm run test` runs unit then e2e.
- DB scripts (`db:generate`, `db:push`, `db:migrate`, `db:studio`) resolve the local D1 SQLite file under `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite` and fail with "Cannot find the SQLite database file" until the local DB is initialized (run `dev` first, then `db:push`). Migrations live in `drizzle/` (`migrations_dir` set in `wrangler.jsonc`) - do not hand-edit. `npm run auth:schema` regenerates `src/lib/server/db/auth.schema.ts` (config: `src/lib/server/auth/cli.ts`). `db:migrate:remote` applies remote migrations.
- No deploy script; deploy manually with Wrangler.

## Agent workflow rules (user-enforced)

- Leave git operations (including `git status`), formatting/lint fixes, and line-ending fixes to the user. Do not run `npm run build` just to verify changes after coding.
- Prefer dedicated tools over shell commands; package.json scripts and MCP tools over ad-hoc commands (never `npx svelte-kit sync` directly).
- On this Windows machine, `better-sqlite3` (drizzle-kit dep) fails node-gyp: install with `npm ci --ignore-scripts --no-audit --no-fund`.

## Setup

- Node 20.19+ or 22.12+ (required by Vite 8).
- Env vars from `.env` (see `.env.example`): `ORIGIN`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_API_KEY`, `GITHUB_CLIENT_ID`/`_SECRET`, `R2_ENDPOINT`, `SMTP_SERVER`/`_USER`/`_PASSWORD`, `ROOT_ADMIN_EMAIL`.
- Setup order (per README): `npm install` -> `npm run gen` -> `npm run dev` -> wait for idle -> `npm run db:push` (creates local D1 tables); then sign in with the `ROOT_ADMIN_EMAIL` account and configure AI prompts in Admin -> AI Configuration (stored in D1 `ai_settings`).

## Architecture

- There is no `svelte.config.js`: the SvelteKit config lives inline in `vite.config.ts` (adapter-cloudflare, runes mode forced outside `node_modules`, `experimental.async`, `experimental.remoteFunctions`). The Vitest config is in the same file.
- Import alias `#lib/*` -> `src/lib/*` (root `package.json` `imports`). Bare `#lib` maps to a nonexistent `src/lib/index.js`; always use a subpath.
- Cloudflare bindings are read at runtime via `import { env } from "cloudflare:workers"` (`IELTS_WRITING_DB`, `_BUCKET`, `_AI`, `_IMAGES`, `CHAT_RATE_LIMITER`, `EVALUATE_RATE_LIMITER`). `worker-configuration.d.ts` is generated; never edit it.
- App env vars are declared in `src/env.ts` (`defineEnvVars`) and imported from `$app/env/private` or `$app/env/public`, not `$env/static/*`.
- `src/lib/server/bindings/*` are plain concrete modules wrapping each Cloudflare service (no ports-and-adapters split, no handler classes).
- Auth (`src/lib/server/auth/`): `hooks.server.ts` builds a per-request instance with `createAuth(env.IELTS_WRITING_DB)` and sets `event.locals.auth` plus `locals.session/user` (no profile fetch; profiles are read via the `getProfile` remote). Use `getPageSession(locals)` (307 redirect to sign-in) in loads, `getApiSession(locals)` (401) in API/remote handlers, and `getAdminSession(locals)` (403; also checks ban state) for admin remotes. `ROOT_ADMIN_EMAIL` grants the `admin` role at sign-up (exact, case-sensitive match). `sveltekitCookies(getRequestEvent)` must stay the LAST auth plugin. `auth/cli.ts` exports `auth` for CLI schema generation only.
- Rate limiting: `rateLimit(identifier, getRateLimiter("chat" | "evaluate"))` uses the Workers rate-limit bindings and throws 429. The AI routes key on `user.id` (not client IP).
- Mutations use SvelteKit remote functions organized by kind in `src/lib/remotes/command|form|query/*.remote.ts` (`command`/`form`/`query` + `getRequestEvent` from `$app/server`, zod input schemas) with an ownership check - not form actions. Commands can push query-cache updates (`saveBandTarget` -> `getProfile().set(updatedProfile)`).
- AI chat/evaluate are POST `+server.ts` handlers returning `text/event-stream`; order: `getApiSession(locals)` -> `rateLimit(user.id, ...)` -> validate/load session + task image from D1/R2 -> `reserveAiRequest` (single-statement atomic daily-quota reservation in `ai-telemetry.ts`) -> `getAiCompletionAsStream` -> `Response(trackAiStream(...))`.
- Routes: `(protected)` requires a session, `(public)` is open. Typed route params are in `src/params.ts` (`practiceSessionId` must be UUIDv7; `imageName` must be `<uuidv7>.webp`).
- AI prompts and runtime settings (models, temperature, daily quotas) come from the D1 `ai_settings` table keyed `chat-prompt-<category>` / `evaluation-prompt-<category>` plus runtime keys (`src/lib/server/ai-settings.ts`), where `<category>` is `1` or `2`. Missing or empty prompts throw at request time; admins edit them in Admin -> AI Configuration (`saveAdminPrompt` upserts into `ai_settings`).
- `src/lib/components/Modal.svelte` is mounted once in the root `+layout.svelte` (modals survive navigation) and keeps a STACK of modal config snapshots: use its `openModal`/`closeModal` exports; do not mount dialogs ad hoc.

## D1 / Drizzle gotchas

- D1 has no interactive transactions: `db.transaction()` throws and `db.batch()` is sequential auto-commit, not ACID. Get atomicity from a single raw SQL statement (see `reserveAiRequest`'s `INSERT ... SELECT ... WHERE`).
- Always get the DB via `getDb(d1)` / `getDatabase()` - they attach the merged relations (`app.relations` + `auth.schema` relations) that Better Auth's drizzleAdapter and `db.query.*` rely on; a bare `drizzle(d1)` breaks them.
- Prefer plain `.values()` inserts plus an explicit ownership pre-check (see `src/lib/remotes/command/save-evaluation.remote.ts`). Avoid `insert().select()`: it validates selected columns against the table definition (name and order) and drops client `$defaultFn` ids, causing NOT NULL failures on `id`.
- Table convention (`src/lib/server/db/common.ts`): `withBaseColumns` adds a UUIDv7 `id` (`$defaultFn`), millisecond timestamps with a SQL `now` default and `$onUpdate`, plus a nullable `deletedAt`.

## Conventions

- Prettier: tabs, `printWidth` 100, `trailingComma: none`, `bracketSameLine`.
- Tailwind v4 + DaisyUI are configured in `src/routes/layout.css` (no `tailwind.config`); ESLint checks canonical Tailwind classes against that file. Opacity modifiers are restricted to one shared scale (`/5`, `/10`, `/20`, `/25`, `/50`, `/60`, `/75` - table in README.md); prefer flexbox over grid and avoid arbitrary bracket values except CSS vars.
- Vitest projects (defined in `vite.config.ts`): `client` (`*.svelte.test.ts`, real headless chromium via Playwright provider, excludes `src/lib/server`) and `server` (node, everything else); `expect.requireAssertions` is on.
- Playwright e2e matches `**/*.e2e.{ts,js}`, runs with `workers: 1`, and its `webServer` runs `npm run build && npm run preview:e2e` on port 5173. `global-setup` seeds the e2e D1 file via `resetSeedData()`; specs that mutate data re-seed in `beforeEach`. `login()` signs a session cookie using `BETTER_AUTH_SECRET` from `.env`. AI endpoints are intercepted in specs with canned SSE streams (`interceptChatStream`/`interceptEvaluateStream`), so AI prompt/config code is not exercised by e2e.
- `.kilo/kilo.jsonc` enables Svelte, DaisyUI, Better Auth, and dbhub (local SQLite) MCP servers; prefer them for framework docs. Repo agents/skills live in `.kilo/`.
- Design/spec docs live in `docs/` as `<use-case>.act.puml` / `<use-case>.seq.puml` (dotted naming, Vietnamese use-case names); keep act and seq diagrams consistent with each other and with the code. User-enforced diagram rules: never include auth/session-check self-calls in seq diagrams; `label` lines in act diagrams are deliberate visual-alignment anchors - never remove them; hoist tails shared by if/else branches out after `endif`; every alternative flow from the use case spec table must appear as a branch in the act diagram.
