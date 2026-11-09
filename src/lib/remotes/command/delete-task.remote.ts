import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import z from "zod";
import { getApiSession } from "#lib/server/auth/session.ts";
import { getDatabase } from "#lib/server/db/index.ts";
import { practiceSessions, tasks } from "#lib/server/db/app.schema.ts";
import { deleteObject } from "#lib/server/infrastructure/bucket.ts";
import { getImagePath } from "#lib/utils/paths.ts";

export const deleteTask = command(
	z.object({
		taskId: z.uuidv7()
	}),
	async ({ taskId }) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		const db = getDatabase();
		const task = await db.query.tasks.findFirst({
			columns: { imageName: true },
			where: (fields, { and, eq }) => and(eq(fields.id, taskId), eq(fields.userId, user.id))
		});

		if (!task) {
			error(404);
		}

		await db.batch([
			db.delete(practiceSessions).where(eq(practiceSessions.taskId, taskId)),
			db.delete(tasks).where(eq(tasks.id, taskId))
		]);

		if (task.imageName) {
			await deleteObject(getImagePath(task.imageName));
		}

		return { success: true };
	}
);
