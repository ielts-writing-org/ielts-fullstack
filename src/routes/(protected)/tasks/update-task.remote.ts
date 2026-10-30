import { isValidSubcategoryFor } from "#lib/mappings/task-subcategory.ts";
import { getApiSession } from "#lib/server/auth/index.ts";
import { tasks } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";
import { CfImagesClient } from "#lib/server/infrastructure/images-client/images-client.cf.ts";
import { form, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { z } from "zod";
import { taskImageSchema } from "#lib/schemas/task-image.ts";
import { taskSubcategorySchema } from "#lib/schemas/task-subcategory.ts";

export const updateTask = form(
	z.object({
		taskId: z.uuidv7(),
		// An empty select submission arrives as "" and means "no subcategory".
		subcategory: z
			.union([taskSubcategorySchema, z.literal("")])
			.optional()
			.transform((value) => (value === "" ? undefined : value)),
		prompt: z.string().trim().min(1, "The prompt is required.").max(20000),
		image: taskImageSchema.optional()
	}),
	async ({ taskId, subcategory, prompt, image }) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		const db = getDb(env.IELTS_WRITING_DB);
		const task = await db.query.tasks.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.id, taskId), eq(fields.userId, user.id))
		});

		if (!task) {
			error(404, "Task does not exist.");
		}

		if (subcategory && !isValidSubcategoryFor(task.category, subcategory)) {
			error(400, "The subcategory does not belong to the task category.");
		}

		if (image) {
			const newImageName = `${uuidv7()}.webp`;
			const imagesClient = new CfImagesClient(env.IELTS_WRITING_IMAGES);
			const compressed = await imagesClient.compressAsBlob(image);
			await env.IELTS_WRITING_BUCKET.put(newImageName, compressed);
			await db.update(tasks).set({ image: newImageName }).where(eq(tasks.id, taskId));

			if (task.image) {
				await env.IELTS_WRITING_BUCKET.delete(task.image);
			}
		}

		await db
			.update(tasks)
			.set({ prompt, subcategory: subcategory ?? null })
			.where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));

		return { success: true };
	}
);
