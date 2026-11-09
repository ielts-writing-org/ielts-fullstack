import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withTimeout } from "./abort.ts";

/**
 * AI chat/evaluate requests are abortable: the user can cancel a running
 * stream. `withTimeout` composes an outer abort signal with a deadline.
 */
describe("withTimeout", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("aborts after the timeout elapses", () => {
		const controller = withTimeout(undefined, 1000);

		vi.advanceTimersByTime(999);
		expect(controller.signal.aborted).toBe(false);

		vi.advanceTimersByTime(1);
		expect(controller.signal.aborted).toBe(true);
	});

	it("propagates an outer abort immediately", () => {
		const outer = new AbortController();
		const controller = withTimeout(outer.signal, 1000);

		expect(controller.signal.aborted).toBe(false);
		outer.abort();
		expect(controller.signal.aborted).toBe(true);
	});

	it("stays aborted after the outer abort even when the deadline passes", () => {
		const outer = new AbortController();
		const controller = withTimeout(outer.signal, 1000);

		outer.abort();
		vi.advanceTimersByTime(5000);

		expect(controller.signal.aborted).toBe(true);
	});

	it("an outer abort wins over an already-scheduled timeout", () => {
		const outer = new AbortController();
		const controller = withTimeout(outer.signal, 100);

		vi.advanceTimersByTime(50);
		outer.abort();

		expect(controller.signal.aborted).toBe(true);
	});
});
