/**
 * E2E database query runner. Runs as a child process with node:sqlite:
 *
 *   node --experimental-sqlite src/lib/testing/d1-query.mjs <path-to-d1-directory> <sql> <json-params>
 *
 * Prints the resulting rows as a JSON array so e2e specs can assert on the
 * database state that the preview server (wrangler) writes, e.g. the
 * password-reset token Better Auth stores in `verifications`.
 */
import { DatabaseSync } from "node:sqlite";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const [d1Dir, sql, jsonParams = "[]"] = process.argv.slice(2);
if (!d1Dir || !sql) {
	console.error("Usage: node d1-query.mjs <d1-database-object-directory> <sql> [json-params]");
	process.exit(1);
}

function pickDatabaseFile() {
	// `metadata.sqlite` is miniflare's internal bookkeeping store; the actual
	// D1 database is the other `<hash>.sqlite` file in this directory.
	const files = readdirSync(d1Dir).filter((f) => f.endsWith(".sqlite") && f !== "metadata.sqlite");
	if (files.length === 0) {
		throw new Error(`No D1 database file found in ${d1Dir}.`);
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

const db = new DatabaseSync(pickDatabaseFile());
try {
	// The preview server may hold a write transaction while the query runs.
	db.exec("PRAGMA busy_timeout = 3000");
	console.log(JSON.stringify(db.prepare(sql).all(...JSON.parse(jsonParams))));
} finally {
	db.close();
}
