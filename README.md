# IELTS Writing Practice Platform

Practice IELTS Writing Task 1 and Task 2 in a focused editor and get immediate, AI-powered
evaluation and conversational feedback through a streaming chat UX.

## Prerequisites

- Node.js `20.19+` or `22.12+` (Node 22 LTS recommended) - required by Vite 8.
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

## Opacity modifiers

Tailwind color opacity modifiers (`bg-primary/5`, `text-base-content/75`, ...) are restricted to a
single shared scale. Do not introduce other values (no `/15`, `/30`, `/40`, `/70`, `/80`, `/90`).

| Value | Role                                                                                                                               |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `/5`  | Soft tinted fills (selected-state washes like `bg-primary/5`).                                                                     |
| `/10` | Hairline borders, dividers, and soft fills on colored elements (`bg-primary/10` icon chips).                                       |
| `/20` | Default card borders.                                                                                                              |
| `/25` | Disabled / placeholder icons (empty-state icons).                                                                                  |
| `/50` | Tertiary text, metadata, timestamps; soft neutral fills (`bg-base-200/50`). Not body text - fails WCAG 4.5:1 on light backgrounds. |
| `/60` | Muted secondary text (auxiliary/large text only).                                                                                  |
| `/75` | Standard secondary text - lowest tier that reliably passes AA on `base-100`.                                                       |

Never use the element-level `opacity-*` utility for text (it is inherited by children); always use
the color slash modifier. Frosted-glass surfaces (`/80` + `backdrop-blur`) are the only exception -
keep them in a dedicated component.

## Local development

1. Clone the repo and install:

   ```bash
   npm install --ignore-scripts
   ```

2. If it didn't generate worker types, run:

   ```bash
   npm run gen
   ```

3. The first start of local development will ask you to sign in to your Cloudflare account:

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
