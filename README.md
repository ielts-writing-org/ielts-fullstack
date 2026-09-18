# IELTS WRITING PRACTICE PLATFORM

1. What: **IELTS Writing practice platform** delivers real-time artificial intelligence (AI) feedback through a conversational user experience (UX).

2. Why: Traditional IELTS writing practice typically **depends on delayed evaluation** from instructors or **static automated scoring tools**, which can restrict learners' ability to identify and correct errors during the learning process.

3. How: The proposed platform seeks to create an **interactive environment** in which learners practice IELTS Writing tasks and receive **immediate, context-aware feedback** via AI-powered conversations. The system evaluates users' writing and provides feedback on key IELTS assessment criteria, including _task achievement (TA)_, _coherence and cohesion (CC)_, _lexical resource (LR)_, and _grammatical range and accuracy (GRA)_. Through the conversational UX, learners interact with the AI to clarify feedback, identify weaknesses, and iteratively improve their writing.

In conclusion, the platform aims to make writing practice more interactive, responsive, and personalized, supporting continuous improvement in IELTS writing performance through immediate feedback and guided practice.

## Prerequisites

1. NodeJS Runtime >=18.0.0.
2. A Cloudflare account.

## How to run the local development server

1. Clone this repo.
2. Run the following command at the root to install required libraries for all packages:

   ```bash
   npm install
   ```

3. Open each package and run the following command to start the development server:

   ```bash
   npm run dev
   ```

4. Follow each terminal's returns to continue.

## Server environment variables

| Variable             | Value                   |
| -------------------- | ----------------------- |
| BETTER_AUTH_URL      | <http://localhost:8787> |
| BETTER_AUTH_SECRET   |                         |
| BETTER_AUTH_API_KEY  |                         |
| GITHUB_CLIENT_ID     |                         |
| GITHUB_CLIENT_SECRET |                         |
| CORS_ORIGINS         | <http://localhost:5173> |

## Client environment variables

| Variable          | Value                   |
| ----------------- | ----------------------- |
| PUBLIC_SERVER_URL | <http://localhost:8787> |

## Server KV entries

| Namespace | Key               | Description                                        |
| --------- | ----------------- | -------------------------------------------------- |
| TASK1_KV  | chat-prompt       | The chat prompt to use when chat with AI           |
| TASK1_KV  | evaluation-prompt | The evaluation prompt to use when evaluate with AI |
| TASK2_KV  | chat-prompt       | The chat prompt to use when chat with AI           |
| TASK2_KV  | evaluation-prompt | The evaluation prompt to use when evaluate with AI |

## Root Endpoints

Base:

- <http://localhost:8787>
- <http://127.0.0.1:8787>

| No  | Endpoint    | Method | Description                      | Dev? |
| --- | ----------- | ------ | -------------------------------- | :--: |
| 1   | /           | GET    | Application's health             |      |
| 2   | /api        | Any    | API Routes (BetterAuth included) |      |
| 2   | /api/health | GET    | Application's health             |      |
| 3   | /openapi    | GET    | OpenAPI docs (JSON)              |  x   |
| 4   | /scalar     | GET    | ScalarUI                         |  x   |
| 4   | /migrate    | POST   | Migrate database                 |  x   |
