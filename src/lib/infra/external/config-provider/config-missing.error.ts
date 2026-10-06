import type { TaskId } from "#lib/utils/task-id.ts";

export class ConfigMissingError extends Error {
	constructor(
		public readonly key: string,
		public readonly taskId: TaskId
	) {
		super(`Configuration "${key}" is not configured for task ${taskId}`);
	}
}
