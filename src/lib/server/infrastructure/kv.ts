import type { TaskCategory } from "#lib/domain/task-category.ts";
import { env } from "cloudflare:workers";

export const CONFIGS = {
	cacheTtl: 86_400,
	chatPromptPrefix: "chat-prompt-",
	evaluationPromptPrefix: "evaluation-prompt-"
};

export function getChatPrompt(taskCategory: TaskCategory): Promise<string> {
	return getPrompt(taskCategory, CONFIGS.chatPromptPrefix);
}

export function getEvaluationPrompt(taskCategory: TaskCategory): Promise<string> {
	return getPrompt(taskCategory, CONFIGS.evaluationPromptPrefix);
}

async function getPrompt(taskCategory: TaskCategory, key: string): Promise<string> {
	const value = await env.IELTS_WRITING_KV.get(key + taskCategory, { cacheTtl: CONFIGS.cacheTtl });

	if (value === null)
		throw new Error(`Config value not found for key: ${key}, category: ${taskCategory}`);

	return value;
}
