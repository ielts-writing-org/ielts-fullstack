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
		stack: "'Iowan Old Style', 'New York', 'Times New Roman', Georgia, serif"
	},
	{
		value: "mono",
		label: "Mono",
		sample: "Aa",
		stack: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace"
	}
];

export function normalizeFontFamily(value: string): EditorFontFamily {
	if (value === "serif" || value === "mono") {
		return value;
	}

	return "sans";
}

export function fontStackFor(value: EditorFontFamily): string {
	return FONT_OPTIONS.find((option) => option.value === value)?.stack ?? FONT_OPTIONS[0].stack;
}
