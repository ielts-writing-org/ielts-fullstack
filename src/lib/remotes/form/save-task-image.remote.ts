import { form, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import z from "zod";
import { getApiSession } from "#lib/server/auth/session.ts";
import { getDatabase } from "#lib/server/db/index.ts";
import { tasks } from "#lib/server/db/app.schema.ts";
import { taskImageSchema } from "#lib/domain/task-image.ts";
import { deleteObject, putObject } from "#lib/server/infrastructure/bucket.ts";
import { compressImageAsBlob } from "#lib/server/infrastructure/images.ts";

export const saveTaskImage = form(
	z.object({
		taskId: z.uuidv7(),
		image: taskImageSchema
	}),
	async ({ taskId, image }) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		const db = getDatabase();
		const task = await db.query.tasks.findFirst({
			where: (tasks, { eq, and }) => and(eq(tasks.id, taskId), eq(tasks.userId, user.id))
		});

		if (!task) {
			error(404);
		}

		const oldImageName = task.imageName;

		const newImageName = `${uuidv7()}.webp`;
		const compressed = await compressImageAsBlob(image);
		await putObject(newImageName, compressed);
		await db.update(tasks).set({ imageName: newImageName }).where(eq(tasks.id, taskId));

		if (oldImageName) {
			await deleteObject(oldImageName);
		}

		return { success: true, imageName: newImageName };
	}
);
