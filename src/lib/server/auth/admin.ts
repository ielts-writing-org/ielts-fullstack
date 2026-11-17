import { error } from "@sveltejs/kit";
import { getApiSession } from "#lib/server/auth/session.ts";
import { adminAuditLogs } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";

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

export async function recordAdminAction(
	db: ReturnType<typeof getDb>,
	actorUserId: string,
	action: string,
	targetType: string,
	targetId: string | null,
	metadata: Record<string, string | number | boolean | null> = {}
) {
	await db.insert(adminAuditLogs).values({ actorUserId, action, targetType, targetId, metadata });
}
