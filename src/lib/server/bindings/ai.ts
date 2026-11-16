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
		enableThinking?: boolean;
		sessionAffinity?: string;
	}
): Promise<ReadableStream> {
	const enableThinking =
		options?.enableThinking ??
		(options?.instantMode !== undefined ? !options.instantMode : undefined);
	return abortableStream(
		env.IELTS_WRITING_AI.run(
			model,
			{
				messages: messages,
				...(options?.seed !== undefined ? { seed: options.seed } : {}),
				...(options?.temperature !== undefined ? { temperature: options.temperature } : {}),
				...(options?.maxCompletionToken !== undefined
					? { max_completion_tokens: options.maxCompletionToken }
					: {}),
				...(enableThinking !== undefined
					? { chat_template_kwargs: { enable_thinking: enableThinking } }
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
