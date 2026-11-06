import { SuggestionKind, type Lint, type Linter } from "harper.js";
import type { IgnorableLintBox, SourceElement } from "./box";
import type { UnpackedLint, UnpackedLintGroups, UnpackedSuggestion } from "./unpack-lint";

export const DEFAULT_SOURCE = "This is a teh sentence.";

export type UnpackedLintOptions = {
	source?: string;
	start?: number;
	end?: number;
	problemText?: string;
	lintKind?: string;
	lintKindPretty?: string;
	messageHtml?: string;
	suggestions?: UnpackedSuggestion[];
	contextHash?: string;
};

/** Build a plain `UnpackedLint` for lint-box/popup tests. */
export function makeUnpackedLint(options: UnpackedLintOptions = {}): UnpackedLint {
	const source = options.source ?? DEFAULT_SOURCE;
	const start = options.start ?? source.indexOf("teh");
	const end = options.end ?? start + 3;

	return {
		span: { start, end },
		message_html: options.messageHtml ?? `Did you mean <code>the</code>?`,
		problem_text: options.problemText ?? source.slice(start, end),
		lint_kind: (options.lintKind ?? "Spelling") as UnpackedLint["lint_kind"],
		lint_kind_pretty: options.lintKindPretty ?? "Spelling",
		suggestions: options.suggestions ?? [{ kind: SuggestionKind.Replace, replacement_text: "the" }],
		context_hash: options.contextHash ?? "12345",
		source
	};
}

type MockLintOptions = Omit<UnpackedLintOptions, "contextHash">;

/**
 * Build a fake harper.js `Lint`. Only the members exercised by the lint
 * framework (`span`, `suggestions`, `message_html`, `get_problem_text`,
 * `lint_kind`, `lint_kind_pretty`, `free`) are implemented.
 */
export function makeMockLint(options: MockLintOptions = {}): Lint {
	const source = options.source ?? DEFAULT_SOURCE;
	const start = options.start ?? source.indexOf("teh");
	const end = options.end ?? start + 3;
	const suggestions = options.suggestions ?? [
		{ kind: SuggestionKind.Replace, replacement_text: "the" }
	];

	return {
		span: () => ({ start, end, free: () => {} }),
		suggestions: () =>
			suggestions.map((sug) => ({
				kind: () => sug.kind,
				get_replacement_text: () => sug.replacement_text,
				free: () => {}
			})),
		message_html: () => options.messageHtml ?? "Did you mean <code>the</code>?",
		get_problem_text: () => options.problemText ?? source.slice(start, end),
		lint_kind: () => options.lintKind ?? "Spelling",
		lint_kind_pretty: () => options.lintKindPretty ?? "Spelling",
		free: () => {}
	} as unknown as Lint;
}

/**
 * Build a fake harper.js `Linter`. Only the members exercised by
 * `Editor.svelte` and the lint framework are implemented.
 */
export function makeMockLinter(organized: (text: string) => Record<string, Lint[]>): Linter {
	return {
		setup: async () => {},
		lint: async () => [],
		organizedLints: async (text: string) => organized(text) as unknown as UnpackedLintGroups,
		ignoreLintHash: async () => {},
		contextHash: async () => 42n
	} as unknown as Linter;
}

export type MockBoxOptions = {
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	source?: SourceElement;
	lint?: UnpackedLint;
	rule?: string;
	range?: Range;
	ignoreLint?: () => Promise<void>;
	applySuggestion?: (sug: UnpackedSuggestion) => void | Promise<void>;
};

/** Build an `IgnorableLintBox` positioned in viewport coordinates. */
export function makeIgnorableBox(options: MockBoxOptions = {}): IgnorableLintBox {
	return {
		x: options.x ?? 100,
		y: options.y ?? 100,
		width: options.width ?? 50,
		height: options.height ?? 20,
		lint: options.lint ?? makeUnpackedLint(),
		source: options.source ?? document.createElement("p"),
		rule: options.rule ?? "mock-rule",
		range: options.range,
		applySuggestion: options.applySuggestion ?? (() => {}),
		ignoreLint: options.ignoreLint
	};
}

/** Convert `#rrggbb` to the `rgb(r, g, b)` string browsers report back. */
export function hexToRgbString(hex: string): string {
	const value = hex.replace("#", "");
	const r = parseInt(value.slice(0, 2), 16);
	const g = parseInt(value.slice(2, 4), 16);
	const b = parseInt(value.slice(4, 6), 16);
	return `rgb(${r}, ${g}, ${b})`;
}

/** Wait for pending tasks (rAF callbacks, promise callbacks) to settle. */
export function settleFrames(frames = 3): Promise<void> {
	let promise = Promise.resolve();
	for (let i = 0; i < frames; i++) {
		promise = promise.then(
			() =>
				new Promise<void>((resolve) => {
					requestAnimationFrame(() => resolve());
				})
		);
	}
	return promise;
}
