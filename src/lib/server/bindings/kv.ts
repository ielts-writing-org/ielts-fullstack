import type { TaskCategory } from "#lib/domain/task-category.ts";
import { env } from "cloudflare:workers";

export const CONFIGS = {
	cacheTtl: 86_400,
	chatPromptPrefix: "chat-prompt-",
	evaluationPromptPrefix: "evaluation-prompt-"
};

export function getChatPrompt(taskCategory: TaskCategory): Promise<string> {
	return getKVConfigValue(CONFIGS.chatPromptPrefix + taskCategory);
}

export function getEvaluationPrompt(taskCategory: TaskCategory): Promise<string> {
	return getKVConfigValue(CONFIGS.evaluationPromptPrefix + taskCategory);
}

export async function getKVConfigValue(key: string): Promise<string> {
	const value = await env.IELTS_WRITING_KV.get(key, { cacheTtl: CONFIGS.cacheTtl });

	if (value === null) {
		throw new Error(`Config value not found for key: ${key}`);
	}

	return value;
}
