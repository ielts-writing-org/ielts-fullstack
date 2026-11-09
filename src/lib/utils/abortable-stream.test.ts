import { describe, expect, it, vi } from "vitest";
import { abortableStream, cancel } from "./abortable-stream.ts";

/**
 * When the user leaves a practice page or cancels an AI stream, the response
 * stream must be cancelled without throwing.
 */
function makeStream() {
	const cancelSpy = vi.fn();
	const stream = new ReadableStream({
		cancel: cancelSpy
	});
	return { stream, cancelSpy };
}

describe("abortableStream", () => {
	it("cancels the stream when the signal is already aborted", async () => {
		const { stream, cancelSpy } = makeStream();

		await abortableStream(Promise.resolve(stream), AbortSignal.abort());

		expect(cancelSpy).toHaveBeenCalledTimes(1);
	});

	it("cancels the stream when the signal aborts later", async () => {
		const { stream, cancelSpy } = makeStream();
		const controller = new AbortController();

		const returned = await abortableStream(Promise.resolve(stream), controller.signal);
		expect(cancelSpy).not.toHaveBeenCalled();

		controller.abort();
		expect(cancelSpy).toHaveBeenCalledTimes(1);
		expect(returned).toBe(stream);
	});

	it("returns the stream untouched when never aborted", async () => {
		const { stream, cancelSpy } = makeStream();
		const controller = new AbortController();

		const returned = await abortableStream(Promise.resolve(stream), controller.signal);

		expect(returned).toBe(stream);
		expect(cancelSpy).not.toHaveBeenCalled();
		controller.abort();
	});
});

describe("cancel", () => {
	it("cancels an unlocked stream", () => {
		const { stream, cancelSpy } = makeStream();

		cancel(stream);

		expect(cancelSpy).toHaveBeenCalledTimes(1);
	});

	it("swallows errors from locked streams", async () => {
		const { stream } = makeStream();
		const reader = stream.getReader();

		expect(() => cancel(stream)).not.toThrow();

		// The reader still owns the stream; cancel must not surface its error.
		await reader.cancel();
	});
});
