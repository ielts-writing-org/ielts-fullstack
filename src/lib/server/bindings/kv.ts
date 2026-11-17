import type { TaskCategory } from "#lib/domain/task-category.ts";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDatabase } from "../db";
import { aiSettings } from "../db/app.schema";

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

export async function setKVConfigValue(key: string, value: string) {
	await env.IELTS_WRITING_KV.put(key, value);
}

export async function getPromptOverride(key: string): Promise<string | null> {
	const db = getDatabase();
	const [setting] = await db
		.select({ value: aiSettings.value })
		.from(aiSettings)
		.where(eq(aiSettings.key, key))
		.limit(1);
	return setting?.value ?? null;
}
