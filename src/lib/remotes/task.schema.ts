import { z } from "zod";
import { taskCategorySchema } from "#lib/domain/task.ts";
import { taskImageSchema } from "#lib/domain/task-image.ts";
import { taskPromptSchema } from "#lib/domain/task.ts";
import { taskSubcategorySchema } from "#lib/domain/task.ts";

export const getTaskDependantsInput = z.uuidv7();

export const saveTaskPromptInput = z.object({
	taskId: z.uuidv7(),
	prompt: z.string()
});

export const taskIdInput = z.object({
	taskId: z.uuidv7()
});

export const createTaskInput = z.object({
	category: taskCategorySchema,
	// An empty select submission arrives as "" and means "no subcategory".
	subcategory: z
		.union([taskSubcategorySchema, z.literal("")])
		.optional()
		.transform((value) => (value === "" ? null : value)),
	// Dropping prompt field means the prompt will be input later
	prompt: taskPromptSchema.optional().transform((value) => (value === undefined ? "" : value)),
	image: taskImageSchema.optional()
});

export const updateTaskInput = z.object({
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
});

export const saveTaskImageInput = z.object({
	taskId: z.uuidv7(),
	image: taskImageSchema
});
