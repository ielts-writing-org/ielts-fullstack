# IELTS Writing Practice Platform

Practice IELTS Writing Task 1 and Task 2 in a focused editor and get immediate, AI-powered
evaluation and conversational feedback through a streaming chat UX.

## Prerequisites

- Node.js `20.19+` or `22.12+` (Node 22 LTS recommended) - required by Vite 8.
- npm.
- A Cloudflare account with D1, KV, R2, Images, and Workers AI enabled.
- A GitHub OAuth app (client ID/secret).

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable                                              | Purpose                                                     |
| ----------------------------------------------------- | ----------------------------------------------------------- |
| `ORIGIN`                                              | Public app origin (Better Auth `baseURL`).                  |
| `BETTER_AUTH_SECRET`                                  | Session signing secret (32+ random chars in production).    |
| `BETTER_AUTH_API_KEY`                                 | Key for the `@better-auth/infra` `dash`/`sentinel` plugins. |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`           | GitHub OAuth credentials.                                   |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Upstash redis.                                              |
| `RATE_LIMIT_TOKENS` / `RATE_LIMIT_WINDOW`             | Rate limit settings.                                        |

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
   npm install --ignore-scripts
   ```

2. If it didn't generate worker types, run:

   ```bash
   npm run gen
   ```

3. Run this once to download Redis:

   ```bash
   npm run dev:redis
   ```

4. Wrangler requires to be run in interactive mode so you will have to run it once then sign in to your Cloudflare account:

   ```bash
   npm run dev:app
   ```

5. Stop `dev:redis` and `dev:app` and start this instead of manually run all dev scripts:

   ```bash
   npm run dev
   ```

6. Wait until the app is idle, then create local D1 tables:

   ```bash
   npm run db:push
   ```

7. Add the KV entries with localflare:

   ```bash
   npx localflare attach
   ```

   Read more: <https://localflare.dev/docs/cli-attach-mode>
