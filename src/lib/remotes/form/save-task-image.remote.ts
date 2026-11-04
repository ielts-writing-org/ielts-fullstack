import { getApiSession } from "#lib/server/auth/session.ts";
import { tasks } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";
import { compressImageAsBlob } from "#lib/server/infrastructure/images.ts";
import { form, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import z from "zod";

const MAX_FILE_SIZE = 1 * 1024 * 1024;

export const saveTaskImage = form(
	z.object({
		taskId: z.uuidv7(),
		image: z.file().max(MAX_FILE_SIZE).mime(["image/jpeg", "image/png", "image/webp", "image/avif"])
	}),
	async ({ taskId, image }) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		const db = getDb(env.IELTS_WRITING_DB);
		const task = await db.query.tasks.findFirst({
			where: (tasks, { eq, and }) => and(eq(tasks.id, taskId), eq(tasks.userId, user.id))
		});

		if (!task) {
			error(404, "Task does not exist.");
		}

		const oldImageName = task.image;

		const newImageName = `${uuidv7()}.webp`;
		const compressed = await compressImageAsBlob(image);
		await env.IELTS_WRITING_BUCKET.put(newImageName, compressed);
		await db.update(tasks).set({ image: newImageName }).where(eq(tasks.id, taskId));

		if (oldImageName) {
			await env.IELTS_WRITING_BUCKET.delete(oldImageName);
		}

		return { success: true, imageName: newImageName };
	}
);
