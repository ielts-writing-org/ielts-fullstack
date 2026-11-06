import { describe, expect, test } from "vitest";
import RenderBox from "./render-box";
import SuggestionBox from "./suggestion-box";
import { makeIgnorableBox, makeUnpackedLint } from "./test-support";

/** Whatever `RenderBox.render` accepts, so this test survives the virtual-dom removal. */
type RenderableTree = Parameters<RenderBox["render"]>[0];

function renderSuggestionBox(title: string): RenderableTree {
	const box = makeIgnorableBox({
		lint: makeUnpackedLint({ lintKindPretty: title })
	});
	return SuggestionBox(box, {}, null, () => {}) as unknown as RenderableTree;
}

describe("RenderBox", () => {
	test("renders a tree into the shadow root of a host appended to the parent", () => {
		const parent = document.createElement("div");
		document.body.appendChild(parent);

		const renderBox = new RenderBox(parent);
		renderBox.render(renderSuggestionBox("Spelling"));

		const host = renderBox.getShadowHost();
		expect(host.tagName).toBe("HARPER-RENDER-BOX");
		expect(host.parentElement).toBe(parent);
		expect(host.shadowRoot).not.toBeNull();
		expect(host.shadowRoot!.querySelector(".harper-container")).not.toBeNull();
		expect(host.shadowRoot!.querySelector(".harper-title")!.textContent).toBe("Spelling");

		renderBox.remove();
		parent.remove();
	});

	test("re-render replaces the previous content instead of stacking trees", () => {
		const parent = document.createElement("div");
		document.body.appendChild(parent);

		const renderBox = new RenderBox(parent);
		renderBox.render(renderSuggestionBox("Spelling"));
		renderBox.render(renderSuggestionBox("Grammar"));

		const containers = renderBox.getShadowHost().shadowRoot!.querySelectorAll(".harper-container");
		expect(containers.length).toBe(1);
		expect(renderBox.getShadowHost().shadowRoot!.querySelector(".harper-title")!.textContent).toBe(
			"Grammar"
		);

		renderBox.remove();
		parent.remove();
	});

	test("remove detaches the host from the DOM", () => {
		const parent = document.createElement("div");
		document.body.appendChild(parent);

		const renderBox = new RenderBox(parent);
		renderBox.render(renderSuggestionBox("Spelling"));
		expect(renderBox.getShadowHost().isConnected).toBe(true);

		renderBox.remove();
		expect(renderBox.getShadowHost().isConnected).toBe(false);
		expect(renderBox.getShadowHost().parentElement).toBeNull();

		parent.remove();
	});

	test("accepts a resolver function for a lazily-resolved parent node", () => {
		const renderBox = new RenderBox(() => document.body);
		renderBox.render(renderSuggestionBox("Spelling"));

		expect(renderBox.getShadowHost().parentElement).toBe(document.body);

		renderBox.remove();
	});
});
