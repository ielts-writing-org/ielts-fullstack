import { completeAiRequest } from "#lib/server/data/ai-requests.ts";

/**
 * Wraps an AI provider stream so its completion (status, token usage, errors)
 * is recorded on the reserved ai_requests row while the bytes pass through.
 */
export function trackAiStream(
	stream: ReadableStream<Uint8Array>,
	requestId: string,
	startedAt: number
): ReadableStream<Uint8Array> {
	const reader = stream.getReader();
	let finished = false;
	let partial = "";
	const decoder = new TextDecoder();
	let inputTokens: number | null = null;
	let outputTokens: number | null = null;
	let providerError = false;
	const inspect = (chunk: string) => {
		partial += chunk;
		const lines = partial.split("\n");
		partial = lines.pop() ?? "";
		for (const line of lines) {
			if (!line.startsWith("data:")) continue;
			try {
				const frame: unknown = JSON.parse(line.slice(5).trim());
				if (!frame || typeof frame !== "object") continue;
				if ("error" in frame && frame.error) providerError = true;
				if (!("usage" in frame) || !frame.usage || typeof frame.usage !== "object") continue;
				const usage = frame.usage as Record<string, unknown>;
				const input = usage.input_tokens ?? usage.prompt_tokens;
				const output = usage.output_tokens ?? usage.completion_tokens;
				if (typeof input === "number" && Number.isFinite(input)) inputTokens = input;
				if (typeof output === "number" && Number.isFinite(output)) outputTokens = output;
			} catch {
				// Ignore incomplete or non-JSON SSE frames; the original bytes pass through unchanged.
			}
		}
	};
	const finish = async (status: "success" | "error", summary: string | null) => {
		if (finished) return;
		finished = true;
		try {
			await completeAiRequest(requestId, startedAt, {
				status,
				inputTokens,
				outputTokens,
				errorSummary: summary
			});
		} catch (cause) {
			console.error("AI telemetry update failed", cause instanceof Error ? cause.name : "unknown");
		}
	};

	return new ReadableStream<Uint8Array>({
		async pull(controller) {
			try {
				const next = await reader.read();
				if (next.done) {
					inspect(decoder.decode());
					if (partial.startsWith("data:")) inspect("\n");
					await finish(
						providerError ? "error" : "success",
						providerError ? "AI provider reported a stream error" : null
					);
					controller.close();
				} else {
					inspect(decoder.decode(next.value, { stream: true }));
					controller.enqueue(next.value);
				}
			} catch {
				await finish("error", "AI provider stream failed");
				controller.error(new Error("AI stream failed."));
			}
		},
		async cancel(reason) {
			try {
				await reader.cancel(reason);
			} finally {
				await finish("error", "Client cancelled stream");
			}
		}
	});
}
