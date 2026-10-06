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
		database: drizzleAdapter(getDb(d1), { provider: "sqlite" })
	});
};

/**
 * DO NOT USE!
 *
 * This instance is used by the `auth` CLI for schema generation ONLY.
 * To access `auth` at runtime, use `event.locals.auth`.
 */
export const auth = createAuth(null!);
