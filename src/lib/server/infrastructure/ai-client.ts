import { env } from "cloudflare:workers";
import type { TaskCategory } from "#lib/domain/task-category.ts";
import { abortableStream } from "#lib/utils/abortable-stream.ts";
import { ConfigProvider } from "./config-provider";
import type { AiRuntimeConfig } from "#lib/server/ai-settings.ts";

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
		signal: AbortSignal,
		runtime?: AiRuntimeConfig
	): Promise<ReadableStream> {
		const systemPrompt = await this.configProvider.getChatPrompt(taskCategory);
		const config = runtime ?? AI_CONFIGS;

		return await abortableStream(
			this.ai.run("chatModel" in config ? config.chatModel : config.id, {
				chat_template_kwargs: { enable_thinking: config.enableThinking },
				max_completion_tokens: config.maxOutputTokens,
				messages: this.includeSystemPrompt(messages, systemPrompt),
				seed: config.seed,
				stream: true,
				temperature: config.temperature
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
