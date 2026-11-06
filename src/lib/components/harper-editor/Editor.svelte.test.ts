import { userEvent } from "vitest/browser";
import { describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import Editor from "./Editor.svelte";
import { makeMockLinter, makeMockLint } from "./lint-framework/test-support";
import { countCharacters, countWords } from "#lib/utils/stats.ts";

const CONTENT = "This is a teh sentence.";

function makeLinters() {
	// Editor.svelte merges the output of exactly two linters; only the first
	// reports a lint, the second mirrors its rule key with no results.
	const lint = makeMockLint({ source: CONTENT });
	return [
		makeMockLinter(() => ({ "mock-spelling": [lint] })),
		makeMockLinter(() => ({ "mock-spelling": [] }))
	];
}

async function mountEditor(props: { isEditable?: boolean; onChange?: (text: string) => void }) {
	const onReady = vi.fn();
	const instance = render(Editor, {
		content: CONTENT,
		linters: makeLinters(),
		onReady,
		onChange: props.onChange ?? (() => {}),
		wordTarget: 5,
		placeholder: "Write your essay here...",
		isEditable: props.isEditable ?? true
	});

	await vi.waitFor(() => expect(onReady).toHaveBeenCalledTimes(1), { timeout: 5000 });
	return instance;
}

function statusBar(container: HTMLElement): HTMLElement {
	return container.querySelector<HTMLElement>('footer[aria-label="Editor status"]')!;
}

describe("Editor component", () => {
	test("mounts a quill surface, reports ready, lints the content, and syncs edits", async () => {
		const onChange = vi.fn();
		const { container, unmount } = await mountEditor({ onChange });

		// Quill surface is wired up with the component's placeholder and safety attributes.
		const surface = container.querySelector<HTMLElement>(".harper-editor-surface")!;
		expect(surface).toBeDefined();
		expect(surface.getAttribute("spellcheck")).toBe("false");
		expect(surface.getAttribute("data-enable-grammarly")).toBe("false");
		expect(surface.dataset.placeholder).toBe("Write your essay here...");
		expect(container.querySelector(".harper-editor-quill-container")).not.toBeNull();

		// The status bar reflects the initial document text against the word target.
		const words = countWords(CONTENT);
		const chars = countCharacters(CONTENT);
		expect(statusBar(container).textContent).toContain(`${words} / 5 words`);
		expect(statusBar(container).textContent).toContain(`${chars} chars`);

		// The mock lint over "teh" is surfaced through the CSS Custom Highlight API.
		await vi.waitFor(
			() => {
				const highlight = CSS.highlights.get("harper-Spelling");
				expect(highlight).toBeDefined();
			},
			{ timeout: 5000 }
		);
		const ranges = Array.from(CSS.highlights.get("harper-Spelling") as unknown as Iterable<Range>);
		expect(ranges.length).toBeGreaterThan(0);
		expect(ranges[0].toString()).toBe("teh");
		expect(document.getElementById("harper-highlight-style-Spelling")).not.toBeNull();

		// The popup host (owned by the lint framework) lives on the document body.
		expect(document.querySelectorAll("harper-render-box").length).toBeGreaterThan(0);

		// Typing at the end of the document notifies onChange and, once the
		// framework re-renders, surfaces the problem count in the status bar.
		surface.focus();
		const selection = window.getSelection()!;
		const range = document.createRange();
		range.selectNodeContents(surface);
		range.collapse(false);
		selection.removeAllRanges();
		selection.addRange(range);
		await userEvent.type(surface, " ");

		await vi.waitFor(
			() => {
				expect(onChange).toHaveBeenCalled();
				expect(statusBar(container).textContent).toContain("1 problem");
			},
			{ timeout: 5000 }
		);
		const lastChange = onChange.mock.calls.at(-1)![0] as string;
		expect(lastChange.startsWith(CONTENT)).toBe(true);
		expect(lastChange.length).toBeGreaterThan(CONTENT.length);

		unmount();

		// Destroying the component tears down the lint framework's DOM.
		await vi.waitFor(
			() => {
				expect(document.querySelectorAll("harper-render-box").length).toBe(0);
				expect(document.getElementById("harper-highlight-style-Spelling")).toBeNull();
				expect(CSS.highlights.has("harper-Spelling")).toBe(false);
			},
			{ timeout: 5000 }
		);
	});

	test("locks the surface when isEditable is false", async () => {
		const { container, unmount } = await mountEditor({ isEditable: false });

		const surface = container.querySelector<HTMLElement>(".harper-editor-surface")!;
		await vi.waitFor(
			() => {
				expect(surface.getAttribute("contenteditable")).toBe("false");
			},
			{ timeout: 5000 }
		);

		unmount();
	});
});
