import type { LayoutServerLoad } from "./$types";

export const load = (async ({ locals, depends }) => {
	depends("data:profile");

	return {
		session: locals.session,
		user: locals.user,
		profile: locals.profile
	};
}) satisfies LayoutServerLoad;
