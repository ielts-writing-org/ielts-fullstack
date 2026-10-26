# AGENTS.md

IELTS Writing practice platform: SvelteKit 3 (Svelte 5 runes) deployed to Cloudflare Workers, D1 + Drizzle, Better Auth (GitHub OAuth), DaisyUI/Tailwind v4, and Workers AI for streaming chat/evaluation feedback.

## Commands

Use the `package.json` scripts; do not run `npx svelte-kit sync`, `npx wrangler types`, etc. directly.

- `npm run dev` - Vite dev server.
- `npm run gen` - regenerate `worker-configuration.d.ts` (`wrangler types`). `build` and `check` run `wrangler types --check` first and fail if it is stale.
- `npm run build` - `wrangler types --check && vite build`.
- `npm run preview` - serves the built worker: `wrangler dev .svelte-kit/cloudflare/_worker.js --port 5173`.
- `npm run check` - typecheck. Known issue: it reports many errors from stale generated files under `.svelte-kit/output` and `.svelte-kit/cloudflare`; `src/` itself is clean. Delete `.svelte-kit` and re-run before trusting output.
- `npm run lint` / `npm run lint:fix`, `npm run format` (Prettier).
- `npm run test:unit -- --run <filter>` - one unit test; `npm run test:unit` alone is watch mode; `npm run test` runs unit then Playwright e2e.
- DB: `npm run db:generate` (requires `CLOUDFLARE_D1_URL`), `db:migrate`, `db:push`, `db:studio`. Migrations live in `drizzle/` (`migrations_dir` set in `wrangler.jsonc`) - do not hand-edit. `npm run auth:schema` regenerates `src/lib/server/db/auth.schema.ts`.
- No deploy script; deploy manually with Wrangler.

## Setup

- Env vars from `.env` (see `.env.example`): `CLOUDFLARE_D1_URL`, `ORIGIN`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_API_KEY`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`.
- Setup order (per README): `npm install` -> `npm run gen` -> `npm run dev` -> wait for idle -> `npm run db:push` (creates local D1 tables) -> `npx localflare attach` to set the KV prompt entries.

## Architecture

- There is no `svelte.config.js`: the SvelteKit config lives inline in `vite.config.ts` (adapter-cloudflare, forced runes mode outside `node_modules`, `experimental.async`, `experimental.remoteFunctions`).
- Import alias `#lib/*` -> `src/lib/*` (root `package.json` `imports`). Bare `#lib` maps to a nonexistent `src/lib/index.js`; always use a subpath.
- Cloudflare bindings are read at runtime via `import { env } from "cloudflare:workers"` (`IELTS_WRITING_DB`, `_KV`, `_BUCKET`, `_AI`, `_IMAGES`). `worker-configuration.d.ts` is generated; never edit it.
- App env vars are declared in `src/env.ts` (`defineEnvVars`) and imported from `$app/env/private` or `$app/env/public`, not `$env/static/*`.
- Auth (`src/lib/server/auth.ts`): build a per-request instance with `createAuth(d1)` and use `event.locals.auth`. The exported `auth` is for CLI schema generation only. Use `getSession` (redirects to sign-in) in loads and `getSessionApi` (throws 401) in API/remote handlers.
- Mutations use SvelteKit remote functions (`command`/`form` in `*.remote.ts`, imported from `$app/server`) plus an ownership check - not form actions. AI chat/evaluate are `+server.ts` handlers returning `text/event-stream`.
- Routes: `(protected)` requires a session, `(public)` is open. Typed route params are in `src/params.ts` (`practiceSessionId` must be UUIDv7, `taskCategory` is `1|2`).
- AI prompts come from KV keyed `chat-prompt-<category>` / `evaluation-prompt-<category>` (`src/lib/server/infrastructure/config-provider.ts`), where `<category>` is `1` or `2`. Missing keys throw `ConfigMissingError`.

## D1 / Drizzle gotchas

- D1 has no interactive transactions: `db.transaction()` throws and `db.batch()` is not atomic. Get atomicity from a single raw SQL statement.
- Prefer plain `.values()` inserts plus an explicit ownership pre-check (see `evaluate/save-evaluation.remote.ts`). Avoid `insert().select()`: it validates selected columns against the table definition (name and order) and drops client `$defaultFn` ids, causing NOT NULL failures on `id`.
- Pass `schema: { ...authSchema, ...appSchema }` explicitly to the Better Auth drizzle adapter; `db._.fullSchema` is otherwise undefined.
- Table convention (`src/lib/server/db/common.ts`): `withBaseColumns` adds a UUIDv7 `id` (`$defaultFn`), millisecond timestamps with a SQL `now` default and `$onUpdate`.

## Conventions

- Prettier: tabs, `printWidth` 100, `bracketSameLine`. Run `npm run format`.
- Tailwind v4 + DaisyUI are configured in `src/routes/layout.css` (no `tailwind.config`); ESLint checks canonical Tailwind classes against that file.
- Vitest projects: `client` (`*.svelte.test.ts`, real chromium via Playwright, excludes `src/lib/server`) and `server` (node, all other tests); `expect.requireAssertions` is on. Playwright e2e matches `**/*.e2e.{ts,js}` (none exist yet); its config waits on port 4173 while `npm run preview` serves 5173.
- `.kilo/kilo.jsonc` enables Svelte, DaisyUI, and Better Auth MCP servers; prefer them for framework docs. Repo agents/skills live in `.kilo/`.
- Design/spec docs are PlantUML activity diagrams under `docs/` (Vietnamese filenames).
