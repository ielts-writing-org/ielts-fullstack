import {
	BETTER_AUTH_API_KEY,
	BETTER_AUTH_SECRET,
	GITHUB_CLIENT_ID,
	GITHUB_CLIENT_SECRET
} from "$app/env/private";
import { ORIGIN } from "$app/env/public";
import { getRequestEvent } from "$app/server";
import { dash, sentinel } from "@better-auth/infra";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { admin } from "better-auth/plugins";
import { sveltekitCookies } from "better-auth/svelte-kit";
import { env } from "cloudflare:workers";
import { getDb } from "../db";
import { profiles } from "../db/app.schema";
import { redisSecondaryStorage } from "./secondary-storage";

export const createAuth = (d1: D1Database) => {
	return betterAuth({
		appName: "IELTS Writing Practice Platform",
		baseURL: ORIGIN,
		secret: BETTER_AUTH_SECRET,
		socialProviders: {
			github: {
				clientId: GITHUB_CLIENT_ID,
				clientSecret: GITHUB_CLIENT_SECRET
			}
		},
		plugins: [
			admin(),
			dash({
				apiKey: BETTER_AUTH_API_KEY,
				// https://better-auth.com/docs/infrastructure/plugins/dashboard#activity-tracking
				activityTracking: {
					enabled: true,
					updateInterval: 5 * 60 * 1000
				}
			}),
			sentinel({ apiKey: BETTER_AUTH_API_KEY }),
			sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
		],
		advanced: {
			database: { joins: true },
			ipAddress: {
				// https://better-auth.com/docs/reference/security#ip-address-headers
				ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"]
			}
		},
		database: drizzleAdapter(getDb(d1), { provider: "sqlite", usePlural: true }),
		databaseHooks: {
			user: {
				create: {
					after: async (user) => {
						const db = getDb(env.IELTS_WRITING_DB);
						await db.insert(profiles).values({ userId: user.id });
					}
				}
			}
		},
		session: { storeSessionInDatabase: true },
		verification: { storeInDatabase: true },
		onAPIError: { errorURL: "/sign-in" },
		rateLimit: { storage: "secondary-storage" },
		secondaryStorage: redisSecondaryStorage
	});
};
