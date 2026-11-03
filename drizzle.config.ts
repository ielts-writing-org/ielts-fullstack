import { defineConfig } from "drizzle-kit";
import { globSync } from "node:fs";
import path from "node:path";

/**
 * This config is used for local only.
 * In order to migrate, please first generate db schemas then using Wrangler to continue the migration.
 */
export default defineConfig({
	dialect: "sqlite",
	schema: "./src/lib/server/db/*.schema.ts",
	dbCredentials: { url: resolveDbUrl() },
	strict: true,
	verbose: true
});

function resolveDbUrl(): string {
	const matches = globSync("./.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite");

	for (const match of matches) {
		const absolutePath = path.resolve(match);
		console.log(`Resolved db path: ${absolutePath}`);
		return absolutePath;
	}

	throw new Error(
		"Cannot find the SQLite database file. Please make sure the database is initialized."
	);
}
