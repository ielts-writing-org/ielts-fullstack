# AGENTS.md

IELTS Writing practice platform: SvelteKit 3 (Svelte 5 runes) on Cloudflare Workers — D1 + Drizzle, Better Auth (GitHub OAuth), DaisyUI/Tailwind v4, Upstash Redis (rate limiting; Better Auth secondary storage in prod), Workers AI for streaming chat/evaluation feedback.

## Commands

Use the `package.json` scripts; never call the `wrangler` or `svelte-kit` CLIs directly (including `npx wrangler d1 execute`).

- `npm run dev` - starts THREE processes via concurrently: `dev:app` (Vite), `dev:redis` (redis-memory-server, port 6379), `dev:urs` (local Upstash REST server, port 6378, token `local`). The dev scripts use Windows `SET` syntax (cmd-only).
- `npm run gen` - regenerate `worker-configuration.d.ts` (`wrangler types`). `build` and `check` run `wrangler types --check` first and fail if it is stale.
- `npm run build` - `wrangler types --check && vite build`.
- `npm run preview` - serves the built worker: `wrangler dev .svelte-kit/cloudflare/_worker.js --port 5173`.
- `npm run check` - typecheck. Known issue: it reports many errors from stale generated files under `.svelte-kit/output` and `.svelte-kit/cloudflare`; `src/` itself is clean. Delete `.svelte-kit` and re-run before trusting output.
- `npm run lint` / `npm run lint:fix`, `npm run format` (Prettier).
- `npm run test:unit -- --run <filter>` - one unit test; `npm run test:unit` alone is watch mode; `npm run test` runs unit then Playwright e2e (`test:e2e` runs `playwright install` first).
- DB scripts (`db:generate`, `db:push`, `db:migrate`, `db:studio`) resolve the local D1 SQLite file under `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite` and fail with "Cannot find the SQLite database file" until the local DB is initialized (run `dev` first, then `db:push`). Migrations live in `drizzle/` (`migrations_dir` set in `wrangler.jsonc`) - do not hand-edit. `npm run auth:schema` regenerates `src/lib/server/db/auth.schema.ts` (config: `src/lib/server/auth/cli.ts`). Note: `db:migrate:remote` is broken (typo `wranger`) - apply remote migrations manually.
- No deploy script; deploy manually with Wrangler.

## Agent workflow rules (user-enforced)

- Leave git operations (including `git status`), formatting/lint fixes, and line-ending fixes to the user. Do not run `npm run build` just to verify changes after coding.
- Prefer dedicated tools over shell commands; package.json scripts and MCP tools over ad-hoc commands (never `npx svelte-kit sync` directly).
- On this Windows machine, `better-sqlite3` (drizzle-kit dep) fails node-gyp: install with `npm ci --ignore-scripts --no-audit --no-fund`.

## Setup

- Node 20.19+ or 22.12+ (required by Vite 8).
- Env vars from `.env` (see `.env.example`): `ORIGIN`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_API_KEY`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `UPSTASH_REDIS_REST_URL`/`_TOKEN` (local dev: `http://localhost:6378` / `local`), `RATE_LIMIT_TOKENS`, `RATE_LIMIT_WINDOW`.
- Setup order (per README): `npm install` -> `npm run gen` -> `npm run dev` -> wait for idle -> `npm run db:push` (creates local D1 tables) -> `npx localflare attach` to set the KV prompt entries.

## Architecture

- There is no `svelte.config.js`: the SvelteKit config lives inline in `vite.config.ts` (adapter-cloudflare, forced runes mode outside `node_modules`, `experimental.async`, `experimental.remoteFunctions`).
- Import alias `#lib/*` -> `src/lib/*` (root `package.json` `imports`). Bare `#lib` maps to a nonexistent `src/lib/index.js`; always use a subpath.
- Cloudflare bindings are read at runtime via `import { env } from "cloudflare:workers"` (`IELTS_WRITING_DB`, `_KV`, `_BUCKET`, `_AI`, `_IMAGES`). `worker-configuration.d.ts` is generated; never edit it. The AI binding is `"remote": true` (Workers AI runs remotely even in local dev).
- App env vars are declared in `src/env.ts` (`defineEnvVars` with zod schemas) and imported from `$app/env/private` or `$app/env/public`, not `$env/static/*`.
- Server layering is ports-and-adapters: `src/lib/server/infrastructure/*` defines `*.port.ts` interfaces plus `*.cf.ts` Cloudflare adapters; AI routes construct the `Cf*` clients and pass them into handler classes.
- Auth (`src/lib/server/auth/`): `hooks.server.ts` builds a per-request instance with `createAuth(env.IELTS_WRITING_DB)` and sets `event.locals.auth` plus `locals.session/user/profile` (the hook fetches the `profiles` row; missing -> 500). Use `getPageSession(locals)` (307 redirect to sign-in) in loads and `getApiSession(locals)` (401) in API/remote handlers. `sveltekitCookies(getRequestEvent)` must stay the LAST auth plugin. `auth/cli.ts` exports `auth` for CLI schema generation only.
- Redis (`src/lib/server/redis.ts`): dev uses the local URS REST server, prod uses `RedisCF.fromEnv()`. Better Auth `secondaryStorage` is Redis only in production (`dev ? undefined : redisSecondaryStorage`); Better Auth's own rate limiting stores in secondary storage. App-level `rateLimit(identifier)` (`rate-limit.ts`, Upstash sliding window) throws 429.
- Mutations use SvelteKit remote functions organized by kind in `src/lib/remotes/command|form|query/*.remote.ts` (`command`/`form`/`query` + `getRequestEvent` from `$app/server`, zod input schemas) with an ownership check - not form actions. Query remotes can push cache updates (`getProfile().set(...)`).
- AI chat/evaluate are POST `+server.ts` handlers returning `text/event-stream`; order: `rateLimit(getClientAddress())` -> `getApiSession(locals)` -> zod parse -> construct clients -> handler class.
- Routes: `(protected)` requires a session, `(public)` is open. Typed route params are in `src/params.ts` (`practiceSessionId`, `taskId` must be UUIDv7; `taskCategory` is `1|2`).
- AI prompts come from KV keyed `chat-prompt-<category>` / `evaluation-prompt-<category>` (`src/lib/server/infrastructure/config-provider/`), where `<category>` is `1` or `2`. Missing keys throw `ConfigMissingError`.

## D1 / Drizzle gotchas

- D1 has no interactive transactions: `db.transaction()` throws and `db.batch()` is not atomic. Get atomicity from a single raw SQL statement.
- Always get the DB via `getDb(d1)` - it attaches the merged `{ ...authSchema, ...appSchema }` schema that Better Auth's drizzleAdapter relies on; a bare `drizzle(d1)` breaks it.
- Prefer plain `.values()` inserts plus an explicit ownership pre-check (see `src/lib/remotes/command/save-evaluation.remote.ts`). Avoid `insert().select()`: it validates selected columns against the table definition (name and order) and drops client `$defaultFn` ids, causing NOT NULL failures on `id`.
- Table convention (`src/lib/server/db/common.ts`): `withBaseColumns` adds a UUIDv7 `id` (`$defaultFn`), millisecond timestamps with a SQL `now` default and `$onUpdate`, plus a nullable `deletedAt`.

## Conventions

- Prettier: tabs, `printWidth` 100, `bracketSameLine`.
- Tailwind v4 + DaisyUI are configured in `src/routes/layout.css` (no `tailwind.config`); ESLint checks canonical Tailwind classes against that file.
- Vitest projects: `client` (`*.svelte.test.ts`, real chromium via Playwright, excludes `src/lib/server`) and `server` (node, all other tests); `expect.requireAssertions` is on. Playwright e2e matches `**/*.e2e.{ts,js}` (none exist yet); its `webServer` builds and previews on port 5173.
- `.kilo/kilo.jsonc` enables Svelte, DaisyUI, and Better Auth MCP servers; prefer them for framework docs. Repo agents/skills live in `.kilo/`.
- Design/spec docs live in `docs/<use-case>/` with Vietnamese folder names: `act.puml` activity diagram, plus `seq.puml` sequence diagram where written; keep both consistent with each other and with the code.
