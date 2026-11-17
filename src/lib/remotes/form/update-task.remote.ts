import { form, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { z } from "zod";
import { getApiSession } from "#lib/server/auth/session.ts";
import { getDatabase } from "#lib/server/db/index.ts";
import { tasks } from "#lib/server/db/app.schema.ts";
import { taskPromptSchema } from "#lib/domain/task-prompt.ts";
import { taskImageSchema } from "#lib/domain/task-image.ts";
import { isValidSubcategory, taskSubcategorySchema } from "#lib/domain/task-subcategory.ts";
import { deleteObject, putObject } from "#lib/server/bindings/bucket.ts";
import { compressImageAsBlob } from "#lib/server/bindings/images.ts";
import { getImagePath } from "#lib/utils/paths.ts";

export const updateTask = form(
	z.object({
		taskId: z.uuidv7(),
		// An empty select submission arrives as "" and means "no subcategory".
		subcategory: z
			.union([taskSubcategorySchema, z.literal("")])
			.optional()
			.transform((value) => (value === "" ? null : value)),
		prompt: taskPromptSchema,
		image: taskImageSchema.optional(),
		// Sent by the edit form when the user asked to remove the current image.
		removeImage: z
			.union([z.literal("true"), z.literal("")])
			.optional()
			.transform((value) => value === "true")
	}),
	async ({ taskId, subcategory, prompt, image, removeImage }) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		const db = getDatabase();
		const task = await db.query.tasks.findFirst({
			where: {
				id: taskId,
				userId: user.id
			}
		});

		if (!task) {
			error(404);
		}

		if (subcategory && !isValidSubcategory(task.category, subcategory)) {
			error(400);
		}

		if (image) {
			const newImageName = `${uuidv7()}.webp`;
			const compressed = await compressImageAsBlob(image);
			await putObject(getImagePath(newImageName), compressed);
			await db
				.update(tasks)
				.set({ prompt, subcategory, imageName: newImageName })
				.where(eq(tasks.id, taskId));

			if (task.imageName) {
				await deleteObject(getImagePath(task.imageName));
			}
		} else if (removeImage) {
			await db
				.update(tasks)
				.set({ prompt, subcategory, imageName: null })
				.where(eq(tasks.id, taskId));

			if (task.imageName) {
				await deleteObject(getImagePath(task.imageName));
			}
		} else {
			await db.update(tasks).set({ prompt, subcategory }).where(eq(tasks.id, taskId));
		}

		return { success: true };
	}
);
