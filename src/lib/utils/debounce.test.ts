import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { debounce } from "./debounce.ts";

/**
 * The editor auto-save, history search box and remote helpers rely on
 * trailing-edge debounce semantics.
 */
describe("debounce", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("invokes the function once after the delay with the latest arguments", () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100);

		debounced("a");
		debounced("b");
		vi.advanceTimersByTime(50);
		debounced("c");
		vi.advanceTimersByTime(99);
		expect(fn).not.toHaveBeenCalled();

		vi.advanceTimersByTime(1);
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith("c");
	});

	it("does not invoke early calls", () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100);

		debounced("a");
		vi.advanceTimersByTime(99);
		expect(fn).not.toHaveBeenCalled();
	});

	it("cancel prevents the pending invocation", () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100);

		debounced("a");
		debounced.cancel();
		vi.advanceTimersByTime(500);

		expect(fn).not.toHaveBeenCalled();
	});

	it("cancel is safe when nothing is pending", () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100);
		expect(() => debounced.cancel()).not.toThrow();
	});

	it("fires again after a completed cycle", () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100);

		debounced("first");
		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(1);

		debounced("second");
		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(2);
		expect(fn).toHaveBeenLastCalledWith("second");
	});
});
