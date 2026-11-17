import type { LayoutServerLoad } from "./$types";
import { getAdminSession } from "#lib/server/auth/admin.ts";
import { redirect } from "@sveltejs/kit";
import { resolve } from "$app/paths";

export const load = (async ({ locals }) => {
	if (!locals.session) {
		redirect(307, resolve("/(public)/sign-in"));
	}
	const { user } = await getAdminSession(locals);
	return { adminUser: { id: user.id, name: user.name } };
}) satisfies LayoutServerLoad;
