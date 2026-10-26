# IELTS WRITING PRACTICE PLATFORM

1. What: **IELTS Writing practice platform** delivers real-time artificial intelligence (AI) feedback through a conversational user experience (UX).

2. Why: Traditional IELTS writing practice typically **depends on delayed evaluation** from instructors or **static automated scoring tools**, which can restrict learners' ability to identify and correct errors during the learning process.

3. How: The proposed platform seeks to create an **interactive environment** in which learners practice IELTS Writing tasks and receive **immediate, context-aware feedback** via AI-powered conversations. The system evaluates users' writing and provides feedback on key IELTS assessment criteria, including _task achievement (TA)_, _coherence and cohesion (CC)_, _lexical resource (LR)_, and _grammatical range and accuracy (GRA)_. Through the conversational UX, learners interact with the AI to clarify feedback, identify weaknesses, and iteratively improve their writing.

In conclusion, the platform aims to make writing practice more interactive, responsive, and personalized, supporting continuous improvement in IELTS writing performance through immediate feedback and guided practice.

## Prerequisites

1. NodeJS Runtime >=18.0.0.
2. A Cloudflare account.

## KV entries

| Namespace        | Key                                      | Description                                        |
| ---------------- | ---------------------------------------- | -------------------------------------------------- |
| IELTS_WRITING_KV | chat-prompt-1, chat-prompt-2             | The system prompt to be used when chat with AI     |
| IELTS_WRITING_KV | evaluation-prompt-1, evaluation-prompt-2 | The system prompt to be used when evaluate with AI |

## Start the local development server

1. Clone this repo.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Generate worker configurations:

   ```bash
   npm run gen
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Wait until the application fully idle. Then create database tables:

   ```bash
   npm run db:push
   ```

6. Use `localflare` to add above KV entries:

   ```bash
   npx localflare attach
   ```

Read more: <https://localflare.dev/docs/cli-attach-mode>
