/**
 * Shared display configuration and helpers for the Harper editor UI.
 *
 * This module keeps editor-only presentation choices, such as lint-kind styles,
 * lint-kind ordering, font options, and small formatting helpers, out of Svelte
 * components. Canonical linting concepts still come from `harper.js` and
 * `lint-framework`; this file only describes how those values should appear in
 * the editor.
 */
export type EditorFontFamily = "sans" | "serif" | "mono";

export const FONT_OPTIONS: {
	value: EditorFontFamily;
	label: string;
	sample: string;
	stack: string;
}[] = [
	{
		value: "sans",
		label: "Sans",
		sample: "Aa",
		stack: "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif"
	},
	{
		value: "serif",
		label: "Serif",
		sample: "Aa",
		stack: "'Iowan Old Style', 'New York', Georgia, serif"
	},
	{
		value: "mono",
		label: "Mono",
		sample: "Aa",
		stack: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace"
	}
];

/**
 * Convert persisted or caller-provided font family values to a supported option.
 *
 * This keeps the editor resilient to stale settings or arbitrary input while
 * preserving a predictable default.
 */
export function normalizeFontFamily(value: string): EditorFontFamily {
	if (value === "serif" || value === "mono") {
		return value;
	}

	return "sans";
}

/**
 * Resolve an editor font family option to the CSS stack used by the editor.
 *
 * Components call this instead of duplicating font-stack strings or fallback
 * behavior.
 */
export function fontStackFor(value: EditorFontFamily): string {
	return FONT_OPTIONS.find((option) => option.value === value)?.stack ?? FONT_OPTIONS[0].stack;
}
