import {
	AI_CHAT_MODEL_OPTIONS,
	AI_GRADING_MODEL_OPTIONS,
	AI_RUNTIME_KEYS,
	type AiGradingModel,
	type AiModel,
	type AiRuntimeConfig,
	DEFAULT_AI_RUNTIME
} from "#lib/domain/ai-config.ts";
import type { TaskCategory } from "#lib/domain/task.ts";
import { getStoredAiSettings } from "#lib/server/data/ai-settings.ts";

export async function getChatPrompt(taskCategory: TaskCategory): Promise<string> {
	return getStoredPrompt(`chat-prompt-${taskCategory}`);
}

export async function getEvaluationPrompt(taskCategory: TaskCategory): Promise<string> {
	return getStoredPrompt(`evaluation-prompt-${taskCategory}`);
}

async function getStoredPrompt(key: string): Promise<string> {
	const stored = await getStoredAiSettings([key]);
	const value = stored.get(key)?.trim();
	if (!value) {
		throw new Error(`Config value not found for key: ${key}`);
	}
	return value;
}

export async function getAiRuntimeConfig(
	defaults: AiRuntimeConfig = DEFAULT_AI_RUNTIME
): Promise<AiRuntimeConfig> {
	const stored = await getStoredAiSettings([...AI_RUNTIME_KEYS]);
	const chatModel = (fallback: AiModel): AiModel => {
		const value = stored.get("chatModel");
		return value && AI_CHAT_MODEL_OPTIONS.includes(value as AiModel)
			? (value as AiModel)
			: fallback;
	};
	const gradingModel = (fallback: AiGradingModel): AiGradingModel => {
		const value = stored.get("gradingModel");
		return value && AI_GRADING_MODEL_OPTIONS.includes(value as AiGradingModel)
			? (value as AiGradingModel)
			: fallback;
	};
	const number = (key: string, fallback: number, min: number, max: number, integer = true) => {
		const value = Number(stored.get(key));
		return Number.isFinite(value) &&
			value >= min &&
			value <= max &&
			(!integer || Number.isInteger(value))
			? value
			: fallback;
	};
	const bool = (key: string, fallback: boolean) => {
		const value = stored.get(key);
		return value === "true" ? true : value === "false" ? false : fallback;
	};

	return {
		chatModel: chatModel(defaults.chatModel),
		gradingModel: gradingModel(defaults.gradingModel),
		enableThinking: bool("enableThinking", defaults.enableThinking),
		maxOutputTokens: number("maxOutputTokens", defaults.maxOutputTokens, 128, 8192),
		seed: number("seed", defaults.seed, 0, 2_147_483_647),
		temperature: number("temperature", defaults.temperature, 0, 2, false),
		chatDailyLimit: number("chatDailyLimit", defaults.chatDailyLimit, 0, 1000),
		gradingDailyLimit: number("gradingDailyLimit", defaults.gradingDailyLimit, 0, 500)
	};
}
