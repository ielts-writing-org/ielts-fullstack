import type { LayoutServerLoad } from "./$types";
import { requireAdmin } from "#lib/server/auth/admin.ts";
import { getPageSession } from "#lib/server/auth/session.ts";

export const load = (async ({ locals }) => {
	getPageSession(locals);
	const { user } = await requireAdmin(locals);
	return { adminUser: { id: user.id, name: user.name } };
}) satisfies LayoutServerLoad;
