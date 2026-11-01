import { getApiSession } from "#lib/server/auth/index.ts";
import { getRequestEvent, query } from "$app/server";

export const getProfile = query(async () => {
	const { locals } = getRequestEvent();
	const { profile } = getApiSession(locals);

	return profile;
});
