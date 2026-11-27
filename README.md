# IELTS Writing Practice Platform

Practice IELTS Writing Task 1 and Task 2 in a focused editor and get immediate, AI-powered
evaluation and conversational feedback through a streaming chat UX.

## Prerequisites

- Node.js `22.12+`
- npm.
- A Cloudflare account.
- A GitHub OAuth app (client ID/secret).

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable                                    | Purpose                                                     |
| ------------------------------------------- | ----------------------------------------------------------- |
| `ORIGIN`                                    | Public app origin (Better Auth `baseURL`).                  |
| `BETTER_AUTH_SECRET`                        | Session signing secret (32+ random chars in production).    |
| `BETTER_AUTH_API_KEY`                       | Key for the `@better-auth/infra` `dash`/`sentinel` plugins. |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth credentials.                                   |
| `R2_ENDPOINT`                               | Public URL of the R2 bucket used to build image URLs.       |
| `SMTP_SERVER`                               | SMTP host for sending authentication emails.                |
| `SMTP_USER`                                 | SMTP username for sending authentication emails.            |
| `SMTP_PASSWORD`                             | SMTP password for sending authentication emails.            |
| `ROOT_ADMIN_EMAIL`                          | Email granted the `admin` role on sign-up.                  |

## Cloudflare bindings

Declared in `wrangler.jsonc` and read via `import { env } from "cloudflare:workers"`:

| Binding                 | Type               | Used for                                      |
| ----------------------- | ------------------ | --------------------------------------------- |
| `IELTS_WRITING_DB`      | D1                 | Application + auth tables.                    |
| `IELTS_WRITING_BUCKET`  | R2                 | Stored task images.                           |
| `IELTS_WRITING_IMAGES`  | Images             | Compressing uploaded images.                  |
| `IELTS_WRITING_AI`      | Workers AI         | Chat and evaluation inference.                |
| `CHAT_RATE_LIMITER`     | Workers Rate Limit | Rate limiting chat requests (3 per minute).   |
| `EVALUATE_RATE_LIMITER` | Workers Rate Limit | Rate limiting evaluation requests (1/minute). |

## Local development

1. Clone the repo and install:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in the variables listed above.

3. If it didn't generate worker types, run:

   ```bash
   npm run gen
   ```

4. The first start of local development will ask you to sign in to your Cloudflare account:

   ```bash
   npm run dev
   ```

5. Wait until the app is idle, then create local D1 tables:

   ```bash
   npm run db:push
   ```

6. Sign in with the `ROOT_ADMIN_EMAIL` account and configure the AI system prompts under
   Admin → AI Configuration (stored in the `ai_settings` table).
