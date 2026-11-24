import { describe, expect, it } from "vitest";
import {
	getPromptAcceptableWordCount,
	getResponseAcceptableWordCount,
	getResponseIdealWordCount,
	TASK_RESPONSE_IDEAL_WORDS,
	taskPromptSchema
} from "./task.ts";
import { createMockString } from "#lib/testing/test.ts";

describe.concurrent("taskPromptSchema", () => {
	const [min, max] = getPromptAcceptableWordCount();

	it.each([
		["accepts", min, true],
		["accepts", max, true],
		["accepts", min + 18, true],
		["rejects", min - 5, false],
		["rejects", max + 18, false]
	])("%s prompt with %i word(s)", (_, length, expected) => {
		const prompt = createMockString(length);
		expect(taskPromptSchema.safeParse(prompt).success).toBe(expected);
	});

	it("counts words across multiple whitespace kinds", () => {
		const prompt = `${Array.from({ length: 15 }, (_, i) => `word${i}`).join("\n\t ")}`;
		expect(taskPromptSchema.safeParse(prompt).success).toBe(true);
	});

	it("rejects empty and non-string prompts", () => {
		expect(taskPromptSchema.safeParse("").success).toBe(false);
		expect(taskPromptSchema.safeParse("   ").success).toBe(false);
		expect(taskPromptSchema.safeParse(42).success).toBe(false);
	});
});

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
