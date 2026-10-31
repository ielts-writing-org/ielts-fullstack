import { getApiSession } from "#lib/server/auth/index.ts";
import { evaluations, practiceSessions, tasks } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";
import { getRequestEvent, query } from "$app/server";
import { error } from "@sveltejs/kit";
import { env } from "cloudflare:workers";
import { and, desc, eq } from "drizzle-orm";
import z from "zod";

export const getTaskDependants = query(z.uuidv7(), async (taskId) => {
	const { locals } = getRequestEvent();
	const { user } = getApiSession(locals);

	const db = getDb(env.IELTS_WRITING_DB);
	const task = await db.query.tasks.findFirst({
		columns: { id: true },
		where: (fields, { and, eq }) => and(eq(fields.id, taskId), eq(fields.userId, user.id))
	});

	if (!task) {
		error(404, "Task does not exist.");
	}

	const rows = await db
		.select({
			id: practiceSessions.id,
			name: practiceSessions.name,
			type: practiceSessions.type,
			updatedAt: practiceSessions.updatedAt,
			evaluationResult: evaluations.result
		})
		.from(practiceSessions)
		.leftJoin(evaluations, eq(evaluations.practiceSessionId, practiceSessions.id))
		.where(eq(practiceSessions.taskId, taskId))
		.orderBy(desc(practiceSessions.updatedAt));

	return {
		sessions: rows.map((row) => ({
			id: row.id,
			name: row.name,
			type: row.type,
			updatedAt: row.updatedAt,
			estimatedBand: row.evaluationResult?.estimatedBand
		}))
	};
});
