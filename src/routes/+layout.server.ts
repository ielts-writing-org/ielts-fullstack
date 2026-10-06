import type { LayoutServerLoad } from "./$types";

export const load = (async (event) => {
	return {
		theme: event.locals.theme,
		session: event.locals.session
	};
}) satisfies LayoutServerLoad;
