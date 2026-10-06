import { defineConfig } from "drizzle-kit";

if (!process.env.CLOUDFLARE_D1_URL) {
	if (!process.env.CLOUDFLARE_ACCOUNT_ID) throw new Error("CLOUDFLARE_ACCOUNT_ID is not set");
	if (!process.env.CLOUDFLARE_DATABASE_ID) throw new Error("CLOUDFLARE_DATABASE_ID is not set");
	if (!process.env.CLOUDFLARE_D1_TOKEN) throw new Error("CLOUDFLARE_D1_TOKEN is not set");
}

export default defineConfig({
	schema: "./src/lib/server/db/schema/index.ts",
	dialect: "sqlite",
	strict: true,
	...(process.env.CLOUDFLARE_D1_URL
		? {
				dbCredentials: { url: process.env.CLOUDFLARE_D1_URL },
				verbose: true
			}
		: {
				driver: "d1-http",
				dbCredentials: {
					accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
					databaseId: process.env.CLOUDFLARE_DATABASE_ID,
					token: process.env.CLOUDFLARE_D1_TOKEN
				}
			})
});
