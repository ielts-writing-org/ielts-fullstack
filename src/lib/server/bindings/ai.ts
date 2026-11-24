import { env } from "cloudflare:workers";

/**
 * Cancels the provider stream on client abort so upstream usage stops.
 * A locked stream is left alone; cancellation then propagates upstream on its own.
 */
async function abortableStream(
	promise: Promise<ReadableStream>,
	signal: AbortSignal
): Promise<ReadableStream> {
	const stream = await promise;
	if (signal.aborted) {
		cancelStream(stream);
		return stream;
	}
	signal.addEventListener("abort", () => cancelStream(stream), { once: true });
	return stream;
}

function cancelStream(stream: ReadableStream) {
	try {
		void stream.cancel().catch(() => {});
	} catch {
		// already locked by the response pipeline; cancellation propagates upstream on its own
	}
}

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
				...(options?.seed !== undefined ? { seed: options.seed } : {}),
				...(options?.temperature !== undefined ? { temperature: options.temperature } : {}),
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
