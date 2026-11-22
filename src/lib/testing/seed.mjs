/**
 * E2E database seeder. Runs as a child process with node:sqlite:
 *
 *   node --experimental-sqlite src/lib/testing/seed.mjs <path-to-d1-directory>
 *
 * Picks the miniflare D1 sqlite file that holds the `users` table, rebuilds
 * the schema from the drizzle migrations, inserts a deterministic dataset and
 * wipes everything else every spec resets to before running. Timestamps are
 * anchored to UTC noon so day-based statistics
 * (streaks, sessions this week) stay stable no matter when the suite runs.
 */
import { DatabaseSync } from "node:sqlite";
import { scryptSync } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const d1Dir = process.argv[2];
if (!d1Dir) {
	console.error("Usage: node seed.mjs <d1-database-object-directory>");
	process.exit(1);
}

const DAY = 86_400_000;
const now = Date.now();
const todayNoon = (() => {
	const d = new Date();
	return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0);
})();
/** UTC noon of `daysAgo` days before today.
 * @param {number} daysAgo
 */
const noon = (daysAgo) => todayNoon - daysAgo * DAY;

/** @type {Record<string, string>} */
const USERS = {
	learner: "e2e-user-learner",
	newcomer: "e2e-user-newcomer",
	other: "e2e-user-other",
	emailpw: "e2e-user-emailpw",
	emailunverified: "e2e-user-emailunverified",
	gmailuser: "e2e-user-gmail"
};

/** @type {Record<string, string>} */
const SESSION_TOKENS = {
	learner: "e2e-session-token-learner",
	newcomer: "e2e-session-token-newcomer",
	other: "e2e-session-token-other",
	emailpw: "e2e-session-token-emailpw"
};

/**
 * Email/password credentials for the auth use cases (UC38–UC41). Keep in sync
 * with EMAIL_PASSWORD in e2e-helpers.ts.
 */
const CREDENTIAL_PASSWORD = "e2e-password-123";
const CREDENTIAL_SALT = "abcdef0123456789abcdef0123456789";

/**
 * Hashes like Better Auth's default credential password format
 * (`<salt hex>:<scrypt key hex>` with N=16384, r=16, p=1, dkLen=64) so the
 * seeded accounts accept the fixture password through the real sign-in path.
 * @param {string} password
 */
function credentialPasswordHash(password) {
	const key = scryptSync(password.normalize("NFKC"), CREDENTIAL_SALT, 64, {
		N: 16384,
		r: 16,
		p: 1,
		maxmem: 128 * 16384 * 16 * 2
	});
	return `${CREDENTIAL_SALT}:${key.toString("hex")}`;
}

/** @type {Record<string, string>} */
const TASKS = {
	t1: "019201a1-7000-7e00-9000-000000000001",
	t2: "019201a1-7000-7e00-9000-000000000002",
	t3: "019201a1-7000-7e00-9000-000000000003",
	t4: "019201a1-7000-7e00-9000-000000000004",
	example: "019201a1-7000-7e00-9000-000000000005",
	other: "019201a1-7000-7e00-9000-000000000006",
	p1: "019201a1-7000-7e00-9000-000000000007",
	p2: "019201a1-7000-7e00-9000-000000000008",
	p3: "019201a1-7000-7e00-9000-000000000009",
	p4: "019201a1-7000-7e00-9000-00000000000a",
	p5: "019201a1-7000-7e00-9000-00000000000b",
	p6: "019201a1-7000-7e00-9000-00000000000c",
	p7: "019201a1-7000-7e00-9000-00000000000d",
	p8: "019201a1-7000-7e00-9000-00000000000e"
};

/** @type {Record<string, string>} */
const PRACTICE_SESSIONS = {
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
};

const T1_PROMPT =
	"The chart below shows the percentage of households with internet access in three countries between 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.";
const T2_PROMPT =
	"Some people believe that children should learn a foreign language at primary school, while others think it is better to begin in secondary school. Discuss both views and give your own opinion.";
const T2_PROMPT_2 =
	"Many cities around the world are introducing congestion charges to reduce traffic in the city centre. Do the advantages of this approach outweigh the disadvantages? Explain your reasoning with relevant examples from your own knowledge.";
const T1_PROMPT_2 =
	"The bar chart illustrates how many international students enrolled at three universities in 2010, 2015 and 2020. Summarise the main features and make comparisons where relevant.";
const EXAMPLE_PROMPT =
	"Some people think that governments should invest more in public transport networks, while others believe building more roads is a better use of public funds. Discuss both views and give your own opinion with relevant examples.";

/** Generates exactly `count` single-space separated words (deterministic).
 * @param {number} count
 * @param {string} [salt]
 */
function lorem(count, salt = "") {
	return Array.from({ length: count }, (_, i) => `w${salt}${i % 97}`).join(" ");
}

/** Builds the canonical Task 1 evaluation fixture.
 * @param {number} band
 * @param {string} summary
 */
const task1Evaluation = (band, summary) => ({
	taskCategory: "1",
	summary,
	estimatedBand: band,
	criteria: {
		taskAchievement: criterion(band),
		coherenceAndCohesion: criterion(band),
		lexicalResource: criterion(band - 0.5),
		grammaticalRangeAndAccuracy: criterion(band)
	}
});

/** Builds the canonical Task 2 evaluation fixture.
 * @param {number} band
 * @param {string} summary
 */
const task2Evaluation = (band, summary) => ({
	taskCategory: "2",
	summary,
	estimatedBand: band,
	criteria: {
		taskResponse: criterion(band - 0.5),
		coherenceAndCohesion: criterion(band + 0.5 > 9 ? 9 : band + 0.5),
		lexicalResource: criterion(band),
		grammaticalRangeAndAccuracy: criterion(band)
	}
});

/** @param {number} band */
function criterion(band) {
	return {
		band,
		checks: [
			{ title: "Clear overview", status: "met", evidence: "The introduction frames the response." }
		],
		strengths: [{ title: "Linking", evidence: "Ideas flow with connectors." }],
		weaknesses: [
			{ title: "Repetition", evidence: "Some verbs repeat.", advice: "Vary vocabulary." }
		],
		why: "The response addresses the task with a clear position and support.",
		nextBandGap: null
	};
}

// Expected dashboard/history numbers derived from the seed (kept here so the
// suite and the dataset cannot drift apart silently):
//   totalSessions 13 · wordsWritten 1280 · sessionsThisWeek 8 · streak 7
//   evaluated 3 · overall 7.0 · trend [7.5, 7.0, 6.5]

/** @type {Array<[string, string, string, string, number, number, number]>} */
const sessionRows = [
	// [key, taskId, name, type, words, startedAt(daysAgo), updatedAt, extra]
	["s1", TASKS.t2, "Task 2 opinion essay", "free", 280, 0, now - 5 * 60_000],
	["s2", TASKS.t1, "Task 1 line graph", "free", 160, 1, noon(1) + 3_600_000],
	["s3", TASKS.t2, "Timed essay draft", "timed", 120, 2, noon(2) + 3_600_000],
	["s11", TASKS.t1, "Task 1 chart analysis", "free", 160, 2, noon(2) + 7_200_000],
	["s4", TASKS.t3, "Discussion essay practice", "free", 300, 3, noon(3) + 3_600_000],
	["s5", TASKS.t2, "Vocabulary practice", "free", 260, 4, noon(4) + 3_600_000],
	["s6", TASKS.t2, "Overflow session 6", "free", 10, 5, noon(5) + 3_600_000],
	["s7", TASKS.t2, "Overflow session 7", "free", 10, 6, noon(6) + 3_600_000],
	["s12", TASKS.t2, "Editor sandbox", "free", 0, 8, noon(8) + 3_600_000],
	["s13", TASKS.t4, "Task 1 upload sandbox", "free", 0, 9, noon(9) + 3_600_000],
	["s8", TASKS.t2, "Overflow session 8", "free", 10, 10, noon(10) + 3_600_000],
	["s9", TASKS.t2, "Overflow session 9", "free", 10, 11, noon(11) + 3_600_000],
	["s10", TASKS.t2, "Overflow session 10", "free", 10, 12, noon(12) + 3_600_000]
];

const paginationRows = Array.from(
	{ length: 8 },
	(_, i) =>
		/** @type {[string, string | null, string, string, string, string | null]} */ ([
			TASKS[`p${i + 1}`],
			USERS.learner,
			"2",
			"opinion-essay",
			`Pagination task ${i + 1}: this seeded prompt exists to fill the task library so pagination and sorting can be verified end to end.`,
			null
		])
);

/** @type {Array<[string, string | null, string, string, string, string | null]>} */
const taskRows = [
	// t1 carries a (fake) image name so Task 1 evaluation readiness is met.
	[TASKS.t1, USERS.learner, "1", "line-graph", T1_PROMPT, "e2e-seeded-image.webp"],
	[TASKS.t2, USERS.learner, "2", "opinion-essay", T2_PROMPT, null],
	[TASKS.t3, USERS.learner, "2", "discussion-essay", T2_PROMPT_2, null],
	[TASKS.t4, USERS.learner, "1", "bar-chart", T1_PROMPT_2, null],
	[TASKS.example, null, "2", "opinion-essay", EXAMPLE_PROMPT, null],
	[TASKS.other, USERS.other, "2", "opinion-essay", T2_PROMPT, null],
	...paginationRows
];

function pickDatabaseFile() {
	// `metadata.sqlite` is miniflare's internal bookkeeping store; the actual
	// D1 database is the other `<hash>.sqlite` file in this directory.
	const files = readdirSync(d1Dir).filter((f) => f.endsWith(".sqlite") && f !== "metadata.sqlite");
	if (files.length === 0) {
		throw new Error(
			`No D1 database file found in ${d1Dir}. The preview server must have opened the database first.`
		);
	}
	for (const file of files) {
		const db = new DatabaseSync(join(d1Dir, file));
		const hasUsers = db
			.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
			.get();
		db.close();
		if (hasUsers) {
			return join(d1Dir, file);
		}
	}
	return join(d1Dir, files[0]);
}

/**
 * Rebuilds the schema from the drizzle migration files under the `drizzle`
 * folder so the e2e tables always match src/lib/server/db/{auth,app}.schema.ts.
 * Dropping and re-applying the migrations on every seed keeps the suite
 * immune to schema drift between the app schema and this file.
 *
 * @param {DatabaseSync} db
 */
function resetSchema(db) {
	db.exec("PRAGMA foreign_keys = OFF");
	const tables = db
		.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
		.all();
	for (const { name } of tables) {
		db.exec(`DROP TABLE IF EXISTS "${name}"`);
	}
	db.exec("PRAGMA foreign_keys = ON");

	const migrationsDir = join(import.meta.dirname, "..", "..", "..", "drizzle");
	for (const folder of readdirSync(migrationsDir).sort()) {
		const sql = readFileSync(join(migrationsDir, folder, "migration.sql"), "utf8");
		for (const statement of sql.split("--> statement-breakpoint")) {
			const trimmed = statement.trim();
			if (trimmed) db.exec(trimmed);
		}
	}
}

function main() {
	const dbPath = pickDatabaseFile();
	const db = new DatabaseSync(dbPath);

	resetSchema(db);

	const insertUser = db.prepare(
		"INSERT INTO users (id, name, email, email_verified, image, created_at, updated_at, role, banned, ban_reason, ban_expires, last_active_at) VALUES (?, ?, ?, ?, NULL, ?, ?, NULL, 0, NULL, NULL, ?)"
	);
	const insertCredentialAccount = db.prepare(
		"INSERT INTO accounts (id, account_id, provider_id, user_id, access_token, refresh_token, id_token, access_token_expires_at, refresh_token_expires_at, scope, password, created_at, updated_at) VALUES (?, ?, 'credential', ?, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?, ?)"
	);
	const insertProfile = db.prepare(
		"INSERT INTO profiles (id, user_id, band_target, theme, created_at, updated_at, deleted_at) VALUES (?, ?, ?, 'light', ?, ?, NULL)"
	);
	const insertAuthSession = db.prepare(
		"INSERT INTO sessions (id, expires_at, token, created_at, updated_at, ip_address, user_agent, user_id, impersonated_by) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, NULL)"
	);
	const insertTask = db.prepare(
		"INSERT INTO tasks (id, user_id, category, subcategory, prompt, image_name, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)"
	);
	const insertPracticeSession = db.prepare(
		"INSERT INTO practice_sessions (id, user_id, task_id, name, type, response, time_up_action, started_at, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)"
	);
	const insertChatMessage = db.prepare(
		'INSERT INTO chat_messages (id, practice_session_id, "from", message, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, NULL)'
	);
	const insertEvaluation = db.prepare(
		"INSERT INTO evaluations (id, practice_session_id, result, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, NULL)"
	);

	db.exec("BEGIN");
	try {
		// Users + profiles + Better Auth sessions.
		insertUser.run(
			USERS.learner,
			"Learner One",
			"learner@e2e.test",
			1,
			now - 30 * DAY,
			now - DAY,
			now - 60_000
		);
		insertUser.run(
			USERS.newcomer,
			"Newcomer Two",
			"newcomer@e2e.test",
			1,
			now - DAY,
			now - DAY,
			now - 60_000
		);
		insertUser.run(
			USERS.other,
			"Other User",
			"other@e2e.test",
			1,
			now - 30 * DAY,
			now - DAY,
			now - 60_000
		);
		// Email/password users (UC39 sign-in, UC40 reset, UC41 verification).
		insertUser.run(
			USERS.emailpw,
			"Email User",
			"emailpw@e2e.test",
			1,
			now - 30 * DAY,
			now - DAY,
			now - 60_000
		);
		insertUser.run(
			USERS.emailunverified,
			"Unverified User",
			"unverified@e2e.test",
			0,
			now - DAY,
			now - DAY,
			now - 60_000
		);
		// A gmail.com address: the sentinel allowlist skips remote email
		// validation for it, so the duplicate sign-up alternative (UC38 A2)
		// reaches the generic-response path deterministically. Dot-less, since
		// sign-up canonicalizes gmail addresses by stripping dots.
		insertUser.run(
			USERS.gmailuser,
			"Gmail User",
			"e2elearner@gmail.com",
			1,
			now - 30 * DAY,
			now - DAY,
			now - 60_000
		);

		insertProfile.run("e2e-profile-learner", USERS.learner, 7.5, now - 30 * DAY, now - DAY);
		insertProfile.run("e2e-profile-newcomer", USERS.newcomer, null, now - DAY, now - DAY);
		insertProfile.run("e2e-profile-other", USERS.other, 6.5, now - 30 * DAY, now - DAY);
		insertProfile.run("e2e-profile-emailpw", USERS.emailpw, null, now - 30 * DAY, now - DAY);
		insertProfile.run(
			"e2e-profile-emailunverified",
			USERS.emailunverified,
			null,
			now - DAY,
			now - DAY
		);
		insertProfile.run("e2e-profile-gmail", USERS.gmailuser, null, now - 30 * DAY, now - DAY);

		// Credential accounts for the email/password users.
		const passwordHash = credentialPasswordHash(CREDENTIAL_PASSWORD);
		insertCredentialAccount.run(
			"e2e-account-emailpw",
			USERS.emailpw,
			USERS.emailpw,
			passwordHash,
			now - 30 * DAY,
			now - DAY
		);
		insertCredentialAccount.run(
			"e2e-account-emailunverified",
			USERS.emailunverified,
			USERS.emailunverified,
			passwordHash,
			now - DAY,
			now - DAY
		);

		for (const [user, token] of Object.entries(SESSION_TOKENS)) {
			insertAuthSession.run(`e2e-auth-${user}`, now + 7 * DAY, token, now, now, USERS[user]);
		}

		// Tasks.
		for (const [id, userId, category, subcategory, prompt, imageName] of taskRows) {
			insertTask.run(
				id,
				userId,
				category,
				subcategory,
				prompt,
				imageName,
				now - 20 * DAY,
				now - 2 * DAY
			);
		}

		// Practice sessions.
		for (const [key, taskId, name, type, words, startedDaysAgo, updatedAt] of sessionRows) {
			let response = words === 0 ? "" : lorem(words);
			if (key === "s5") {
				// Make one essay unique so body-only search can find it.
				const tokens = response.split(" ");
				tokens[10] = "serendipity";
				response = tokens.join(" ");
			}
			insertPracticeSession.run(
				PRACTICE_SESSIONS[key],
				USERS.learner,
				taskId,
				name,
				type,
				response,
				type === "timed" ? "submit" : null,
				noon(startedDaysAgo),
				noon(startedDaysAgo),
				updatedAt
			);
		}
		// The other user's own session (for ownership guards).
		insertPracticeSession.run(
			PRACTICE_SESSIONS.other,
			USERS.other,
			TASKS.other,
			"Other user session",
			"free",
			lorem(50, "o"),
			null,
			noon(1),
			noon(1),
			noon(1) + 7_200_000
		);

		// Chat history on the evaluated Task 2 session.
		insertChatMessage.run(
			"e2e-chat-1",
			PRACTICE_SESSIONS.s1,
			"user",
			"How can I improve my essay?",
			noon(0),
			noon(0)
		);
		insertChatMessage.run(
			"e2e-chat-2",
			PRACTICE_SESSIONS.s1,
			"assistant",
			"Focus on linking words in your conclusion.",
			noon(0),
			noon(0)
		);

		// Evaluations: s1 6.5 (task2), s2 7.0 (task1), s4 7.5 (task2).
		insertEvaluation.run(
			"e2e-eval-s1",
			PRACTICE_SESSIONS.s1,
			JSON.stringify(task2Evaluation(6.5, "Solid essay with clear arguments.")),
			noon(0),
			noon(0)
		);
		insertEvaluation.run(
			"e2e-eval-s2",
			PRACTICE_SESSIONS.s2,
			JSON.stringify(task1Evaluation(7.0, "A clear visual report.")),
			noon(1),
			noon(1)
		);
		insertEvaluation.run(
			"e2e-eval-s4",
			PRACTICE_SESSIONS.s4,
			JSON.stringify(task2Evaluation(7.5, "A balanced discussion.")),
			noon(3),
			noon(3)
		);

		db.exec("COMMIT");
	} catch (error) {
		db.exec("ROLLBACK");
		throw error;
	}

	db.close();

	console.log(
		JSON.stringify({
			ok: true,
			dbPath,
			counts: { users: 7, tasks: taskRows.length, practiceSessions: sessionRows.length + 1 }
		})
	);
}

main();
