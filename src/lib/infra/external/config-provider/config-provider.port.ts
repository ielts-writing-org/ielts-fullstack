import type { TaskId } from "#lib/utils/task-id.ts";

export interface ConfigProvider {
	getEvaluationPrompt(taskId: TaskId): Promise<string>;
	getChatPrompt(taskId: TaskId): Promise<string>;
}
