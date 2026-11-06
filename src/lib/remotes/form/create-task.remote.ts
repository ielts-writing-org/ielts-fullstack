import { isValidSubcategory } from "#lib/domain/task-subcategory.ts";
import { getApiSession } from "#lib/server/auth/session.ts";
import { tasks } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";
import { form, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { z } from "zod";
import { taskCategorySchema } from "#lib/domain/task-category.ts";
import { taskImageSchema } from "#lib/domain/task-image.ts";
import { taskSubcategorySchema } from "#lib/domain/task-subcategory.ts";
import { compressImageAsBlob } from "#lib/server/infrastructure/images.ts";
import { taskPromptSchema } from "#lib/domain/task-prompt.ts";
import { putObject } from "#lib/server/infrastructure/bucket.ts";

export const createTask = form(
	z.object({
		category: taskCategorySchema,
		// An empty select submission arrives as "" and means "no subcategory".
		subcategory: z
			.union([taskSubcategorySchema, z.literal("")])
			.optional()
			.transform((value) => (value === "" ? null : value)),
		// Dropping prompt field means the prompt will be input later
		prompt: taskPromptSchema.optional().transform((value) => (value === undefined ? "" : value)),
		image: taskImageSchema.optional()
	}),
	async ({ category, subcategory, prompt, image }) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		if (subcategory && !isValidSubcategory(category, subcategory)) {
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
			const compressed = await compressImageAsBlob(image);
			await putObject(imageName, compressed);
			await db.update(tasks).set({ imageName }).where(eq(tasks.id, createdTask.id));
		}

		return { success: true, taskId: createdTask.id };
	}
);
