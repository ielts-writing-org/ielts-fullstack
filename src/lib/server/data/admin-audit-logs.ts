import { eq, sql } from "drizzle-orm";
import { adminAuditLogs } from "../db/app.schema";
import { users } from "../db/auth.schema";
import { getDatabase } from "../db/index.ts";

export function recordAdminAction(
	actorUserId: string,
	action: string,
	targetType: string,
	targetId: string | null,
	metadata: Record<string, string | number | boolean | null> = {}
) {
	return getDatabase()
		.insert(adminAuditLogs)
		.values({ actorUserId, action, targetType, targetId, metadata });
}

export function listRecentAuditLogs(limit: number) {
	return getDatabase()
		.select({
			id: adminAuditLogs.id,
			actor: users.name,
			action: adminAuditLogs.action,
			targetType: adminAuditLogs.targetType,
			targetId: adminAuditLogs.targetId,
			metadata: adminAuditLogs.metadata,
			createdAt: adminAuditLogs.createdAt
		})
		.from(adminAuditLogs)
		.leftJoin(users, eq(adminAuditLogs.actorUserId, users.id))
		.orderBy(sql`${adminAuditLogs.createdAt} DESC`)
		.limit(limit);
}
