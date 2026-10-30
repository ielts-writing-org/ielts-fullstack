import type { TaskCategory } from "#lib/schemas/task-category.ts";

export class ConfigMissingError extends Error {
	constructor(
		public readonly key: string,
		public readonly taskCategory: TaskCategory
	) {
		super(`Configuration "${key}" is not configured for task ${taskCategory}`);
	}
}
