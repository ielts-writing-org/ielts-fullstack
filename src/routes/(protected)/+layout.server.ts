import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import { resolve } from "$app/paths";

export const load = (async (event) => {
	if (!event.locals.session) {
		redirect(307, resolve("/(public)/signIn"));
	}
	return {};
}) satisfies LayoutServerLoad;
