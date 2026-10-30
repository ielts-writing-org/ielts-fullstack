import type { TaskCategory } from "#lib/schemas/task-category.ts";

export interface ConfigProvider {
	getChatPrompt(taskCategory: TaskCategory): Promise<string>;
	getEvaluationPrompt(taskCategory: TaskCategory): Promise<string>;
}
