import { describe, expect, it } from "vitest";
import {
	getResponseAcceptableWordCount,
	getResponseIdealWordCount,
	TASK_RESPONSE_IDEAL_WORDS
} from "./task-response.ts";

describe("getResponseIdealWordCount", () => {
	it("uses the official Task 1 minimum word count", () => {
		expect(getResponseIdealWordCount("1")).toBe(150);
	});

	it("uses the official Task 2 minimum word count", () => {
		expect(getResponseIdealWordCount("2")).toBe(250);
	});

	it.each([
		["1" as const, 150],
		["2" as const, 250]
	])("matches the ideal-word table for Task %s", (category, ideal) => {
		expect(TASK_RESPONSE_IDEAL_WORDS[category]).toBe(ideal);
	});
});

describe("getResponseAcceptableWordCount", () => {
	it.each([
		["1" as const, [120, 220]],
		["2" as const, [220, 320]]
	])("brackets the ideal count for Task %s", (category, expected) => {
		expect(getResponseAcceptableWordCount(category)).toEqual(expected);
	});

	it.each(["1", "2"] as const)(
		"starts 30 words below and ends 70 words above the ideal (Task %s)",
		(category) => {
			const ideal = getResponseIdealWordCount(category);
			expect(getResponseAcceptableWordCount(category)).toEqual([ideal - 30, ideal + 70]);
		}
	);

	it("keeps the acceptable range ordered and inside the response limits", () => {
		for (const category of ["1", "2"] as const) {
			const [min, max] = getResponseAcceptableWordCount(category);
			expect(min).toBeLessThan(max);
			expect(min).toBeGreaterThan(0);
		}
	});
});
