import { afterEach, describe, expect, test } from "vitest";
import type { LintBox } from "./box";
import Highlights from "./highlights";
import { hexToRgbString, makeIgnorableBox, makeUnpackedLint } from "./test-support";

const SPELLING_COLOR = hexToRgbString("#D11f45");

function createEditorStructure(): { container: HTMLElement; source: HTMLElement } {
	const container = document.createElement("div");
	const source = document.createElement("p");
	source.textContent = "This is a teh sentence.";
	container.appendChild(source);
	document.body.appendChild(container);
	return { container, source };
}

function collectRenderBoxes(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll("harper-render-box"));
}

function highlightDivs(highlights: Highlights, source: HTMLElement): HTMLElement[] {
	const renderBox = highlights.renderBoxes.get(source);
	expect(renderBox).toBeDefined();
	return Array.from(
		renderBox!.getShadowHost().shadowRoot!.querySelectorAll<HTMLElement>("#harper-highlight")
	);
}

describe("Highlights", () => {
	let container: HTMLElement;
	let source: HTMLElement;

	afterEach(() => {
		container?.remove();
		// Destroyed instances are expected to clean their own style tags; sweep defensively.
		for (const style of document.querySelectorAll("style[id^='harper-highlight-style-']")) {
			style.remove();
		}
		for (const tag of Array.from(CSS.highlights.keys())) {
			if (tag.startsWith("harper-")) {
				CSS.highlights.delete(tag);
			}
		}
	});

	test("renders a highlight box into a shadow host next to the source element", () => {
		const highlights = new Highlights();
		({ container, source } = createEditorStructure());

		const box = makeIgnorableBox({ source, x: 120, y: 140, width: 30, height: 22 });
		highlights.renderLintBoxes([box as LintBox]);

		const hosts = collectRenderBoxes(container);
		expect(hosts.length).toBe(1);
		expect(hosts[0].id).toBe("harper-highlight-host");

		const rendered = highlightDivs(highlights, source);
		expect(rendered.length).toBe(1);

		const style = rendered[0].style;
		expect(style.position).toBe("fixed");
		expect(style.transform).toBe("translate(120px, 140px)");
		expect(style.width).toBe("30px");
		expect(style.height).toBe("22px");
		expect(style.pointerEvents).toBe("none");
		const computed = getComputedStyle(rendered[0]);
		expect(computed.borderBottomColor).toBe(SPELLING_COLOR);
		expect(computed.borderBottomWidth).toBe("2px");

		highlights.destroy();
	});

	test("renders one box per lint box for the same source", () => {
		const highlights = new Highlights();
		({ container, source } = createEditorStructure());

		highlights.renderLintBoxes([
			makeIgnorableBox({ source, x: 10, y: 20 }) as LintBox,
			makeIgnorableBox({ source, x: 40, y: 60 }) as LintBox
		]);

		const rendered = highlightDivs(highlights, source);
		expect(rendered.length).toBe(2);
		const transforms = rendered.map((el) => el.style.transform);
		expect(transforms).toContain("translate(10px, 20px)");
		expect(transforms).toContain("translate(40px, 60px)");

		highlights.destroy();
	});

	test("re-rendering with moved boxes updates positions without stacking hosts", () => {
		const highlights = new Highlights();
		({ container, source } = createEditorStructure());

		highlights.renderLintBoxes([makeIgnorableBox({ source, x: 10, y: 20 }) as LintBox]);
		highlights.renderLintBoxes([makeIgnorableBox({ source, x: 300, y: 400 }) as LintBox]);

		expect(collectRenderBoxes(container).length).toBe(1);
		const rendered = highlightDivs(highlights, source);
		expect(rendered.length).toBe(1);
		expect(rendered[0].style.transform).toBe("translate(300px, 400px)");

		highlights.destroy();
	});

	test("re-rendering with no boxes clears rendered highlights", () => {
		const highlights = new Highlights();
		({ container, source } = createEditorStructure());

		highlights.renderLintBoxes([makeIgnorableBox({ source }) as LintBox]);
		expect(highlightDivs(highlights, source).length).toBe(1);

		highlights.renderLintBoxes([]);
		expect(highlightDivs(highlights, source).length).toBe(0);
		// The host stays around while its source is still attached.
		expect(collectRenderBoxes(container).length).toBe(1);

		highlights.destroy();
	});

	test("prunes render boxes whose source element left the document", () => {
		const highlights = new Highlights();
		({ container, source } = createEditorStructure());

		highlights.renderLintBoxes([makeIgnorableBox({ source }) as LintBox]);
		expect(collectRenderBoxes(container).length).toBe(1);

		source.remove();
		highlights.renderLintBoxes([]);

		expect(collectRenderBoxes(container).length).toBe(0);
		expect(highlights.renderBoxes.size).toBe(0);

		highlights.destroy();
	});

	test("offsets boxes by the containing block when an ancestor creates one", () => {
		const highlights = new Highlights();
		({ container, source } = createEditorStructure());
		// A transform on the render target makes it the containing block for fixed descendants.
		container.style.transform = "translateZ(0)";

		const box = makeIgnorableBox({ source, x: 200, y: 210 }) as LintBox;
		highlights.renderLintBoxes([box]);

		const hosts = collectRenderBoxes(container);
		expect(hosts.length).toBe(1);
		const hostStyle = hosts[0].style;
		expect(hostStyle.position).toBe("absolute");
		expect(hostStyle.width).toBe("0px");
		expect(hostStyle.height).toBe("0px");

		const rendered = highlightDivs(highlights, source);
		expect(rendered.length).toBe(1);
		const rect = container.getBoundingClientRect();
		expect(rendered[0].style.transform).toBe(`translate(${box.x - rect.x}px, ${box.y - rect.y}px)`);

		highlights.destroy();
	});

	test("boxes with a Range use the CSS Custom Highlight API instead of shadow hosts", () => {
		const highlights = new Highlights();
		({ container, source } = createEditorStructure());

		const range = document.createRange();
		const textNode = source.firstChild!;
		range.setStart(textNode, 10);
		range.setEnd(textNode, 13);

		highlights.renderLintBoxes([makeIgnorableBox({ source, range }) as LintBox]);

		// No render box is created for range-backed boxes.
		expect(collectRenderBoxes(container).length).toBe(0);

		const highlight = CSS.highlights.get("harper-Spelling");
		expect(highlight).toBeDefined();
		const ranges = Array.from(highlight as unknown as Iterable<Range>);
		expect(ranges.length).toBe(1);
		expect(ranges[0].toString()).toBe("teh");

		const styleTag = document.getElementById("harper-highlight-style-Spelling");
		expect(styleTag).not.toBeNull();
		expect(styleTag!.textContent).toContain("::highlight(harper-Spelling)");

		highlights.destroy();
		expect(CSS.highlights.has("harper-Spelling")).toBe(false);
		expect(document.getElementById("harper-highlight-style-Spelling")).toBeNull();
	});

	test("destroy removes all render boxes and style tags", () => {
		const highlights = new Highlights();
		({ container, source } = createEditorStructure());

		const range = document.createRange();
		const textNode = source.firstChild!;
		range.setStart(textNode, 10);
		range.setEnd(textNode, 13);

		highlights.renderLintBoxes([
			makeIgnorableBox({ source, x: 5, y: 5 }) as LintBox,
			makeIgnorableBox({ source, range }) as LintBox
		]);

		expect(collectRenderBoxes(container).length).toBe(1);
		expect(document.getElementById("harper-highlight-style-Spelling")).not.toBeNull();

		highlights.destroy();

		expect(collectRenderBoxes(container).length).toBe(0);
		expect(highlights.renderBoxes.size).toBe(0);
		expect(CSS.highlights.has("harper-Spelling")).toBe(false);
		expect(document.getElementById("harper-highlight-style-Spelling")).toBeNull();
	});

	test("unexpected lint kinds throw a descriptive error", () => {
		const highlights = new Highlights();
		({ container, source } = createEditorStructure());

		expect(() =>
			highlights.renderLintBoxes([
				makeIgnorableBox({
					source,
					lint: makeUnpackedLint({ lintKind: "DoesNotExist" })
				}) as LintBox
			])
		).toThrowError(/Unexpected lint kind/);

		highlights.destroy();
	});
});
