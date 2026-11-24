import { z } from "zod";
import { adminPagingSchema, adminSearchSchema } from "./admin.schema.ts";
import { taskCategorySchema } from "#lib/domain/task.ts";
import { taskSubcategorySchema } from "#lib/domain/task.ts";

export const getAdminTasksInput = adminPagingSchema.extend({
	search: adminSearchSchema,
	category: z.enum(["all", "1", "2"]),
	source: z.enum(["all", "system", "personal"]),
	visibility: z.enum(["all", "shown", "hidden"]),
	status: z.enum(["active", "archived"])
});

export const adminTaskFieldsSchema = z.object({
	category: taskCategorySchema,
	subcategory: z.union([taskSubcategorySchema, z.literal("")]).transform((value) => value || null),
	topic: z
		.string()
		.trim()
		.max(160)
		.transform((value) => value || null),
	difficulty: z
		.enum(["beginner", "intermediate", "advanced", ""])
		.transform((value) => value || null),
	prompt: z.string().trim().min(1).max(20_000),
	published: z.boolean()
});

export const createAdminTaskInput = adminTaskFieldsSchema;

export const updateAdminTaskInput = adminTaskFieldsSchema.extend({ taskId: z.uuidv7() });

export const adminTaskIdInput = z.object({ taskId: z.uuidv7() });

export const setAdminTaskVisibilityInput = z.object({
	taskId: z.uuidv7(),
	published: z.boolean()
});

export const saveAdminTaskImageInput = z.object({
	taskId: z.uuidv7(),
	image: z
		.file()
		.max(1 * 1024 * 1024)
		.mime(["image/jpeg", "image/png", "image/webp", "image/avif"]),
	published: z
		.enum(["true", "false"])
		.default("false")
		.transform((value) => value === "true")
});
