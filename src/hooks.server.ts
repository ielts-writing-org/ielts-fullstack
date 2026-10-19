import { building } from "$app/env";
import { type Handle, sequence } from "@sveltejs/kit/hooks";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { env } from "cloudflare:workers";
import { createAuth } from "#lib/server/auth.ts";
import { getDb } from "./lib/server/db";

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const auth = createAuth(env.IELTS_WRITING_DB);
	const session = await auth.api.getSession({ headers: event.request.headers });
	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	event.locals.auth = auth;

	return svelteKitHandler({ auth, building, event, resolve });
};

const handleProfile: Handle = async ({ event, resolve }) => {
	const user = event.locals.user;
	if (user) {
		const db = getDb(env.IELTS_WRITING_DB);
		const userProfile = await db.query.profile.findFirst({
			where: (profiles, { eq }) => eq(profiles.userId, user.id)
		});

		if (userProfile) {
			event.locals.profile = userProfile;
		}
	}

	return resolve(event);
};

// TODO: The current implementation doesn't work with refreshAll()
const handleTheme: Handle = async ({ event, resolve }) => {
	const theme = event.cookies.get("theme") ?? "light";
	event.locals.theme = theme;

	return await resolve(event, {
		transformPageChunk: ({ html }) => html.replace("%theme%", theme)
	});
};

export const handle = sequence(handleBetterAuth, handleProfile, handleTheme);
