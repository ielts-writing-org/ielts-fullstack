import { describe, expect, test } from "vitest";
import { getContrastingTextColor, getRelativeLuminance } from "./utils.js";

const getContrastingTextColorTCs: [string, string, "black" | "white"][] = [
	// Named colors
	["white named color", "white", "black"],
	["black named color", "black", "white"],
	["red named color", "red", "white"],
	["green named color", "green", "white"],
	["blue named color", "blue", "white"],
	["yellow named color (high luminance)", "yellow", "black"],
	["cyan named color", "cyan", "black"],
	["magenta named color", "magenta", "white"],
	["gray named color", "gray", "white"],
	["grey named color", "grey", "white"],

	// Hex colors - 3 digit
	["white hex #fff", "#fff", "black"],
	["black hex #000", "#000", "white"],
	["red hex #f00", "#f00", "white"],
	["green hex #0f0", "#0f0", "black"],
	["blue hex #00f", "#00f", "white"],
	["yellow hex #ff0", "#ff0", "black"],
	["cyan hex #0ff", "#0ff", "black"],
	["magenta hex #f0f", "#f0f", "white"],
	["gray hex #888", "#888", "white"],

	// Hex colors - 6 digit
	["white hex #ffffff", "#ffffff", "black"],
	["black hex #000000", "#000000", "white"],
	["red hex #ff0000", "#ff0000", "white"],
	["green hex #00ff00", "#00ff00", "black"],
	["blue hex #0000ff", "#0000ff", "white"],
	["yellow hex #ffff00", "#ffff00", "black"],
	["cyan hex #00ffff", "#00ffff", "black"],
	["magenta hex #ff00ff", "#ff00ff", "white"],
	["gray hex #808080", "#808080", "white"],
	["light gray hex #cccccc", "#cccccc", "black"],
	["dark gray hex #333333", "#333333", "white"],

	// Hex with alpha (should ignore alpha)
	["white hex with alpha #ffffffff", "#ffffffff", "black"],
	["black hex with alpha #000000ff", "#000000ff", "white"],
	["red hex with alpha #ff000080", "#ff000080", "white"],

	// 4-digit hex
	["white 4-digit hex #fff8", "#fff8", "black"],
	["black 4-digit hex #0008", "#0008", "white"],

	// rgb() / rgba()
	["white rgb()", "rgb(255, 255, 255)", "black"],
	["black rgb()", "rgb(0, 0, 0)", "white"],
	["red rgb()", "rgb(255, 0, 0)", "white"],
	["green rgb()", "rgb(0, 255, 0)", "black"],
	["blue rgb()", "rgb(0, 0, 255)", "white"],
	["yellow rgb()", "rgb(255, 255, 0)", "black"],
	["cyan rgb()", "rgb(0, 255, 255)", "black"],
	["magenta rgb()", "rgb(255, 0, 255)", "white"],
	["gray rgb()", "rgb(128, 128, 128)", "white"],
	["white rgba() with alpha", "rgba(255, 255, 255, 0.5)", "black"],
	["black rgba() with alpha", "rgba(0, 0, 0, 0.5)", "white"],

	// hsl() / hsla()
	["red hsl()", "hsl(0, 100%, 50%)", "white"],
	["green hsl()", "hsl(120, 100%, 50%)", "black"],
	["blue hsl()", "hsl(240, 100%, 50%)", "white"],
	["yellow hsl()", "hsl(60, 100%, 50%)", "black"],
	["cyan hsl()", "hsl(180, 100%, 50%)", "black"],
	["magenta hsl()", "hsl(300, 100%, 50%)", "white"],
	["white hsl()", "hsl(0, 0%, 100%)", "black"],
	["black hsl()", "hsl(0, 0%, 0%)", "white"],
	["gray hsl()", "hsl(0, 0%, 50%)", "white"],
	["red hsla() with alpha", "hsla(0, 100%, 50%, 0.5)", "white"],

	// Edge cases near threshold (luminance ~0.5)
	["mid-gray near threshold", "#767676", "white"],
	["mid-gray just above threshold", "#777777", "white"],
	["standard gray #808080", "#808080", "white"],
	["lighter gray #999999", "#999999", "white"],

	// Case insensitivity
	["uppercase hex", "#FF0000", "white"],
	["uppercase rgb()", "RGB(255, 0, 0)", "white"],
	["uppercase hsl()", "HSL(0, 100%, 50%)", "white"],
	["whitespace padding", "  #ff0000  ", "white"],

	// Transparent
	["transparent keyword", "transparent", "white"]
];

const luminanceChecksgetRelativeLuminanceTCs: [string, string, number][] = [
	["white", "white", 1.0],
	["black", "black", 0.0],
	["red", "#ff0000", 0.2126],
	["green", "#00ff00", 0.7152],
	["blue", "#0000ff", 0.0722],
	["yellow", "#ffff00", 0.9278],
	["cyan", "#00ffff", 0.7874],
	["magenta", "#ff00ff", 0.2848],
	["gray", "#808080", 0.2159]
];

describe("getContrastingTextColor()", () => {
	test.each(getContrastingTextColorTCs)(
		'contrast color of %s: "%s" -> %s',
		(_, color, expected) => {
			const result = getContrastingTextColor(color);
			expect(result).toBe(expected);
		}
	);

	test.each(luminanceChecksgetRelativeLuminanceTCs)(
		'luminance of %s: "%s" = %s',
		(_, color, expected) => {
			const c = getRelativeLuminance(color);
			expect(c).toBeCloseTo(expected, 3);
		}
	);
});
