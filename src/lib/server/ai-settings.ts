import { env } from "cloudflare:workers";
import { inArray } from "drizzle-orm";
import { aiSettings } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";

export const AI_CHAT_MODEL_OPTIONS = [
	"@cf/google/gemma-4-26b-a4b-it",
	"@cf/meta/llama-4-scout-17b-16e-instruct"
] as const satisfies readonly (keyof AiModels)[];

export const AI_GRADING_MODEL_OPTIONS = ["@cf/google/gemma-4-26b-a4b-it"] as const satisfies readonly (keyof AiModels)[];

export type AiModel = (typeof AI_CHAT_MODEL_OPTIONS)[number];
export type AiGradingModel = (typeof AI_GRADING_MODEL_OPTIONS)[number];

// These defaults match the model and parameters used before Admin configuration existed.
export const DEFAULT_AI_RUNTIME = {
	chatModel: "@cf/google/gemma-4-26b-a4b-it" as AiModel,
	gradingModel: "@cf/google/gemma-4-26b-a4b-it" as AiGradingModel,
	enableThinking: false,
	maxOutputTokens: 4500,
	seed: 42,
	temperature: 0.2,
	chatDailyLimit: 0,
	gradingDailyLimit: 0
};

export type AiRuntimeConfig = typeof DEFAULT_AI_RUNTIME;

const runtimeKeys = [
	"chatModel",
	"gradingModel",
	"enableThinking",
	"maxOutputTokens",
	"seed",
	"temperature",
	"chatDailyLimit",
	"gradingDailyLimit"
] as const;

export async function getStoredAiSettings(keys: readonly string[]) {
	if (!keys.length) return new Map<string, string>();
	const db = getDb(env.IELTS_WRITING_DB.withSession("first-primary"));
	const rows = await db.select().from(aiSettings).where(inArray(aiSettings.key, [...keys]));
	return new Map(rows.map(({ key, value }) => [key, value]));
}

export async function getAiRuntimeConfig(
	defaults: AiRuntimeConfig = DEFAULT_AI_RUNTIME
): Promise<AiRuntimeConfig> {
	const stored = await getStoredAiSettings(runtimeKeys);
	const chatModel = (fallback: AiModel): AiModel => {
		const value = stored.get("chatModel");
		return value && AI_CHAT_MODEL_OPTIONS.includes(value as AiModel) ? (value as AiModel) : fallback;
	};
	const gradingModel = (fallback: AiGradingModel): AiGradingModel => {
		const value = stored.get("gradingModel");
		return value && AI_GRADING_MODEL_OPTIONS.includes(value as AiGradingModel)
			? (value as AiGradingModel)
			: fallback;
	};
	const number = (key: string, fallback: number, min: number, max: number, integer = true) => {
		const value = Number(stored.get(key));
		return Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value))
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
