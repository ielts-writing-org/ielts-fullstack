import { getSessionApi } from "#lib/server/auth.ts";
import { tasks } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";
import { ImagesClient } from "#lib/server/infrastructure/images-client.ts";
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
		const { user } = getSessionApi(locals);

		const db = getDb(env.IELTS_WRITING_DB);
		const task = await db.query.tasks.findFirst({
			where: (tasks, { eq, and }) => and(eq(tasks.id, taskId), eq(tasks.userId, user.id))
		});

		if (!task) {
			error(404, "Task does not exist.");
		}

		let imageName = task.image;
		if (imageName) {
			await env.IELTS_WRITING_BUCKET.delete(imageName);
		}

		imageName = `${uuidv7()}.webp`;
		const compressed = await ImagesClient.instance.compressAsBlob(image);
		await env.IELTS_WRITING_BUCKET.put(imageName, compressed);
		await db.update(tasks).set({ image: imageName }).where(eq(tasks.id, taskId));

		return { success: true };
	}
);
