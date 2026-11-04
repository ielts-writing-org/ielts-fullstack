import { getApiSession } from "#lib/server/auth/index.ts";
import { getDb } from "#lib/server/db/index.ts";
import { getRequestEvent, query } from "$app/server";
import { error } from "@sveltejs/kit";
import { env } from "cloudflare:workers";

export const getProfile = query(async () => {
	const { locals } = getRequestEvent();
	const { user } = getApiSession(locals);

	const db = getDb(env.IELTS_WRITING_DB);
	const profile = await db.query.profiles.findFirst({
		where: (profiles, { eq }) => eq(profiles.userId, user.id)
	});

	if (!profile) {
		error(404);
	}

	return profile;
});
