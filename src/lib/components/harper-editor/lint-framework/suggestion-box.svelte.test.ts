import { SuggestionKind } from "harper.js";
import { describe, expect, test, vi } from "vitest";
import type { IgnorableLintBox } from "./box";
import RenderBox from "./render-box";
import SuggestionBox from "./suggestion-box";
import {
	hexToRgbString,
	makeIgnorableBox,
	makeUnpackedLint,
	settleFrames,
	type UnpackedLintOptions
} from "./test-support";

const SPELLING_RGB = hexToRgbString("#D11f45");
const SPELLING_TEXT_RGB = hexToRgbString("#ffffff");

/** Whatever `SuggestionBox` builds, so this test survives the virtual-dom removal. */
type SuggestionTree = Parameters<RenderBox["render"]>[0];

interface MountOptions {
	lint?: UnpackedLintOptions;
	hint?: string | null;
	actions?: Parameters<typeof SuggestionBox>[1];
	close?: () => void;
	box?: Partial<IgnorableLintBox>;
}

async function mountSuggestionBox(options: MountOptions = {}) {
	const close = options.close ?? vi.fn();
	const box = makeIgnorableBox({
		lint: makeUnpackedLint(options.lint ?? {}),
		...options.box
	});
	const tree = SuggestionBox(
		box,
		options.actions ?? {},
		options.hint ?? null,
		close
	) as unknown as SuggestionTree;

	const renderBox = new RenderBox(() => document.body);
	renderBox.render(tree);
	const host = renderBox.getShadowHost();
	const shadow = host.shadowRoot!;
	await settleFrames();

	return {
		box,
		close,
		host,
		shadow,
		renderBox,
		firstSuggestion: shadow.querySelector<HTMLButtonElement>(
			".harper-footer > div:first-child .harper-btn"
		),
		dismissButton: Array.from(shadow.querySelectorAll<HTMLButtonElement>(".harper-btn")).find(
			(button) => button.title === "Ignore this lint"
		),
		closeButton: shadow.querySelector<HTMLButtonElement>(".harper-close-btn"),
		cleanup: () => renderBox.remove()
	};
}

describe("SuggestionBox", () => {
	test("renders header, body, suggestions, and a style tag inside the shadow root", async () => {
		const mounted = await mountSuggestionBox();

		const container = mounted.shadow.querySelector(".harper-container");
		expect(container).not.toBeNull();

		expect(mounted.shadow.querySelector(".harper-title")!.textContent).toBe("Spelling");
		expect(mounted.shadow.querySelector(".harper-body")!.innerHTML).toContain("<code>the</code>");
		expect(mounted.shadow.querySelector("#harper-suggestion-style")).not.toBeNull();

		const suggestions = Array.from(
			mounted.shadow.querySelectorAll(".harper-footer > div:first-child .harper-btn")
		);
		expect(suggestions.map((button) => button.textContent)).toEqual(["the"]);

		mounted.cleanup();
	});

	test("applies popup positioning styles from the lint box", async () => {
		const mounted = await mountSuggestionBox({ box: { x: 200, y: 150, height: 24 } });

		const container = mounted.shadow.querySelector<HTMLElement>(".harper-container")!;
		expect(container.style.position).toBe("fixed");
		expect(container.style.top).toBe("177px"); // y + height + 3
		expect(container.style.bottom).toBe("");
		expect(container.style.left).toBe("200px");
		expect(container.style.transformOrigin).toBe("left top"); // Chromium serializes "top left" as "left top"

		mounted.cleanup();
	});

	test("anchors to the bottom edge when the popup would overflow the viewport", async () => {
		const y = window.innerHeight - 30;
		const mounted = await mountSuggestionBox({ box: { x: 200, y, height: 24 } });

		const container = mounted.shadow.querySelector<HTMLElement>(".harper-container")!;
		expect(container.style.top).toBe("");
		expect(container.style.bottom).toBe(`${window.innerHeight - y - 3}px`);

		mounted.cleanup();
	});

	test("styles suggestion buttons with the lint kind color", async () => {
		const mounted = await mountSuggestionBox();

		const first = mounted.firstSuggestion!;
		expect(getComputedStyle(first).backgroundColor).toBe(SPELLING_RGB);
		expect(getComputedStyle(first).color).toBe(SPELLING_TEXT_RGB);

		mounted.cleanup();
	});

	test("clicking a suggestion applies it and closes the popup", async () => {
		const applySuggestion = vi.fn();
		const close = vi.fn();
		const mounted = await mountSuggestionBox({
			close,
			box: { applySuggestion }
		});

		mounted.firstSuggestion!.click();
		await settleFrames();

		expect(applySuggestion).toHaveBeenCalledTimes(1);
		expect(applySuggestion).toHaveBeenCalledWith({
			kind: SuggestionKind.Replace,
			replacement_text: "the"
		});
		expect(close).toHaveBeenCalledTimes(1);

		mounted.cleanup();
	});

	test("clicking Dismiss triggers the ignore callback and closes", async () => {
		const ignoreLint = vi.fn(async () => {});
		const close = vi.fn();
		const mounted = await mountSuggestionBox({
			close,
			box: { ignoreLint }
		});

		expect(mounted.dismissButton).toBeDefined();
		mounted.dismissButton!.click();
		await settleFrames();

		expect(ignoreLint).toHaveBeenCalledTimes(1);
		expect(close).toHaveBeenCalledTimes(1);

		mounted.cleanup();
	});

	test("close button closes the popup", async () => {
		const close = vi.fn();
		const mounted = await mountSuggestionBox({ close });

		expect(mounted.closeButton!.title).toBe("Close");
		mounted.closeButton!.click();
		await settleFrames();

		expect(close).toHaveBeenCalledTimes(1);

		mounted.cleanup();
	});

	test("pressing Escape closes the popup", async () => {
		const close = vi.fn();
		const mounted = await mountSuggestionBox({ close });

		window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		await settleFrames();

		expect(close).toHaveBeenCalledTimes(1);

		mounted.cleanup();
	});

	test("focuses the first suggestion shortly after render", async () => {
		const mounted = await mountSuggestionBox();

		await settleFrames(6);
		expect(mounted.shadow.activeElement).toBe(mounted.firstSuggestion);

		mounted.cleanup();
	});

	test("shows an add-to-dictionary button for spelling lints", async () => {
		const addToUserDictionary = vi.fn(async () => {});
		const mounted = await mountSuggestionBox({
			actions: { addToUserDictionary }
		});

		const dictButton = Array.from(
			mounted.shadow.querySelectorAll<HTMLButtonElement>(".harper-btn")
		).find((button) => button.title === "Add word to user dictionary");
		expect(dictButton).toBeDefined();

		dictButton!.click();
		await settleFrames();

		expect(addToUserDictionary).toHaveBeenCalledTimes(1);
		expect(addToUserDictionary).toHaveBeenCalledWith(["teh"]);

		mounted.cleanup();
	});

	test("omits the add-to-dictionary button for non-spelling lints", async () => {
		const addToUserDictionary = vi.fn(async () => {});
		const mounted = await mountSuggestionBox({
			actions: { addToUserDictionary },
			lint: { lintKind: "Grammar", lintKindPretty: "Grammar" }
		});

		const dictButton = Array.from(
			mounted.shadow.querySelectorAll<HTMLButtonElement>(".harper-btn")
		).find((button) => button.title === "Add word to user dictionary");
		expect(dictButton).toBeUndefined();

		mounted.cleanup();
	});

	test("renders the hint drawer when a hint is provided", async () => {
		const mounted = await mountSuggestionBox({ hint: "Write naturally and re-read." });

		const drawer = mounted.shadow.querySelector(".harper-hint-drawer");
		expect(drawer).not.toBeNull();
		expect(drawer!.textContent).toContain("Tip");
		expect(drawer!.textContent).toContain("Write naturally and re-read.");

		mounted.cleanup();
	});

	test("omits the hint drawer when no hint is provided", async () => {
		const mounted = await mountSuggestionBox({ hint: null });

		expect(mounted.shadow.querySelector(".harper-hint-drawer")).toBeNull();

		mounted.cleanup();
	});

	test("renders the report button and reports the lint with its rule", async () => {
		const reportError = vi.fn(async () => {});
		const mounted = await mountSuggestionBox({ actions: { reportError } });

		const report = mounted.shadow.querySelector<HTMLButtonElement>(".harper-report-link");
		expect(report).not.toBeNull();
		expect(report!.textContent).toBe("Report");

		report!.click();
		await settleFrames();

		expect(reportError).toHaveBeenCalledTimes(1);
		expect(reportError).toHaveBeenCalledWith(mounted.box.lint, "mock-rule");

		mounted.cleanup();
	});

	test("renders settings and disable-rule buttons when actions are provided", async () => {
		const openOptions = vi.fn(async () => {});
		const setRuleEnabled = vi.fn(async () => {});
		const mounted = await mountSuggestionBox({
			actions: { openOptions, setRuleEnabled }
		});

		const gear = mounted.shadow.querySelector<HTMLButtonElement>(".harper-gear-btn");
		const disable = mounted.shadow.querySelector<HTMLButtonElement>(".harper-disable-btn");
		expect(gear).not.toBeNull();
		expect(disable).not.toBeNull();

		gear!.click();
		await settleFrames();
		expect(openOptions).toHaveBeenCalledTimes(1);

		disable!.click();
		await settleFrames();
		expect(setRuleEnabled).toHaveBeenCalledWith("mock-rule", false);

		mounted.cleanup();
	});
});
