import { afterEach, describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import Modal, { closeModal, openModal } from "./Modal.svelte";
import ValidationErrors from "./ValidationErrors.svelte";

/**
 * Global confirmation/error dialog used by every destructive or async action.
 */
function dialog(): HTMLDialogElement {
	return document.querySelector("dialog.modal")!;
}

async function closeAllModals() {
	while (dialog()?.open) {
		await closeModal();
	}
}

describe("Modal", () => {
	afterEach(async () => {
		await closeAllModals();
	});

	test("renders an empty closed dialog until a modal is opened", async () => {
		const { unmount } = await render(Modal);

		expect(dialog()).not.toBeNull();
		expect(dialog().open).toBe(false);

		unmount();
	});

	test("opens with a title, content and a primary close button", async () => {
		const { unmount } = await render(Modal);

		await openModal({ title: "Hello there", content: "Body text", primaryButton: "Close" });

		expect(dialog().open).toBe(true);
		expect(document.body.textContent).toContain("Hello there");
		expect(document.body.textContent).toContain("Body text");

		const button = Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.trim() === "Close")!;
		expect(button).toBeDefined();
		await button.click();
		await vi.waitFor(() => expect(dialog().open).toBe(false), { timeout: 6000 });

		unmount();
	});

	test("runs the primary button action before closing", async () => {
		const { unmount } = await render(Modal);
		const action = vi.fn(async () => {});

		await openModal({
			title: "Confirm",
			content: "Are you sure?",
			primaryButton: { text: "Do it", onclick: action },
			secondaryButton: "Cancel"
		});

		const button = Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.trim() === "Do it")!;
		await button.click();
		expect(action).toHaveBeenCalledTimes(1);
		await vi.waitFor(() => expect(dialog().open).toBe(false), { timeout: 6000 });

		unmount();
	});

	test("keeps the modal open when the primary button opts out of auto-close", async () => {
		const { unmount } = await render(Modal);
		const action = vi.fn(async () => {});

		await openModal({
			title: "Busy action",
			content: "Working...",
			primaryButton: { text: "Run", onclick: action, explicitClose: true }
		});

		await (Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.trim() === "Run")!).click();

		expect(action).toHaveBeenCalledTimes(1);
		// With explicitClose the handler decides when to close; the modal stays open.
		expect(dialog().open).toBe(true);
		await closeModal();

		unmount();
	});

	test("closes via the secondary button without running the primary action", async () => {
		const { unmount } = await render(Modal);
		const action = vi.fn();

		await openModal({
			title: "Confirm",
			content: "Choose wisely",
			primaryButton: { text: "Do it", onclick: action },
			secondaryButton: { text: "Cancel" }
		});

		await (Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.trim() === "Cancel")!).click();
		await vi.waitFor(() => expect(dialog().open).toBe(false), { timeout: 6000 });
		expect(action).not.toHaveBeenCalled();

		unmount();
	});

	test("a second openModal replaces the first and closing returns to a clean dialog", async () => {
		const { unmount } = await render(Modal);

		await openModal({ title: "First modal", content: "First content", primaryButton: "Close" });
		await openModal({ title: "Second modal", content: "Second content", primaryButton: "Close" });

		expect(document.body.textContent).toContain("Second modal");
		expect(dialog().open).toBe(true);

		// Closing the top modal drains the stack; the dialog ends up closed and
		// empty. (Chained restores are exercised by the e2e flows instead, where
		// real DaisyUI transitions are involved.)
		await closeModal();
		await vi.waitFor(() => expect(dialog().open).toBe(false), { timeout: 6000 });
		await new Promise((resolve) => setTimeout(resolve, 2500));
		expect(document.body.textContent).not.toContain("Second modal");
		await closeModal().catch(() => {});

		unmount();
	});

	test("renders component content with props", async () => {
		const { unmount } = await render(Modal);

		await openModal({
			title: "Validation Error",
			content: {
				component: ValidationErrors,
				props: { errors: [{ field: "task.prompt", message: "Too short" }] }
			},
			primaryButton: "Close"
		});

		expect(document.body.textContent).toContain("Validation Error");
		expect(document.body.textContent).toContain("task.prompt");
		expect(document.body.textContent).toContain("Too short");

		await closeAllModals();
		unmount();
	});
});

