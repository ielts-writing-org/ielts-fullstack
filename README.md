# IELTS Writing Practice Platform

Practice IELTS Writing Task 1 and Task 2 in a focused editor and get immediate, AI-powered
evaluation and conversational feedback through a streaming chat UX.

## Features

- **Practice creation** - Task 1 (academic visual report, with image upload) and Task 2
  (discursive essay), in `timed` (Task 1: 20 min, Task 2: 40 min) or `free` mode.
- **Writing editor** - separate editors for the task prompt and your response, Harper.js
  grammar/spelling linter (American + British), autosave via SvelteKit remote functions.
- **AI evaluation** - streamed, JSON-schema-constrained evaluation across the four IELTS
  criteria (Task Achievement/Response, Coherence & Cohesion, Lexical Resource, Grammatical
  Range & Accuracy) plus an overall band, with per-criterion checks, problems/advice, and
  "why this band / why not the next".
- **Conversational chat** - follow-up questions grounded in the task context, the evaluation,
  and deterministic writing stats (word count, etc.), streamed over SSE.
- **Dashboard** - resume the previous session, recent sessions, and average band per task and
  criterion compared with your target band.
- **Auth & sessions** - GitHub OAuth via Better Auth, named practice sessions you can rename
  and resume, plus history.
- **Legal** - Terms of Service and Privacy Policy pages.

> The AI band score is an estimate for practice only; it is not an official IELTS result.

## Tech stack

SvelteKit 3 (Svelte 5 runes) on Cloudflare Workers via `@sveltejs/adapter-cloudflare`;
D1 + Drizzle ORM; Better Auth (GitHub OAuth); Tailwind v4 + DaisyUI; Cloudflare Workers AI,
R2, and Images; Harper.js; Vitest + Playwright; ESLint + Prettier.

## Prerequisites

- Node.js `20.19+` or `22.12+` (Node 22 LTS recommended) - required by Vite 8.
- npm.
- A Cloudflare account with D1, KV, R2, **Images** (paid), and Workers AI enabled.
- A GitHub OAuth app (client ID/secret).

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable                                    | Purpose                                                     |
| ------------------------------------------- | ----------------------------------------------------------- |
| `CLOUDFLARE_D1_URL`                         | D1 connection URL (used by `db:generate`).                  |
| `ORIGIN`                                    | Public app origin (Better Auth `baseURL`).                  |
| `BETTER_AUTH_SECRET`                        | Session signing secret (32+ random chars in production).    |
| `BETTER_AUTH_API_KEY`                       | Key for the `@better-auth/infra` `dash`/`sentinel` plugins. |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth credentials.                                   |

## Cloudflare bindings

Declared in `wrangler.jsonc` and read via `import { env } from "cloudflare:workers"`:

| Binding                | Type       | Used for                       |
| ---------------------- | ---------- | ------------------------------ |
| `IELTS_WRITING_DB`     | D1         | Application + auth tables.     |
| `IELTS_WRITING_KV`     | KV         | AI system prompts.             |
| `IELTS_WRITING_BUCKET` | R2         | Stored task images.            |
| `IELTS_WRITING_IMAGES` | Images     | Compressing uploaded images.   |
| `IELTS_WRITING_AI`     | Workers AI | Chat and evaluation inference. |

## KV entries

| Namespace          | Key                                          | Description                                      |
| ------------------ | -------------------------------------------- | ------------------------------------------------ |
| `IELTS_WRITING_KV` | `chat-prompt-1`, `chat-prompt-2`             | System prompt for chat, per task category.       |
| `IELTS_WRITING_KV` | `evaluation-prompt-1`, `evaluation-prompt-2` | System prompt for evaluation, per task category. |

Missing keys throw `ConfigMissingError` at request time.

## Local development

1. Clone the repo and install:

   ```bash
   npm install
   ```

2. Generate worker types:

   ```bash
   npm run gen
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

4. Wait until the app is idle, then create local D1 tables:

   ```bash
   npm run db:push
   ```

5. Add the KV entries with localflare:

   ```bash
   npx localflare attach
   ```

Read more: <https://localflare.dev/docs/cli-attach-mode>

## Commands

| Command                                                        | Description                                                               |
| -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `npm run dev`                                                  | Vite dev server.                                                          |
| `npm run gen`                                                  | Regenerate `worker-configuration.d.ts`.                                   |
| `npm run build`                                                | Type-check worker types, then build.                                      |
| `npm run preview`                                              | Serve the built worker on port 5173.                                      |
| `npm run check`                                                | Typecheck (delete `.svelte-kit` first; it reports stale generated files). |
| `npm run lint` / `lint:fix`                                    | ESLint.                                                                   |
| `npm run format`                                               | Prettier.                                                                 |
| `npm run test:unit` / `test`                                   | Unit (Vitest) / unit + e2e (Playwright).                                  |
| `npm run db:generate` / `db:migrate` / `db:push` / `db:studio` | Drizzle migrations and tooling.                                           |
| `npm run auth:schema`                                          | Regenerate the Better Auth Drizzle schema.                                |
