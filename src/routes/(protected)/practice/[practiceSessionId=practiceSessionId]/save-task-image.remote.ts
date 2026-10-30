import { getApiSession } from "#lib/server/auth/index.ts";
import { tasks } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";
import { CfImagesClient } from "#lib/server/infrastructure/images-client/images-client.cf.ts";
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
		const imagesClient = new CfImagesClient(env.IELTS_WRITING_IMAGES);
		const compressed = await imagesClient.compressAsBlob(image);
		await env.IELTS_WRITING_BUCKET.put(newImageName, compressed);
		await db.update(tasks).set({ image: newImageName }).where(eq(tasks.id, taskId));

		if (oldImageName) {
			await env.IELTS_WRITING_BUCKET.delete(oldImageName);
		}

		return { success: true, imageName: newImageName };
	}
);
