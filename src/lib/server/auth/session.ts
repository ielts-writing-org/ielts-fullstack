import { resolve } from "$app/paths";
import { error, redirect } from "@sveltejs/kit";

export function getApiSession(locals: App.Locals) {
	const { session, user } = locals;

	if (!session || !user) {
		error(401);
	}

	return { session, user };
}
export function getPageSession(locals: App.Locals) {
	const { session, user } = locals;

	if (!session || !user) {
		redirect(307, resolve("/(public)/sign-in"));
	}

	return { session, user };
}
