import { userEvent } from "vitest/browser";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import SessionCard from "./SessionCard.svelte";
import type { SessionItem } from "./utils.ts";

/**
 * History card contract: badges (task, subcategory, time type, word count),
 * band rings for evaluated sessions, the Review/Continue link and the action
 * menu (copy essay, download, rename, delete).
 */
function makeSession(overrides: Partial<SessionItem> = {}): SessionItem {
	return {
		id: "019201a1-7000-7e00-8000-000000000001",
		name: "Task 2 opinion essay",
		taskCategory: "2",
		taskSubcategory: "opinion-essay",
		taskPrompt:
			"Some people believe that children should learn a foreign language at primary school.",
		type: "timed",
		updatedAt: new Date("2026-01-01T12:00:00Z"),
		response: "My essay response text.",
		words: 280,
		estimatedBand: 6.5,
		criteria: {
			taskResponse: 6,
			coherenceAndCohesion: 7,
			lexicalResource: 6.5,
			grammaticalRangeAndAccuracy: 7
		},
		...overrides
	} as SessionItem;
}

describe("SessionCard", () => {
	let clipboardWrite: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		clipboardWrite = vi.fn(async () => {});
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText: clipboardWrite },
			configurable: true
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("renders badges, the band radial and the criteria rings", async () => {
		const onRename = vi.fn();
		const onDelete = vi.fn();
		const { container, unmount } = await render(SessionCard, {
			session: makeSession(),
			bandTarget: 0, // TODO: Mock
			onRename,
			onDelete
		});

		expect(container.textContent).toContain("Task 2");
		expect(container.textContent).toContain("Opinion essay");
		expect(container.textContent).toContain("40 min limit");
		expect(container.textContent).toContain("280 words");
		expect(container.textContent).toContain("Overall");

		const overall = container.querySelector<HTMLElement>('[aria-label="Overall band"]')!;
		expect(overall.getAttribute("aria-valuenow")).toBe("6.5");

		const taskResponse = container.querySelector<HTMLElement>('[aria-label="Task Response"]')!;
		expect(taskResponse.getAttribute("aria-valuenow")).toBe("6");
		expect(
			container
				.querySelector<HTMLElement>('[aria-label="Coherence & Cohesion"]')!
				.getAttribute("aria-valuenow")
		).toBe("7");

		const link = container.querySelector<HTMLAnchorElement>(
			"a[href='/practice/019201a1-7000-7e00-8000-000000000001']"
		)!;
		expect(link.textContent).toContain("Review");

		unmount();
	});

	test("shows the unevaluated placeholder with a Continue link", async () => {
		const { container, unmount } = await render(SessionCard, {
			session: makeSession({ estimatedBand: undefined, criteria: null, type: "free", words: 90 }),
			bandTarget: 0, // TODO: Mock
			onRename: vi.fn(),
			onDelete: vi.fn()
		});

		expect(container.textContent).toContain("No evaluation yet");
		expect(container.textContent).toContain("Unlimited time");
		expect(container.textContent).toContain("90 words");
		const link = container.querySelector<HTMLAnchorElement>(
			"a[href='/practice/019201a1-7000-7e00-8000-000000000001']"
		)!;
		expect(link.textContent).toContain("Continue");

		unmount();
	});

	test("copies the task prompt and essay to the clipboard", async () => {
		const session = makeSession();
		const { container, unmount } = await render(SessionCard, {
			session,
			bandTarget: 0, // TODO: Mock
			onRename: vi.fn(),
			onDelete: vi.fn()
		});

		await userEvent.click(
			container.querySelector<HTMLButtonElement>('[aria-label="Session actions"]')!
		);
		const copyButton = Array.from(container.querySelectorAll("button")).find((b) =>
			b.textContent?.includes("Copy essay")
		)!;
		await userEvent.click(copyButton);

		await vi.waitFor(() => expect(clipboardWrite).toHaveBeenCalledTimes(1));
		expect(clipboardWrite).toHaveBeenCalledWith(`${session.taskPrompt}\n\n\n${session.response}`);
		expect(copyButton.textContent).toContain("Copied!");

		unmount();
	});

	test("exposes rename and delete actions for the session", async () => {
		const session = makeSession();
		const onRename = vi.fn();
		const onDelete = vi.fn();
		const { container, unmount } = await render(SessionCard, {
			session,
			bandTarget: 0, // TODO: Mock
			onRename,
			onDelete
		});

		await userEvent.click(
			container.querySelector<HTMLButtonElement>('[aria-label="Session actions"]')!
		);

		const renameButton = Array.from(container.querySelectorAll("button")).find((b) =>
			b.textContent?.includes("Rename")
		)!;
		await userEvent.click(renameButton);
		expect(onRename).toHaveBeenCalledTimes(1);
		expect(onRename.mock.calls[0][0].id).toBe(session.id);

		await userEvent.click(
			container.querySelector<HTMLButtonElement>('[aria-label="Session actions"]')!
		);
		const deleteButton = Array.from(container.querySelectorAll("button")).find(
			(b) => b.textContent?.includes("Delete") && !b.textContent?.includes(".txt")
		)!;
		await userEvent.click(deleteButton);
		expect(onDelete).toHaveBeenCalledTimes(1);
		expect(onDelete.mock.calls[0][0].id).toBe(session.id);

		unmount();
	});
});
