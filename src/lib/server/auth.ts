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
import { getDb } from "./db";
import { error, redirect } from "@sveltejs/kit";
import { resolve } from "$app/paths";
import { env } from "cloudflare:workers";
import { profiles } from "./db/app.schema";

export const createAuth = (d1: D1Database) => {
	return betterAuth({
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
			dash({ apiKey: BETTER_AUTH_API_KEY }),
			sentinel({ apiKey: BETTER_AUTH_API_KEY }),
			sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
		],
		advanced: {
			cookies: {
				session_token: {
					name: "session_token"
				}
			}
		},
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
		database: drizzleAdapter(getDb(d1), { provider: "sqlite", usePlural: true })
	});
};

/**
 * DO NOT USE!
 *
 * This instance is used by the `auth` CLI for schema generation ONLY.
 * To access `auth` at runtime, use `event.locals.auth`.
 */
export const auth = createAuth(null!);

export function requireSession(locals: App.Locals) {
	const { session, user } = locals;

	if (!session || !user || !profiles) {
		redirect(307, resolve("/(public)/sign-in"));
	}

	return { session, user };
}

export function requireSessionApi(locals: App.Locals) {
	const { session, user, profile } = locals;

	if (!session || !user || !profile) {
		error(401, "Unauthorized");
	}

	return { session, user, profile };
}
