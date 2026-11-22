import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import "dotenv/config";
import type { BrowserContext, Page } from "@playwright/test";
import { makeSignature, signJWT } from "better-auth/crypto";

export const BASE_URL = "http://localhost:5173";

export const USERS = {
	learner: { id: "e2e-user-learner", token: "e2e-session-token-learner", name: "Learner One" },
	newcomer: { id: "e2e-user-newcomer", token: "e2e-session-token-newcomer", name: "Newcomer Two" },
	other: { id: "e2e-user-other", token: "e2e-session-token-other", name: "Other User" },
	emailpw: { id: "e2e-user-emailpw", token: "e2e-session-token-emailpw", name: "Email User" }
} as const;

export type TestUser = keyof typeof USERS;

/**
 * Email/password fixtures for the auth use cases (UC38–UC41). Keep in sync
 * with seed.mjs, which stores the matching rows plus the credential accounts
 * for both passwords (CREDENTIAL_PASSWORD). The gmail.com address sits in the
 * sentinel domain allowlist so sign-up skips remote email validation.
 */
export const EMAIL_PASSWORD = {
	verified: { userId: "e2e-user-emailpw", email: "emailpw@e2e.test", password: "e2e-password-123" },
	unverified: {
		userId: "e2e-user-emailunverified",
		email: "unverified@e2e.test",
		password: "e2e-password-123"
	},
	gmail: { userId: "e2e-user-gmail", email: "e2elearner@gmail.com" }
} as const;

export const SESSION_IDS = {
	s1: "019201a1-7000-7e00-8000-000000000001",
	s2: "019201a1-7000-7e00-8000-000000000002",
	s3: "019201a1-7000-7e00-8000-000000000003",
	s4: "019201a1-7000-7e00-8000-000000000004",
	s5: "019201a1-7000-7e00-8000-000000000005",
	s6: "019201a1-7000-7e00-8000-000000000006",
	s7: "019201a1-7000-7e00-8000-000000000007",
	s8: "019201a1-7000-7e00-8000-000000000008",
	s9: "019201a1-7000-7e00-8000-000000000009",
	s10: "019201a1-7000-7e00-8000-00000000000a",
	s11: "019201a1-7000-7e00-8000-00000000000b",
	s12: "019201a1-7000-7e00-8000-00000000000c",
	s13: "019201a1-7000-7e00-8000-00000000000d",
	other: "019201a1-7000-7e00-8000-00000000000e"
} as const;

export const TASK_IDS = {
	t1: "019201a1-7000-7e00-9000-000000000001",
	t2: "019201a1-7000-7e00-9000-000000000002",
	t3: "019201a1-7000-7e00-9000-000000000003",
	t4: "019201a1-7000-7e00-9000-000000000004",
	example: "019201a1-7000-7e00-9000-000000000005",
	other: "019201a1-7000-7e00-9000-000000000006"
} as const;

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..");

/**
 * Resets the local D1 database to the deterministic seed dataset. Runs the
 * seeder as a child process. The Playwright global setup (global-setup.ts)
 * calls this once for the baseline seed, and specs whose tests mutate data
 * call it again from `test.beforeEach` so every test starts from the seeded
 * dataset. Every call re-seeds.
 */
export function resetSeedData(): Promise<void> {
	return runSeed();
}

async function runSeed(): Promise<void> {
	const d1Dir = await resolveD1Directory();

	const seedScript = path.join(import.meta.dirname, "seed.mjs");
	let result = spawnSync(process.execPath, ["--experimental-sqlite", seedScript, d1Dir], {
		cwd: repoRoot,
		encoding: "utf8"
	});

	// Node versions where node:sqlite is unflagged reject the flag.
	if (result.status !== 0 && /bad option|unknown option|invalid/i.test(result.stderr ?? "")) {
		result = spawnSync(process.execPath, [seedScript, d1Dir], { cwd: repoRoot, encoding: "utf8" });
	}

	if (result.status !== 0) {
		throw new Error(`Seeding the local D1 database failed:\n${result.stdout}\n${result.stderr}`);
	}
}

/**
 * Runs a read-only SQL query against the local e2e D1 database and returns the
 * rows. Specs use it to assert on server-written state that has no UI
 * representation, e.g. the password-reset token Better Auth stores in
 * `verifications` or the user/profile/account rows created by sign-up. Runs as
 * a child process because node:sqlite needs a flag on some Node versions.
 */
export async function queryD1<T = Record<string, unknown>>(
	sql: string,
	params: unknown[] = []
): Promise<T[]> {
	const d1Dir = await resolveD1Directory();
	const queryScript = path.join(import.meta.dirname, "d1-query.mjs");
	const args = [queryScript, d1Dir, sql, JSON.stringify(params)];

	let result = spawnSync(process.execPath, ["--experimental-sqlite", ...args], {
		cwd: repoRoot,
		encoding: "utf8"
	});

	// Node versions where node:sqlite is unflagged reject the flag.
	if (result.status !== 0 && /bad option|unknown option|invalid/i.test(result.stderr ?? "")) {
		result = spawnSync(process.execPath, args, { cwd: repoRoot, encoding: "utf8" });
	}

	if (result.status !== 0) {
		throw new Error(`Querying the local D1 database failed:\n${result.stdout}\n${result.stderr}`);
	}

	return JSON.parse(result.stdout) as T[];
}

async function resolveD1Directory(): Promise<string> {
	const d1Dir = path.join(
		repoRoot,
		".wrangler",
		"state",
		"e2e",
		"v3",
		"d1",
		"miniflare-D1DatabaseObject"
	);

	const hasDatabaseFile = () => {
		if (!existsSync(d1Dir)) return false;
		// `metadata.sqlite` is miniflare bookkeeping, not the database.
		return readdirSync(d1Dir).some((f) => f.endsWith(".sqlite") && f !== "metadata.sqlite");
	};

	if (!hasDatabaseFile()) {
		// Miniflare creates the D1 sqlite file lazily, on the first actual D1
		// query. A cookieless request short-circuits before any database
		// access, so hit the app with a signed session cookie — the session
		// lookup opens the binding and materializes the file. Wrangler dev
		// boots while Playwright's web-server plugin waits for the port, so
		// the request lands as soon as the server is up.
		const secret = process.env.BETTER_AUTH_SECRET;
		if (!secret) {
			throw new Error("BETTER_AUTH_SECRET is missing from the environment (.env).");
		}
		const token = USERS.learner.token;
		const cookie = `better-auth.session_token=${token}.${await makeSignature(token, secret)}`;

		const deadline = Date.now() + 60_000;
		while (Date.now() < deadline) {
			await fetch(`${BASE_URL}/`, { headers: { cookie } }).catch(() => {});
			if (hasDatabaseFile()) break;
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
	}

	if (!hasDatabaseFile()) {
		throw new Error(
			`D1 database file not found in ${d1Dir}. The e2e preview server must be running (npm run preview:e2e).`
		);
	}

	return d1Dir;
}

/**
 * Authenticates a browser context as one of the seeded users. Better Auth
 * signs the session token cookie as `<token>.<hmac>` with the app secret, so
 * the cookie is produced with Better Auth's own signature helper.
 */
export async function login(context: BrowserContext, user: TestUser): Promise<void> {
	const secret = process.env.BETTER_AUTH_SECRET;
	if (!secret) {
		throw new Error("BETTER_AUTH_SECRET is missing from the environment (.env).");
	}

	const token = USERS[user].token;
	const value = `${token}.${await makeSignature(token, secret)}`;

	await context.addCookies([
		{
			name: "better-auth.session_token",
			value,
			domain: new URL(BASE_URL).hostname,
			path: "/",
			httpOnly: true,
			sameSite: "Lax",
			secure: false
		}
	]);
}

/**
 * Mints an email-verification JWT exactly like Better Auth's server does
 * (`{ email, userId }`, HS256, 10 minutes), so e2e specs can exercise the
 * verification link (UC41) even though the e2e environment never delivers the
 * actual email.
 */
export async function createEmailVerificationJwt(
	email: string,
	userId: string,
	expiresIn = 10 * 60
): Promise<string> {
	const secret = process.env.BETTER_AUTH_SECRET;
	if (!secret) {
		throw new Error("BETTER_AUTH_SECRET is missing from the environment (.env).");
	}

	return signJWT({ email: email.toLowerCase(), userId }, secret, expiresIn);
}

export function practiceHref(sessionId: string): string {
	return `/practice/${sessionId}`;
}

/** Builds a valid OpenAI-style SSE response body for the AI endpoints. */
export function sseBody(chunks: string[]): string {
	const frames = chunks.map(
		(content) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`
	);
	return `${frames.join("")}data: [DONE]\n\n`;
}

/** Intercepts the chat SSE endpoint with a canned reply. */
export async function interceptChatStream(page: Page, chunks: string[]): Promise<void> {
	await page.route("**/chat", (route) =>
		route.fulfill({
			status: 200,
			headers: { "content-type": "text/event-stream" },
			body: sseBody(chunks)
		})
	);
}

/** Intercepts the evaluate SSE endpoint with a canned evaluation JSON. */
export async function interceptEvaluateStream(page: Page, evaluation: object): Promise<void> {
	const json = JSON.stringify(evaluation);
	// Split mid-payload so the client's frame-accumulating JSON parser is
	// exercised; the midpoint works for any fixture size.
	const splitAt = Math.max(1, Math.ceil(json.length / 2));
	await page.route("**/evaluate", (route) =>
		route.fulfill({
			status: 200,
			headers: { "content-type": "text/event-stream" },
			body: sseBody([json.slice(0, splitAt), json.slice(splitAt)])
		})
	);
}

/** Clicks a button inside the currently open global modal. */
export async function clickModalButton(page: Page, text: string): Promise<void> {
	const button = page.locator(".modal-box").getByRole("button", { name: text });
	await button.click();
}
