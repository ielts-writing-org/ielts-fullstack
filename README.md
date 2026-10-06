# IELTS WRITING PRACTICE PLATFORM

1. What: **IELTS Writing practice platform** delivers real-time artificial intelligence (AI) feedback through a conversational user experience (UX).

2. Why: Traditional IELTS writing practice typically **depends on delayed evaluation** from instructors or **static automated scoring tools**, which can restrict learners' ability to identify and correct errors during the learning process.

3. How: The proposed platform seeks to create an **interactive environment** in which learners practice IELTS Writing tasks and receive **immediate, context-aware feedback** via AI-powered conversations. The system evaluates users' writing and provides feedback on key IELTS assessment criteria, including _task achievement (TA)_, _coherence and cohesion (CC)_, _lexical resource (LR)_, and _grammatical range and accuracy (GRA)_. Through the conversational UX, learners interact with the AI to clarify feedback, identify weaknesses, and iteratively improve their writing.

In conclusion, the platform aims to make writing practice more interactive, responsive, and personalized, supporting continuous improvement in IELTS writing performance through immediate feedback and guided practice.

## Prerequisites

1. NodeJS Runtime >=18.0.0.
2. A Cloudflare account.

## Server KV entries

| Namespace | Key               | Description                                        |
| --------- | ----------------- | -------------------------------------------------- |
| TASK1_KV  | chat-prompt       | The chat prompt to use when chat with AI           |
| TASK1_KV  | evaluation-prompt | The evaluation prompt to use when evaluate with AI |
| TASK2_KV  | chat-prompt       | The chat prompt to use when chat with AI           |
| TASK2_KV  | evaluation-prompt | The evaluation prompt to use when evaluate with AI |

## How to run the local development server

1. Clone this repo.
2. Run the following command to install required libraries:

   ```bash
   npm install --legacy-peer-deps
   ```

3. Run the following command to start the development server:

   ```bash
   npm run dev
   ```

4. Follow each terminal's returns to continue.

## How to open Cloudflare Explorer

Currently, there is no way to open Cloudflare Explorer in SvelteKit project without building and previewing the app. You will have to run the following command to start it as a standalone server:

```bash
npx localflare attach
```

This will then open a webpage at: <https://studio.localflare.dev?port=8788> and require an allowance to access local api service at <http://localhost:8788/__localflare/>

Read more: <https://localflare.dev/docs/cli-attach-mode>
