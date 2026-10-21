import { defineConfig } from "drizzle-kit";

/**
 * This config is used for local only.
 * In order to migrate, please first generate db schemas then using Wrangler to continue the migration.
 */
export default defineConfig({
	dialect: "sqlite",
	schema: "./src/lib/server/db/*.schema.ts",
	strict: true,
	dbCredentials: { url: process.env.CLOUDFLARE_D1_URL },
	verbose: true
});
