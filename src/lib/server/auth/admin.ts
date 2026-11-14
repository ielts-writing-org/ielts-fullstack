import { error } from "@sveltejs/kit";
import { env } from "cloudflare:workers";
import { getApiSession } from "#lib/server/auth/session.ts";
import { adminAuditLogs } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";

export async function requireAdmin(locals: App.Locals) {
	const { user } = getApiSession(locals);
	const db = getDb(env.IELTS_WRITING_DB.withSession("first-primary"));
	const current = await db.query.users.findFirst({
		where: (fields, { eq }) => eq(fields.id, user.id),
		columns: { id: true, role: true, banned: true, banExpires: true }
	});

	if (!current || current.role !== "admin") {
		error(403, "You do not have permission to access Admin.");
	}
	if (current.banned && (!current.banExpires || current.banExpires.getTime() > Date.now())) {
		error(403, "This account is locked.");
	}

	return { user, db };
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
