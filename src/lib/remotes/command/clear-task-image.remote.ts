import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import z from "zod";
import { getApiSession } from "#lib/server/auth/session.ts";
import { getDatabase } from "#lib/server/db/index.ts";
import { tasks } from "#lib/server/db/app.schema.ts";
import { deleteObject } from "#lib/server/infrastructure/bucket.ts";
import { getImagePath } from "#lib/utils/paths.ts";

export const clearTaskImage = command(
	z.object({
		taskId: z.uuidv7()
	}),
	async ({ taskId }) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		const db = getDatabase();
		const task = await db.query.tasks.findFirst({
			where: (tasks, { eq, and }) => and(eq(tasks.id, taskId), eq(tasks.userId, user.id))
		});

		if (!task || !task.imageName) {
			error(404);
		}

		await db.update(tasks).set({ imageName: null }).where(eq(tasks.id, taskId));
		await deleteObject(getImagePath(task.imageName));

		return { success: true };
	}
);
