import { beforeEach, describe, expect, test, vi } from "vitest";
import { trackAiStream } from "./ai-telemetry.ts";

vi.mock("#lib/server/data/ai-requests.ts", () => ({
	completeAiRequest: vi.fn(async () => {})
}));

import { completeAiRequest } from "#lib/server/data/ai-requests.ts";

const completeAiRequestMock = vi.mocked(completeAiRequest);

beforeEach(() => {
	completeAiRequestMock.mockClear();
});

/** Builds a provider stream that emits the given text chunks. */
function providerStream(frames: string[]): ReadableStream<Uint8Array> {
	return new ReadableStream<Uint8Array>({
		start(controller) {
			const encoder = new TextEncoder();
			for (const frame of frames) {
				controller.enqueue(encoder.encode(frame));
			}
			controller.close();
		}
	});
}

/** Consumes the tracked stream exactly like the browser response body would. */
async function drain(stream: ReadableStream<Uint8Array>): Promise<string> {
	const decoder = new TextDecoder();
	const reader = stream.getReader();
	let text = "";
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		text += decoder.decode(value);
	}
	return text;
}

describe("trackAiStream()", () => {
	test("passes provider bytes through unchanged and records success with token usage", async () => {
		const frames = [
			'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
			'data: {"choices":[{"delta":{"content":" there"}}]}\n\n',
			'data: {"usage":{"input_tokens":12,"output_tokens":34}}\n\n',
			"data: [DONE]\n\n"
		];

		const output = await drain(trackAiStream(providerStream(frames), "req-1", 1000));

		expect(output).toBe(frames.join(""));
		expect(completeAiRequestMock).toHaveBeenCalledExactlyOnceWith("req-1", 1000, {
			status: "success",
			inputTokens: 12,
			outputTokens: 34,
			errorSummary: null
		});
	});

	test("extracts usage from the prompt_tokens/completion_tokens variant", async () => {
		const frames = [
			'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n',
			'data: {"usage":{"prompt_tokens":7,"completion_tokens":9}}\n\n'
		];

		await drain(trackAiStream(providerStream(frames), "req-2", 1500));

		expect(completeAiRequestMock).toHaveBeenCalledExactlyOnceWith("req-2", 1500, {
			status: "success",
			inputTokens: 7,
			outputTokens: 9,
			errorSummary: null
		});
	});

	test("parses a usage frame that is split across chunks", async () => {
		const frames = ['data: {"usage":{"input_tok', 'ens":5,"output_tokens":11}}\n\n'];

		await drain(trackAiStream(providerStream(frames), "req-3", 2000));

		expect(completeAiRequestMock).toHaveBeenCalledExactlyOnceWith("req-3", 2000, {
			status: "success",
			inputTokens: 5,
			outputTokens: 11,
			errorSummary: null
		});
	});

	test("ignores non-JSON control frames without recording usage", async () => {
		const frames = ["data: not-json\n\n", "event: ping\ndata: {}\n\n"];

		await drain(trackAiStream(providerStream(frames), "req-4", 2500));

		expect(completeAiRequestMock).toHaveBeenCalledExactlyOnceWith("req-4", 2500, {
			status: "success",
			inputTokens: null,
			outputTokens: null,
			errorSummary: null
		});
	});

	test("records an error when the provider reports one in the stream", async () => {
		const frames = [
			'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n',
			'data: {"error":"model overloaded"}\n\n'
		];

		const output = await drain(trackAiStream(providerStream(frames), "req-5", 3000));

		expect(output).toBe(frames.join(""));
		expect(completeAiRequestMock).toHaveBeenCalledExactlyOnceWith("req-5", 3000, {
			status: "error",
			inputTokens: null,
			outputTokens: null,
			errorSummary: "AI provider reported a stream error"
		});
	});

	test("records a failure and surfaces the error when the provider stream breaks", async () => {
		const failing = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(
					new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n')
				);
				controller.error(new Error("connection reset"));
			}
		});

		await expect(drain(trackAiStream(failing, "req-6", 3500))).rejects.toThrow("AI stream failed.");
		expect(completeAiRequestMock).toHaveBeenCalledExactlyOnceWith("req-6", 3500, {
			status: "error",
			inputTokens: null,
			outputTokens: null,
			errorSummary: "AI provider stream failed"
		});
	});

	test("records a failure when the consumer cancels the stream", async () => {
		const tracked = trackAiStream(
			providerStream(['data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n']),
			"req-7",
			4000
		);

		await tracked.cancel("user navigated away");

		expect(completeAiRequestMock).toHaveBeenCalledExactlyOnceWith("req-7", 4000, {
			status: "error",
			inputTokens: null,
			outputTokens: null,
			errorSummary: "Client cancelled stream"
		});
	});

	test("records only one telemetry completion despite repeated cancel attempts", async () => {
		const tracked = trackAiStream(
			providerStream(['data: {"usage":{"input_tokens":1,"output_tokens":2}}\n\n']),
			"req-8",
			4500
		);

		const first = tracked.cancel("first cancel");
		await tracked.cancel("second cancel");
		await first;

		expect(completeAiRequestMock).toHaveBeenCalledTimes(1);
		expect(completeAiRequestMock).toHaveBeenCalledWith("req-8", 4500, {
			status: "error",
			inputTokens: null,
			outputTokens: null,
			errorSummary: "Client cancelled stream"
		});
	});
});
