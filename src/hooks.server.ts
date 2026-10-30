import { type Handle, sequence, type ServerInit } from "@sveltejs/kit/hooks";
import { error } from "@sveltejs/kit";
import { building } from "$app/env";
import { eq } from "drizzle-orm";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { env } from "cloudflare:workers";
import { getDb } from "./lib/server/db";
import { createAuth } from "./lib/server/auth";
import { profiles } from "#lib/server/db/app.schema.ts";
import { createRedisConnection } from "#lib/server/redis.ts";
import { createRateLimiter } from "#lib/server/rate-limit.ts";

export const init: ServerInit = async () => {
	createRedisConnection();
	createRateLimiter();
};

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const auth = createAuth(env.IELTS_WRITING_DB);
	event.locals.auth = auth;

	const session = await auth.api.getSession({ headers: event.request.headers });
	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;

		const db = getDb(env.IELTS_WRITING_DB);
		const [profile] = await db
			.select()
			.from(profiles)
			.where(eq(profiles.userId, event.locals.user.id))
			.limit(1);
		if (!profile) {
			error(500, "Missing user profile.");
		}
		event.locals.profile = profile;
	}

	return svelteKitHandler({ auth, building, event, resolve });
};

const handleTheme: Handle = async ({ event, resolve }) => {
	const theme = event.cookies.get("theme") ?? "light";

	return await resolve(event, {
		transformPageChunk: ({ html }) => html.replace("%theme%", theme)
	});
};

export const handle = sequence(handleBetterAuth, handleTheme);
