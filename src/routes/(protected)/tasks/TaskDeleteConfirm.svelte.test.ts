import { userEvent } from "vitest/browser";
import { afterEach, describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import Modal, { closeModal } from "#lib/components/Modal.svelte";
import TaskDeleteConfirm from "./TaskDeleteConfirm.svelte";
import { deleteTask } from "#lib/remotes/command/delete-task.remote.js";

vi.mock("#lib/remotes/command/delete-task.remote.js", () => ({
	deleteTask: vi.fn(async () => {})
}));

/**
 * Deleting a task that practice sessions depend on must require the typed
 * confirmation phrase; unused tasks can be deleted directly.
 */
const task = {
	id: "019201a1-7000-7e00-9000-000000000003",
	category: "2",
	subcategory: "discussion-essay",
	prompt: "Many cities are introducing congestion charges.",
	imageName: null,
	isExample: false,
	createdAt: new Date("2026-01-01T10:00:00Z"),
	updatedAt: new Date("2026-01-02T10:00:00Z"),
	sessionCount: 2,
	bestBand: 7.5,
	lastPracticedAt: new Date("2026-01-02T10:00:00Z")
} as never;

const dependantSessions = [
	{
		id: "019201a1-7000-7e00-8000-000000000004",
		name: "Discussion essay practice",
		type: "free",
		estimatedBand: 7.5,
		updatedAt: new Date("2026-01-02T10:00:00Z")
	}
] as never;

let cleanups: Array<() => void> = [];

async function mount(sessions: never) {
	const modal = await render(Modal);
	cleanups.push(modal.unmount);

	const onDeleted = vi.fn(async () => {});
	const component = await render(TaskDeleteConfirm, { task, sessions, onDeleted });
	cleanups.push(component.unmount);
	return { component, onDeleted };
}

function confirmButton(): HTMLButtonElement {
	return Array.from(document.querySelectorAll("button")).find(
		(b) => b.textContent?.trim() === "Delete task"
	)!;
}

function phraseInput(): HTMLInputElement {
	return document.querySelector<HTMLInputElement>('input[aria-label*="DELETE"]')!;
}

afterEach(async () => {
	while (document.querySelector<HTMLDialogElement>("dialog.modal")?.open) {
		await closeModal();
	}
	for (const unmount of cleanups) {
		unmount();
	}
	cleanups = [];
	vi.clearAllMocks();
});

describe("TaskDeleteConfirm", () => {
	test("deletes an unused task immediately without a confirmation phrase", async () => {
		const { onDeleted } = await mount([] as never);

		expect(document.body.textContent).toContain("not used by any practice sessions yet");
		expect(phraseInput()).toBeNull();

		const button = confirmButton();
		expect(button.disabled).toBe(false);
		await userEvent.click(button);

		await vi.waitFor(() => expect(deleteTask).toHaveBeenCalledTimes(1));
		expect(deleteTask).toHaveBeenCalledWith({ taskId: "019201a1-7000-7e00-9000-000000000003" });
		expect(onDeleted).toHaveBeenCalledTimes(1);
	});

	test("lists dependent sessions and requires typing DELETE to confirm", async () => {
		await mount(dependantSessions);

		expect(document.body.textContent).toContain("Affected practice sessions:");
		expect(document.body.textContent).toContain("Discussion essay practice");
		expect(document.body.textContent).toContain("This action cannot be undone.");

		const button = confirmButton();
		expect(button.disabled).toBe(true);

		await userEvent.fill(phraseInput(), "delete");
		expect(button.disabled).toBe(true);

		await userEvent.fill(phraseInput(), "DELETE");
		expect(button.disabled).toBe(false);

		await userEvent.click(button);
		await vi.waitFor(() => expect(deleteTask).toHaveBeenCalledTimes(1));
		expect(deleteTask).toHaveBeenCalledWith({ taskId: "019201a1-7000-7e00-9000-000000000003" });
	});

	test("cancel closes the dialog without deleting", async () => {
		await mount(dependantSessions);

		await userEvent.click(
			Array.from(document.querySelectorAll("button")).find(
				(b) => b.textContent?.trim() === "Cancel"
			)!
		);

		await vi.waitFor(() =>
			expect(document.querySelector<HTMLDialogElement>("dialog.modal")!.open).toBe(false)
		);
		expect(deleteTask).not.toHaveBeenCalled();
	});
});
