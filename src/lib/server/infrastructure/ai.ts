import { abortableStream } from "#lib/utils/abortable-stream.ts";
import { env } from "cloudflare:workers";

export async function getAiCompletionAsStream(
	model: keyof AiModels,
	messages: ChatCompletionMessageParam[],
	signal: AbortSignal,
	options?: {
		maxCompletionToken?: number;
		seed?: number;
		responseSchema?: Record<string, unknown>;
		temperature?: number;
		thinking?: boolean;
	}
): Promise<ReadableStream> {
	return await abortableStream(
		env.IELTS_WRITING_AI.run(model, {
			messages: messages,
			...(options?.seed ? { seed: options.seed } : {}),
			...(options?.temperature ? { temperature: options.temperature } : {}),
			...(options?.maxCompletionToken ? { maxCompletionToken: options.maxCompletionToken } : {}),
			...(options?.thinking ? { chat_template_kwargs: { enable_thinking: options.thinking } } : {}),
			...(options?.responseSchema
				? {
						response_format: {
							type: "json_schema",
							json_schema: { name: "unnamed-schema", schema: options.responseSchema }
						}
					}
				: {}),
			stream: true
		}),
		signal
	);
}
