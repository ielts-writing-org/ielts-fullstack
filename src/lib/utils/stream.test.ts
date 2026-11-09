import { describe, expect, it, vi } from "vitest";
import { readAiStream } from "./stream.ts";

/**
 * The AI endpoints (chat/evaluate) respond with OpenAI-style SSE frames:
 * `data: {"choices":[{"delta":{"content":"..."}}]}` frames, followed by a
 * `data: [DONE]` sentinel. `readAiStream` is the shared client decoder, so
 * these tests pin the wire-format contract the whole AI UI depends on.
 */
function sseStream(frames: string[]): ReadableStream<Uint8Array<ArrayBuffer>> {
	const encoder = new TextEncoder();
	return new ReadableStream<Uint8Array>({
		start(controller) {
			for (const frame of frames) {
				controller.enqueue(encoder.encode(frame));
			}
			controller.close();
		}
	}) as unknown as ReadableStream<Uint8Array<ArrayBuffer>>;
}

function deltaFrame(content: string): string {
	return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;
}

describe("readAiStream", () => {
	it("emits delta contents in order and calls onDone once at the end", async () => {
		const contents: string[] = [];
		const onDone = vi.fn();

		await readAiStream(
			sseStream([
				deltaFrame("Hello, "),
				deltaFrame("how "),
				deltaFrame("can I help?"),
				"data: [DONE]\n\n"
			]),
			(value) => contents.push(value),
			onDone
		);

		expect(contents).toEqual(["Hello, ", "how ", "can I help?"]);
		expect(onDone).toHaveBeenCalledTimes(1);
	});

	it("delivers contents before onDone (stream first, completion second)", async () => {
		const events: string[] = [];

		await readAiStream(
			sseStream([deltaFrame("abc"), "data: [DONE]\n\n"]),
			(value) => events.push(`content:${value}`),
			() => events.push("done")
		);

		expect(events).toEqual(["content:abc", "done"]);
	});

	it("skips the [DONE] sentinel without treating it as content", async () => {
		const contents: string[] = [];

		await readAiStream(
			sseStream([deltaFrame("ok"), "data: [DONE]\n\n"]),
			(value) => contents.push(value),
			() => {}
		);

		expect(contents).toEqual(["ok"]);
	});

	it("ignores non-JSON frames and SSE comments (ping/keepalive events)", async () => {
		const contents: string[] = [];

		await readAiStream(
			sseStream([deltaFrame("a"), ": keepalive\n\n", "data: not-json\n\n", deltaFrame("b")]),
			(value) => contents.push(value),
			() => {}
		);

		expect(contents).toEqual(["a", "b"]);
	});

	it("ignores frames without a delta content payload", async () => {
		const contents: string[] = [];

		await readAiStream(
			sseStream([
				'data: {"choices":[{"delta":{}}]}\n\n',
				'data: {"choices":[]}\n\n',
				'data: {"other":true}\n\n',
				deltaFrame("c")
			]),
			(value) => contents.push(value),
			() => {}
		);

		expect(contents).toEqual(["c"]);
	});

	it("calls onDone once even when the stream is empty", async () => {
		const onContent = vi.fn();
		const onDone = vi.fn();

		await readAiStream(sseStream([]), onContent, onDone);

		expect(onContent).not.toHaveBeenCalled();
		expect(onDone).toHaveBeenCalledTimes(1);
	});

	it("keeps working when chunks split SSE frames across enqueue boundaries", async () => {
		// A single frame delivered in two pieces must still parse as one event.
		const frame = deltaFrame("split");
		const half = Math.floor(frame.length / 2);
		const contents: string[] = [];

		await readAiStream(
			sseStream([frame.slice(0, half), frame.slice(half)]),
			(value) => contents.push(value),
			() => {}
		);

		expect(contents).toEqual(["split"]);
	});
});
