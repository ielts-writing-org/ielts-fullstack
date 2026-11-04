import { type Handle, sequence } from "@sveltejs/kit/hooks";
import { building } from "$app/env";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { env } from "cloudflare:workers";
import { createAuth } from "./lib/server/auth";

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const auth = createAuth(env.IELTS_WRITING_DB);
	event.locals.auth = auth;

	const session = await auth.api.getSession({ headers: event.request.headers });
	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
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
