import { describe, expect, it } from "vitest";
import { getPromptAcceptableWordCount, taskPromptSchema } from "./task-prompt.ts";
import { createMockString } from "#lib/utils/test.ts";

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
