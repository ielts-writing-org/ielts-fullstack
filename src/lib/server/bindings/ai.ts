import { abortableStream } from "#lib/utils/abortable-stream.ts";
import { env } from "cloudflare:workers";

export function getAiCompletionAsStream(
	model: keyof AiModels,
	messages: ChatCompletionMessageParam[],
	signal: AbortSignal,
	options?: {
		maxCompletionToken?: number;
		seed?: number;
		responseSchema?: Record<string, unknown>;
		temperature?: number;
		instantMode?: boolean;
		sessionAffinity?: string;
	}
): Promise<ReadableStream> {
	return abortableStream(
		env.IELTS_WRITING_AI.run(
			model,
			{
				messages: messages,
				...(options?.seed ? { seed: options.seed } : {}),
				...(options?.temperature ? { temperature: options.temperature } : {}),
				...(options?.maxCompletionToken
					? { max_completion_tokens: options.maxCompletionToken }
					: {}),
				...(options?.instantMode
					? { chat_template_kwargs: { enable_thinking: !options.instantMode } }
					: {}),
				...(options?.responseSchema
					? {
							response_format: {
								type: "json_schema",
								json_schema: { name: "unnamed-schema", schema: options.responseSchema }
							}
						}
					: {}),
				stream: true
			},
			{
				extraHeaders: {
					...(options?.sessionAffinity
						? { "x-session-affinity": `practice-session-${options.sessionAffinity}` }
						: {})
				}
			}
		),
		signal
	);
}
