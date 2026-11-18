import { afterEach, describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import Modal, { closeModal, openModal } from "./Modal.svelte";
import ValidationErrors from "./ValidationErrors.svelte";

vi.mock("#lib/utils/dom.ts", async () => await import("#lib/testing/dom.mock.ts"));

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

function buttonByText(text: string): HTMLButtonElement {
	const button = Array.from(document.querySelectorAll("button")).find(
		(b) => b.textContent?.trim() === text
	);
	expect(button, `expected a "${text}" button`).toBeDefined();
	return button!;
}

function backdropButton(): HTMLButtonElement {
	const button = document.querySelector<HTMLButtonElement>(".modal-backdrop button");
	expect(button, "expected a backdrop button").toBeDefined();
	return button!;
}

function pendingAction() {
	let resolve!: () => void;
	const action = vi.fn(
		() =>
			new Promise<void>((resolveAction) => {
				resolve = resolveAction;
			})
	);
	return { action, resolve: () => resolve() };
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

		const button = Array.from(document.querySelectorAll("button")).find(
			(b) => b.textContent?.trim() === "Close"
		)!;
		expect(button).toBeDefined();
		button.click();
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

		const button = Array.from(document.querySelectorAll("button")).find(
			(b) => b.textContent?.trim() === "Do it"
		)!;
		button.click();
		await vi.waitFor(() => expect(action).toHaveBeenCalledTimes(1));
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

		Array.from(document.querySelectorAll("button"))
			.find((b) => b.textContent?.trim() === "Run")!
			.click();

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

		Array.from(document.querySelectorAll("button"))
			.find((b) => b.textContent?.trim() === "Cancel")!
			.click();
		await vi.waitFor(() => expect(dialog().open).toBe(false), { timeout: 6000 });
		expect(action).not.toHaveBeenCalled();

		unmount();
	});

	test("a second openModal stacks on top of the first; closing restores it, another close drains the dialog", async () => {
		const { unmount } = await render(Modal);

		await openModal({ title: "First modal", content: "First content", primaryButton: "Close" });
		await openModal({ title: "Second modal", content: "Second content", primaryButton: "Close" });

		expect(document.body.textContent).toContain("Second modal");
		expect(dialog().open).toBe(true);

		// Closing the top modal pops the stack: the previous modal is restored.
		await closeModal();
		expect(dialog().open).toBe(true);
		expect(document.body.textContent).toContain("First modal");
		expect(document.body.textContent).not.toContain("Second modal");

		// Closing again empties the stack; the dialog ends up closed and empty.
		await closeModal();
		await vi.waitFor(() => expect(dialog().open).toBe(false), { timeout: 6000 });
		expect(document.body.textContent).not.toContain("First modal");
		expect(document.body.textContent).not.toContain("Second modal");

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

	test("closes via the ✕ button after running its onclick", async () => {
		const { unmount } = await render(Modal);
		const onclick = vi.fn(async () => {});

		await openModal({
			title: "Dismissable",
			content: "Bye",
			closingConfig: { onclick, byButton: true },
			primaryButton: "Close"
		});

		buttonByText("✕").click();
		await vi.waitFor(() => expect(onclick).toHaveBeenCalledTimes(1));
		await vi.waitFor(() => expect(dialog().open).toBe(false), { timeout: 6000 });

		unmount();
	});

	test("closes via the backdrop after running its onclick", async () => {
		const { unmount } = await render(Modal);
		const onclick = vi.fn(async () => {});

		await openModal({
			title: "Backdrop",
			content: "Click outside",
			closingConfig: { onclick, byBackdrop: true },
			primaryButton: "Close"
		});

		backdropButton().click();
		await vi.waitFor(() => expect(onclick).toHaveBeenCalledTimes(1));
		await vi.waitFor(() => expect(dialog().open).toBe(false), { timeout: 6000 });

		unmount();
	});

	test("closes via the ✕ button or the backdrop when configured without an onclick", async () => {
		const { unmount } = await render(Modal);

		await openModal({
			title: "Plain close",
			content: "First",
			closingConfig: {
				byButton: true,
				byBackdrop: true
			},
			primaryButton: "Close"
		});
		buttonByText("✕").click();
		await vi.waitFor(() => expect(dialog().open).toBe(false), { timeout: 6000 });

		await openModal({
			title: "Plain backdrop",
			content: "Second",
			closingConfig: {
				byBackdrop: true
			}
		});
		// The ✕ click's close handler resets the busy state only after its
		// transition settles; wait until the backdrop control is usable again.
		await vi.waitFor(() => expect(backdropButton().disabled).toBe(false));
		backdropButton().click();
		await vi.waitFor(() => expect(dialog().open).toBe(false), { timeout: 6000 });

		unmount();
	});

	test("disables every modal control while a button action is pending, then restores the modal beneath", async () => {
		const { unmount } = await render(Modal);
		const { action, resolve: settle } = pendingAction();

		await openModal({ title: "First modal", content: "First content", primaryButton: "Close" });
		await openModal({
			title: "Second modal",
			content: "Working...",
			closingConfig: {
				byButton: true,
				byBackdrop: true
			},
			primaryButton: { text: "Do it", onclick: action },
			secondaryButton: { text: "Cancel" }
		});

		buttonByText("Do it").click();
		// While the action is pending nothing may trigger a concurrent closeModal:
		// that is what keeps an in-flight action from popping the stack twice.
		await vi.waitFor(() => {
			expect(buttonByText("✕").disabled).toBe(true);
			expect(backdropButton().disabled).toBe(true);
			expect(buttonByText("Cancel").disabled).toBe(true);
			expect(buttonByText("Do it").disabled).toBe(true);
		});

		settle();
		await vi.waitFor(() => expect(document.body.textContent).toContain("First modal"), {
			timeout: 6000
		});
		expect(document.body.textContent).not.toContain("Second modal");
		expect(dialog().open).toBe(true);

		await closeAllModals();
		unmount();
	});

	test("re-enables the controls once a pending explicitClose action settles without closing", async () => {
		const { unmount } = await render(Modal);
		const { action, resolve: settle } = pendingAction();

		await openModal({
			title: "Busy action",
			content: "Working...",
			closingConfig: {
				byButton: true,
				byBackdrop: true
			},
			primaryButton: { text: "Run", onclick: action, explicitClose: true },
			secondaryButton: { text: "Cancel" }
		});

		buttonByText("Run").click();
		await vi.waitFor(() => expect(buttonByText("Run").disabled).toBe(true));
		await vi.waitFor(() => expect(buttonByText("✕").disabled).toBe(true));
		await vi.waitFor(() => expect(backdropButton().disabled).toBe(true));
		await vi.waitFor(() => expect(buttonByText("Cancel").disabled).toBe(true));

		settle();
		await vi.waitFor(() => expect(buttonByText("Run").disabled).toBe(false));
		expect(buttonByText("✕").disabled).toBe(false);
		expect(backdropButton().disabled).toBe(false);
		expect(buttonByText("Cancel").disabled).toBe(false);
		expect(dialog().open).toBe(true);

		await closeAllModals();
		unmount();
	});
});
