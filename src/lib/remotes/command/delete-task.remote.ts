import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import z from "zod";
import { getApiSession } from "#lib/server/auth/session.ts";
import { getDatabase } from "#lib/server/db/index.ts";
import { practiceSessions, tasks } from "#lib/server/db/app.schema.ts";
import { deleteObject } from "#lib/server/bindings/bucket.ts";
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
			where: {
				id: taskId,
				userId: user.id
			}
		});

		if (!task) {
			error(404);
		}

		const result1 = await db.delete(practiceSessions).where(eq(practiceSessions.taskId, taskId));
		if (result1.meta.changes === 0) {
			error(404);
		}

		const result2 = await db.delete(tasks).where(eq(tasks.id, taskId));
		if (result2.meta.changes === 0) {
			error(404);
		}

		if (task.imageName) {
			await deleteObject(getImagePath(task.imageName));
		}

		return { success: true };
	}
);
