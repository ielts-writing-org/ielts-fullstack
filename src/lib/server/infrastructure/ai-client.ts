import { env } from "cloudflare:workers";

import type { TaskCategory } from "#lib/schemas/task-category.ts";

import { evaluationSchema } from "#lib/schemas/evaluation.ts";
import { abortableStream } from "#lib/utils/abortable-stream.ts";

import { ConfigProvider } from "./config-provider";

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

export type AiClientMessages = AiModels[typeof AI_CONFIGS.id]["inputs"]["messages"];

export class AiClient {
	static get instance() {
		return (AiClient.#instance ??= new AiClient(ConfigProvider.instance, env.IELTS_WRITING_AI));
	}

	static #instance: AiClient;

	constructor(
		private readonly configProvider: ConfigProvider,
		private readonly ai: Ai
	) {}

	async chat(
		messages: AiClientMessages,
		taskCategory: TaskCategory,
		signal: AbortSignal
	): Promise<ReadableStream> {
		const systemPrompt = await this.configProvider.getChatPrompt(taskCategory);

		return await abortableStream(
			this.ai.run(AI_CONFIGS.id, {
				chat_template_kwargs: { enable_thinking: AI_CONFIGS.enableThinking },
				max_completion_tokens: AI_CONFIGS.maxOutputTokens,
				messages: this.includeSystemPrompt(messages, systemPrompt),
				seed: AI_CONFIGS.seed,
				stream: true,
				temperature: AI_CONFIGS.temperature
			}),
			signal
		);
	}

	async evaluate(
		messages: AiClientMessages,
		taskCategory: TaskCategory,
		signal: AbortSignal
	): Promise<ReadableStream> {
		const systemPrompt = await this.configProvider.getEvaluationPrompt(taskCategory);

		return await abortableStream(
			this.ai.run(AI_CONFIGS.id, {
				chat_template_kwargs: { enable_thinking: AI_CONFIGS.enableThinking },
				max_completion_tokens: AI_CONFIGS.maxOutputTokens,
				messages: this.includeSystemPrompt(messages, systemPrompt),
				response_format: {
					json_schema: {
						name: "ielts-writing-evaluation-schema",
						schema: evaluationSchema.toJSONSchema()
					},
					type: "json_schema"
				},
				seed: AI_CONFIGS.seed,
				stream: true,
				temperature: AI_CONFIGS.temperature
			}),
			signal
		);
	}

	private includeSystemPrompt(messages: AiClientMessages, systemPrompt: string): AiClientMessages {
		return [
			{ content: [{ text: systemPrompt, type: "text" }], role: "system" },
			...messages
		] satisfies AiClientMessages;
	}
}
