import { type TaskCategory, taskCategorySchema } from "#lib/schemas/task-category.ts";

export function isValidTaskCategory(taskType: string): taskType is TaskCategory {
	return typeof taskType === "string" && taskCategorySchema.safeParse(taskType).success;
}
export function isValidUUIDv7(uuid: string) {
	const uuidv7Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidv7Regex.test(uuid);
}
