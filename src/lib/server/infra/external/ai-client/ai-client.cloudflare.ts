import { evaluationSchema } from "#lib/schemas/evaluation.ts";
import { abortableStream } from "#lib/utils/abortable-stream.ts";
import type { ConfigProvider } from "../config-provider/config-provider.port";
import type { AiClient, AiClientMessages } from "./ai-client.port";
import { AI_CONFIGS } from "./config";

export class CloudflareAiClient implements AiClient {
	constructor(
		private readonly ai: Ai,
		private readonly configProvider: ConfigProvider
	) {}
	async chat(
		messages: AiClientMessages,
		promptId: "1" | "2",
		signal: AbortSignal
	): Promise<ReadableStream> {
		const systemPrompt = await this.configProvider.getChatPrompt(promptId);

		return await abortableStream(
			this.ai.run(AI_CONFIGS.id, {
				seed: AI_CONFIGS.seed,
				temperature: AI_CONFIGS.temperature,
				max_completion_tokens: AI_CONFIGS.maxOutputTokens,
				messages: this.includeSystemPrompt(messages, systemPrompt),
				chat_template_kwargs: { enable_thinking: AI_CONFIGS.enableThinking },
				stream: true
			}),
			signal
		);
	}

	async evaluate(
		messages: AiClientMessages,
		promptId: "1" | "2",
		signal: AbortSignal
	): Promise<ReadableStream> {
		const systemPrompt = await this.configProvider.getEvaluationPrompt(promptId);

		return await abortableStream(
			this.ai.run(AI_CONFIGS.id, {
				seed: AI_CONFIGS.seed,
				temperature: AI_CONFIGS.temperature,
				max_completion_tokens: AI_CONFIGS.maxOutputTokens,
				messages: this.includeSystemPrompt(messages, systemPrompt),
				response_format: {
					type: "json_schema",
					json_schema: {
						name: "ielts-writing-evaluation-schema",
						schema: evaluationSchema.toJSONSchema()
					}
				},
				chat_template_kwargs: { enable_thinking: AI_CONFIGS.enableThinking },
				stream: true
			}),
			signal
		);
	}

	private includeSystemPrompt(messages: AiClientMessages, systemPrompt: string): AiClientMessages {
		const mMessages = [
			{ role: "system", content: [{ type: "text", text: systemPrompt }] },
			...messages
		] satisfies AiClientMessages;
		return mMessages;
	}
}
