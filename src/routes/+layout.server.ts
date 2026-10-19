import type { LayoutServerLoad } from "./$types";

export const load = (async (event) => {
	event.depends("data:profile");

	return {
		session: event.locals.session,
		user: event.locals.user,
		profile: event.locals.profile
	};
}) satisfies LayoutServerLoad;
