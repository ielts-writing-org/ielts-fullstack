import { getApiSession } from "#lib/server/auth/index.ts";
import { practiceSessions, tasks } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";
import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import z from "zod";

export const deleteTask = command(
	z.object({
		taskId: z.uuidv7()
	}),
	async ({ taskId }) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		const db = getDb(env.IELTS_WRITING_DB);
		const task = await db.query.tasks.findFirst({
			columns: { image: true },
			where: (fields, { and, eq }) => and(eq(fields.id, taskId), eq(fields.userId, user.id))
		});

		if (!task) {
			error(404, "Task does not exist.");
		}

		// D1 has no interactive transactions: delete the dependent practice
		// sessions first (their chat messages and evaluations cascade), then the
		// task itself. practice_sessions.task_id is onDelete: restrict, so the
		// order matters.
		await db.batch([
			db.delete(practiceSessions).where(eq(practiceSessions.taskId, taskId)),
			db.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)))
		]);

		if (task.image) {
			await env.IELTS_WRITING_BUCKET.delete(task.image);
		}

		return { success: true };
	}
);
