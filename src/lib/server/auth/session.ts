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

export async function getAdminSession(locals: App.Locals) {
	const { user } = getApiSession(locals);

	if (!user || user.role !== "admin") {
		error(403, "You do not have permission to access Admin.");
	}
	if (user.banned && (!user.banExpires || user.banExpires.getTime() > Date.now())) {
		error(403, "This account is locked.");
	}

	return { user };
}
