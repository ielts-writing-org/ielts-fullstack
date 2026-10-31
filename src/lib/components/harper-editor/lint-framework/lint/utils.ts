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
