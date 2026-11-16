import type { LayoutServerLoad } from "./$types";

// TODO: Layout load won't rerun when locals changed by hooks
export const load = (async ({ locals }) => {
	return {
		session: locals.session,
		user: locals.user
	};
}) satisfies LayoutServerLoad;
