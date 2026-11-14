import { type Handle, sequence } from "@sveltejs/kit/hooks";
import { building } from "$app/env";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { env } from "cloudflare:workers";
import { createAuth } from "./lib/server/auth/auth";
import { getDb } from "./lib/server/db/index.ts";

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const auth = createAuth(env.IELTS_WRITING_DB);
	event.locals.auth = auth;

	const session = await auth.api.getSession({ headers: event.request.headers });
	if (session) {
		const db = getDb(env.IELTS_WRITING_DB.withSession("first-primary"));
		const currentUser = await db.query.users.findFirst({
			where: (fields, { eq }) => eq(fields.id, session.user.id),
			columns: { id: true, role: true, banned: true, banExpires: true }
		});
		const isLocked = Boolean(
			currentUser?.banned &&
			(!currentUser.banExpires || currentUser.banExpires.getTime() > Date.now())
		);
		if (currentUser && !isLocked) {
			event.locals.session = session.session;
			event.locals.user = { ...session.user, role: currentUser.role };
		}
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
