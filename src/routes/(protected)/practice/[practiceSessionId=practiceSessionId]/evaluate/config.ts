type AiConfig = {
	enableThinking: boolean;
	id: keyof AiModels;
	maxOutputTokens: number;
	seed: number;
	temperature: number;
};

export const AI_CONFIGS = {
	enableThinking: false,
	id: "@cf/google/gemma-4-26b-a4b-it",
	maxOutputTokens: 4500,
	seed: 42,
	temperature: 0.2
} as const satisfies AiConfig;
