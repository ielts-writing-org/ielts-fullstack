import { isValidSubcategoryFor } from "#lib/mappings/task-subcategory.ts";
import { getApiSession } from "#lib/server/auth/index.ts";
import { tasks } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";
import { CfImagesClient } from "#lib/server/infrastructure/images-client/images-client.cf.ts";
import { form, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { z } from "zod";
import { taskCategorySchema } from "#lib/schemas/task-category.ts";
import { taskImageSchema } from "#lib/schemas/task-image.ts";
import { taskSubcategorySchema } from "#lib/schemas/task-subcategory.ts";

export const createTask = form(
	z.object({
		category: taskCategorySchema,
		// An empty select submission arrives as "" and means "no subcategory".
		subcategory: z
			.union([taskSubcategorySchema, z.literal("")])
			.optional()
			.transform((value) => (value === "" ? undefined : value)),
		prompt: z.string().trim().min(1, "The prompt is required.").max(20000),
		image: taskImageSchema.optional()
	}),
	async ({ category, subcategory, prompt, image }) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		if (subcategory && !isValidSubcategoryFor(category, subcategory)) {
			error(400, "The subcategory does not belong to the selected task category.");
		}

		const db = getDb(env.IELTS_WRITING_DB);
		const [createdTask] = await db
			.insert(tasks)
			.values({
				userId: user.id,
				category,
				subcategory: subcategory ?? null,
				prompt
			})
			.returning({ id: tasks.id });

		if (image) {
			const imageName = `${uuidv7()}.webp`;
			const imagesClient = new CfImagesClient(env.IELTS_WRITING_IMAGES);
			const compressed = await imagesClient.compressAsBlob(image);
			await env.IELTS_WRITING_BUCKET.put(imageName, compressed);
			await db.update(tasks).set({ image: imageName }).where(eq(tasks.id, createdTask.id));
		}

		return { success: true, taskId: createdTask.id };
	}
);
