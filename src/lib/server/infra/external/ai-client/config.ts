type AiConfig = {
	id: keyof AiModels;
	seed: number;
	temperature: number;
	maxOutputTokens: number;
	enableThinking: boolean;
};

export const AI_CONFIGS = {
	id: "@cf/google/gemma-4-26b-a4b-it",
	seed: 42,
	temperature: 0.2,
	maxOutputTokens: 4500,
	enableThinking: false
} as const satisfies AiConfig;
