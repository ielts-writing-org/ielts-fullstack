import type { LintKind } from "harper.js";

export type { LintKind } from "harper.js";

// First, define the color map as a constant
const LINT_KIND_COLORS = {
	Agreement: "#228B22", // Forest green
	BoundaryError: "#8B4513", // Saddle brown
	Capitalization: "#540D6E", // Deep purple
	Eggcorn: "#FF8C00", // Dark orange
	Enhancement: "#0EAD69", // Green
	Formatting: "#7D3C98", // Amethyst purple
	Grammar: "#9B59B6", // Medium purple
	Malapropism: "#C71585", // Medium violet red
	Miscellaneous: "#3BCEAC", // Turquoise
	Nonstandard: "#008B8B", // Dark cyan
	Punctuation: "#D4850F", // Dark orange
	Readability: "#2E8B57", // Sea green
	Redundancy: "#4682B4", // Steel blue
	Regionalism: "#C061CB", // Vibrant purple
	Repetition: "#00A67C", // Green-cyan
	Spelling: "#D11f45", // Pink-red
	Style: "#FFD23F", // Yellow
	Typo: "#FF6B35", // Vibrant orange-red
	Usage: "#1E90FF", // Dodger blue
	WordChoice: "#228B22", // Forest green
	WordOrder: "#4D4DFF" // Royal blue
} as const satisfies Record<LintKind, string>;

// Export the array of all lint kind names
export const LINT_KINDS = Object.keys(LINT_KIND_COLORS) as LintKind[];

// The main function that uses the map
export function lintKindColor(lintKindKey: string): string {
	const color = LINT_KIND_COLORS[lintKindKey as LintKind];
	if (!color) {
		throw new Error(`Unexpected lint kind: ${lintKindKey}`);
	}
	return color;
}

export function lintKindTextColor(lintKindKeyOrColor: string): "black" | "white" {
	const color = LINT_KIND_COLORS[lintKindKeyOrColor as LintKind] ?? lintKindKeyOrColor;
	return getContrastingTextColor(color);
}

/** Get the text color that best contrasts with a background of the provided color. */
export function getContrastingTextColor(color: string): "black" | "white" {
	const luminance = getRelativeLuminance(color);
	return luminance > 0.5 ? "black" : "white";
}

/** Parse a CSS color string and return relative luminance (0-1) per WCAG 2.1 */
export function getRelativeLuminance(color: string): number {
	const rgb = parseColorToRgb(color);
	if (!rgb) return 0; // fallback for unparseable colors

	// Convert sRGB to linear RGB
	const linearRgb = rgb.map((channel) => {
		const c = channel / 255;
		return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
	});

	// WCAG 2.1 relative luminance formula
	return 0.2126 * linearRgb[0] + 0.7152 * linearRgb[1] + 0.0722 * linearRgb[2];
}

/** Parse common CSS color formats to [r, g, b] (0-255 each) */
function parseColorToRgb(color: string): [number, number, number] | null {
	const trimmed = color.trim().toLowerCase();

	// Named colors (basic set)
	const namedColors: Record<string, [number, number, number]> = {
		transparent: [0, 0, 0],
		black: [0, 0, 0],
		white: [255, 255, 255],
		red: [255, 0, 0],
		green: [0, 128, 0],
		blue: [0, 0, 255],
		yellow: [255, 255, 0],
		cyan: [0, 255, 255],
		magenta: [255, 0, 255],
		gray: [128, 128, 128],
		grey: [128, 128, 128]
	};

	if (namedColors[trimmed]) return namedColors[trimmed];

	// Hex: #rgb, #rrggbb, #rgba, #rrggbbaa
	const hexMatch = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
	if (hexMatch) {
		const hex = hexMatch[1];
		if (hex.length === 3 || hex.length === 4) {
			// #rgb or #rgba
			return [
				parseInt(hex[0] + hex[0], 16),
				parseInt(hex[1] + hex[1], 16),
				parseInt(hex[2] + hex[2], 16)
			];
		}
		// #rrggbb or #rrggbbaa
		return [
			parseInt(hex.slice(0, 2), 16),
			parseInt(hex.slice(2, 4), 16),
			parseInt(hex.slice(4, 6), 16)
		];
	}

	// rgb() / rgba()
	const rgbMatch = trimmed.match(
		/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+)?\s*\)$/
	);
	if (rgbMatch) {
		return [
			clamp(parseInt(rgbMatch[1], 10), 0, 255),
			clamp(parseInt(rgbMatch[2], 10), 0, 255),
			clamp(parseInt(rgbMatch[3], 10), 0, 255)
		];
	}

	// hsl() / hsla()
	const hslMatch = trimmed.match(
		/^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*[\d.]+)?\s*\)$/
	);
	if (hslMatch) {
		const h = parseFloat(hslMatch[1]) / 360;
		const s = parseFloat(hslMatch[2]) / 100;
		const l = parseFloat(hslMatch[3]) / 100;
		return hslToRgb(h, s, l);
	}

	return null;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
	if (s === 0) {
		const v = Math.round(l * 255);
		return [v, v, v];
	}

	const hue2rgb = (p: number, q: number, t: number) => {
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1 / 6) return p + (q - p) * 6 * t;
		if (t < 1 / 2) return q;
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
		return p;
	};

	const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
	const p = 2 * l - q;

	return [
		Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
		Math.round(hue2rgb(p, q, h) * 255),
		Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
	];
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}
