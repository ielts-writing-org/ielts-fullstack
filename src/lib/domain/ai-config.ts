export const AI_CHAT_MODEL_OPTIONS = [
	"@cf/google/gemma-4-26b-a4b-it",
	"@cf/meta/llama-4-scout-17b-16e-instruct"
] as const satisfies readonly (keyof AiModels)[];

export const AI_GRADING_MODEL_OPTIONS = [
	"@cf/google/gemma-4-26b-a4b-it"
] as const satisfies readonly (keyof AiModels)[];

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

export const AI_RUNTIME_KEYS = [
	"chatModel",
	"gradingModel",
	"enableThinking",
	"maxOutputTokens",
	"seed",
	"temperature",
	"chatDailyLimit",
	"gradingDailyLimit"
] as const;
