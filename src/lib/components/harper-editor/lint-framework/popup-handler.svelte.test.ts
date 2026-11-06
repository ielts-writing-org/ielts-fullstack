import { afterEach, describe, expect, test, vi } from "vitest";
import type { IgnorableLintBox } from "./box";
import PopupHandler from "./popup-handler";
import type RenderBox from "./render-box";
import { makeIgnorableBox, makeUnpackedLint } from "./test-support";

/** PopupHandler keeps its RenderBox private; tests reach it through this accessor. */
function hostOf(handler: PopupHandler): HTMLElement {
	return (handler as unknown as { renderBox: RenderBox }).renderBox.getShadowHost();
}

function pointerDown(source: HTMLElement, x: number, y: number) {
	source.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: x, clientY: y }));
}

interface OpenOptions {
	x?: number;
	y?: number;
	lintKindPretty?: string;
	ignoreLint?: () => Promise<void>;
}

function makeOpenableBox(options: OpenOptions = {}): IgnorableLintBox {
	return makeIgnorableBox({
		x: options.x ?? 100,
		y: options.y ?? 100,
		width: 50,
		height: 20,
		lint: makeUnpackedLint({ lintKindPretty: options.lintKindPretty ?? "Spelling" }),
		ignoreLint: options.ignoreLint
	});
}

function openPopup(handler: PopupHandler, box: IgnorableLintBox) {
	handler.updateLintBoxes([box]);
	pointerDown(box.source as HTMLElement, box.x + box.width / 2, box.y + box.height / 2);
}

function attach(box: IgnorableLintBox): HTMLElement {
	const source = box.source as HTMLElement;
	document.body.appendChild(source);
	return source;
}

describe("PopupHandler", () => {
	afterEach(() => {
		// Safety net: drop any hosts left over by a failing test.
		for (const host of document.querySelectorAll("harper-render-box")) {
			host.remove();
		}
	});

	// NOTE: kept first on purpose. Opened popups register window-level Escape
	// listeners that are never removed (virtual-dom does not unhook discarded
	// trees), and stale listeners from destroyed handlers re-render their popup
	// when a later Escape is pressed. Running this before any other popup has
	// been opened keeps the dispatch free of those pre-existing stale throws.
	test("pressing Escape closes the popup", () => {
		const handler = new PopupHandler({});
		const box = makeOpenableBox();
		const source = attach(box);
		openPopup(handler, box);

		const host = hostOf(handler);
		expect(host.style.visibility).toBe("visible");

		window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

		expect(host.style.visibility).toBe("hidden");
		expect(host.matches(":popover-open")).toBe(false);

		handler.destroy();
		source.remove();

		for (const leftover of document.querySelectorAll("harper-render-box")) {
			leftover.remove();
		}
	});

	test("creates a manual popover host on the document body", () => {
		const handler = new PopupHandler({});
		handler.updateLintBoxes([makeOpenableBox()]);

		const host = hostOf(handler);
		expect(host.parentElement).toBe(document.body);
		expect(host.popover).toBe("manual");
		expect(host.style.pointerEvents).toBe("none");
		expect(host.style.visibility).toBe("hidden");
		expect(host.style.getPropertyPriority("visibility")).toBe("important");
		expect(host.matches(":popover-open")).toBe(false);

		handler.destroy();
	});

	test("stays hidden until a lint box is activated by pointer down", () => {
		const handler = new PopupHandler({});
		const box = makeOpenableBox();
		const source = attach(box);
		handler.updateLintBoxes([box]);

		const host = hostOf(handler);
		expect(host.style.visibility).toBe("hidden");
		expect(host.shadowRoot!.querySelector(".harper-container")).toBeNull();

		pointerDown(source, 500, 500);
		expect(host.style.visibility).toBe("hidden");

		pointerDown(source, box.x + 10, box.y + 10);
		expect(host.style.visibility).toBe("visible");
		expect(host.style.getPropertyPriority("visibility")).toBe("important");
		expect(host.matches(":popover-open")).toBe(true);
		expect(host.shadowRoot!.querySelector(".harper-container")).not.toBeNull();

		handler.destroy();
		source.remove();
	});

	test("shows the suggestion popup for the activated lint", () => {
		const handler = new PopupHandler({});
		const box = makeOpenableBox();
		const source = attach(box);
		openPopup(handler, box);

		const shadow = hostOf(handler).shadowRoot!;
		expect(shadow.querySelector(".harper-title")!.textContent).toBe("Spelling");
		expect(shadow.querySelector(".harper-body")!.innerHTML).toContain("<code>the</code>");

		const suggestions = Array.from(
			shadow.querySelectorAll(".harper-footer > div:first-child .harper-btn")
		);
		expect(suggestions.map((button) => button.textContent)).toEqual(["the"]);

		handler.destroy();
		source.remove();
	});

	test("clicking a suggestion applies it and closes the popup", async () => {
		const applySuggestion = vi.fn();
		const handler = new PopupHandler({});
		const box = makeOpenableBox();
		box.applySuggestion = applySuggestion;
		const source = attach(box);
		openPopup(handler, box);

		const host = hostOf(handler);
		const suggestions = host.shadowRoot!.querySelectorAll(
			".harper-footer > div:first-child .harper-btn"
		);
		(suggestions[0] as HTMLButtonElement).click();
		await new Promise((resolve) => setTimeout(resolve, 20));

		expect(applySuggestion).toHaveBeenCalledTimes(1);
		expect(host.style.visibility).toBe("hidden");
		expect(host.matches(":popover-open")).toBe(false);

		handler.destroy();
		source.remove();
	});

	test("clicking Dismiss reports the ignore and closes the popup", async () => {
		const ignoreLint = vi.fn(async () => {});
		const handler = new PopupHandler({});
		const box = makeOpenableBox({ ignoreLint });
		const source = attach(box);
		openPopup(handler, box);

		const host = hostOf(handler);
		const dismiss = Array.from(
			host.shadowRoot!.querySelectorAll<HTMLButtonElement>(".harper-btn")
		).find((button) => button.title === "Ignore this lint");
		expect(dismiss).toBeDefined();

		dismiss!.click();
		await new Promise((resolve) => setTimeout(resolve, 20));

		expect(ignoreLint).toHaveBeenCalledTimes(1);
		expect(host.style.visibility).toBe("hidden");

		handler.destroy();
		source.remove();
	});

	test("pointer down outside any lint box closes the popup", () => {
		const handler = new PopupHandler({});
		const box = makeOpenableBox();
		const source = attach(box);
		openPopup(handler, box);

		const host = hostOf(handler);
		expect(host.style.visibility).toBe("visible");

		pointerDown(source, 900, 900);

		expect(host.style.visibility).toBe("hidden");
		expect(host.matches(":popover-open")).toBe(false);

		handler.destroy();
		source.remove();
	});

	test("switches between lints when another box is activated", () => {
		const handler = new PopupHandler({});
		const first = makeOpenableBox({ x: 100, y: 100, lintKindPretty: "Spelling" });
		const second = makeOpenableBox({ x: 100, y: 300, lintKindPretty: "Grammar" });
		const firstSource = attach(first);
		const secondSource = attach(second);
		handler.updateLintBoxes([first, second]);

		pointerDown(firstSource, first.x + 10, first.y + 10);
		let shadow = hostOf(handler).shadowRoot!;
		expect(shadow.querySelector(".harper-title")!.textContent).toBe("Spelling");

		pointerDown(secondSource, second.x + 10, second.y + 10);
		shadow = hostOf(handler).shadowRoot!;
		expect(shadow.querySelector(".harper-title")!.textContent).toBe("Grammar");

		handler.destroy();
		firstSource.remove();
		secondSource.remove();
	});

	test("closing all lint boxes hides the popup", () => {
		const handler = new PopupHandler({});
		const box = makeOpenableBox();
		const source = attach(box);
		openPopup(handler, box);

		const host = hostOf(handler);
		expect(host.style.visibility).toBe("visible");

		handler.updateLintBoxes([]);
		expect(host.style.visibility).toBe("hidden");
		expect(host.matches(":popover-open")).toBe(false);

		handler.destroy();
		source.remove();
	});

	test("destroy removes the host and detaches listeners", () => {
		const handler = new PopupHandler({});
		const box = makeOpenableBox();
		const source = attach(box);
		handler.updateLintBoxes([box]);

		const host = hostOf(handler);
		expect(host.isConnected).toBe(true);

		handler.destroy();

		expect(host.isConnected).toBe(false);

		// Pointer downs after destroy must not resurrect the popup for this handler.
		pointerDown(source, box.x + 10, box.y + 10);
		expect(host.isConnected).toBe(false);

		source.remove();
	});
});
