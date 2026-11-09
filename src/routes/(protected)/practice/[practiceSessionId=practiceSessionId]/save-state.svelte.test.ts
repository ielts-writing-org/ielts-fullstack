import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { EditorSaver } from "./save-state.svelte.ts";

/**
 * Auto-save state machine behind both editors: idle -> unsaved (typing) ->
 * saving (after the debounce) -> saved, with failed -> retry via saveNow.
 */
describe("EditorSaver", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test("starts out saved and marks content unsaved on typing", () => {
		const save = vi.fn(async () => {});
		const saver = new EditorSaver(save);

		expect(saver.status).toBe("saved");

		saver.scheduleSaving();
		expect(saver.status).toBe("unsaved");
	});

	test("saves automatically after the debounce window", async () => {
		const save = vi.fn(async () => {});
		const saver = new EditorSaver(save);

		saver.scheduleSaving();
		await vi.advanceTimersByTimeAsync(1999);
		expect(save).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		expect(save).toHaveBeenCalledTimes(1);
		expect(saver.status).toBe("saved");
	});

	test("keeps the saving state while a save is in flight", async () => {
		let releaseSave: () => void = () => {};
		const save = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					releaseSave = resolve;
				})
		);
		const saver = new EditorSaver(save);

		saver.scheduleSaving();
		await vi.advanceTimersByTimeAsync(2000);
		expect(saver.status).toBe("saving");

		// Typing while saving must not flip the label back to unsaved.
		saver.scheduleSaving();
		expect(saver.status).toBe("saving");

		releaseSave();
		await vi.advanceTimersByTimeAsync(0);
		expect(saver.status).toBe("saved");
	});

	test("saveNow saves immediately and reports success", async () => {
		const save = vi.fn(async () => {});
		const saver = new EditorSaver(save);

		saver.scheduleSaving();
		await expect(saver.saveNow()).resolves.toBe(true);
		expect(save).toHaveBeenCalledTimes(1);
		expect(saver.status).toBe("saved");
	});

	test("saveNow reports failure and moves to the failed state", async () => {
		const save = vi.fn(async () => {
			throw new Error("network down");
		});
		const saver = new EditorSaver(save);

		saver.scheduleSaving();
		await expect(saver.saveNow()).resolves.toBe(false);
		expect(saver.status).toBe("failed");
	});

	test("a failing auto-save ends in the failed state", async () => {
		const save = vi.fn(async () => {
			throw new Error("network down");
		});
		const saver = new EditorSaver(save);

		saver.scheduleSaving();
		await vi.advanceTimersByTimeAsync(2000);

		expect(saver.status).toBe("failed");
	});

	test("recovers from failed back to saved on a later successful save", async () => {
		const save = vi
			.fn()
			.mockImplementationOnce(async () => {
				throw new Error("network down");
			})
			.mockImplementationOnce(async () => {});
		const saver = new EditorSaver(save);

		saver.scheduleSaving();
		await vi.advanceTimersByTimeAsync(2000);
		expect(saver.status).toBe("failed");

		await saver.saveNow();
		expect(saver.status).toBe("saved");
	});
});
