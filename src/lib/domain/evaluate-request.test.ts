import { describe, expect, it } from "vitest";
import { evaluateRequestSchema } from "./evaluate-request.ts";
import { createMockString } from "#lib/utils/test.ts";
import { getPromptAcceptableWordCount } from "./task-prompt.ts";
import { getResponseAcceptableWordCount, getResponseIdealWordCount } from "./task-response.ts";

describe.concurrent("evaluateRequestSchema", () => {
	const [minPrompt, maxPrompt] = getPromptAcceptableWordCount();

	describe.concurrent("Task 1", () => {
		const [minResponse, maxResponse] = getResponseAcceptableWordCount("1");
		const ideal = getResponseIdealWordCount("1");

		it.concurrent.each([
			["accepts", "prompt", minPrompt, ideal, true],
			["accepts", "prompt", maxPrompt, ideal, true],
			["accepts", "prompt", minPrompt + 18, ideal, true],
			["accepts", "response", minPrompt, minResponse, true],
			["accepts", "response", minPrompt, maxResponse, true],
			["accepts", "response", minPrompt, minResponse + 18, true],
			["rejects", "response", minPrompt, minResponse - 18, false],
			["rejects", "response", minPrompt, maxResponse + 18, false]
		])("%s %s with %i word(s)", (_1, _2, promptLength, responseLength, expected) => {
			const result = evaluateRequestSchema.safeParse({
				task: {
					category: "1",
					prompt: createMockString(promptLength),
					imageName: "018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6b.webp"
				},
				practiceSession: { response: createMockString(responseLength) }
			});
			expect(result.success).toBe(expected);
		});

		it("rejects if missing image", () => {
			const result = evaluateRequestSchema.safeParse({
				task: { category: "1", prompt: createMockString(minPrompt + 18) },
				practiceSession: { response: createMockString(160) }
			});
			expect(result.success).toBe(false);
		});
	});

	describe.concurrent("Task 2", () => {
		const [minPrompt, maxPrompt] = getPromptAcceptableWordCount();
		const [minResponse, maxResponse] = getResponseAcceptableWordCount("2");
		const ideal = getResponseIdealWordCount("2");

		it.concurrent.each([
			["accepts", "prompt", minPrompt, ideal, true],
			["accepts", "prompt", maxPrompt, ideal, true],
			["accepts", "prompt", minPrompt + 18, ideal, true],
			["accepts", "response", minPrompt, minResponse, true],
			["accepts", "response", minPrompt, maxResponse, true],
			["accepts", "response", minPrompt, minResponse + 18, true],
			["rejects", "response", minPrompt, minResponse - 18, false],
			["rejects", "response", minPrompt, maxResponse + 18, false]
		])("%s %s with %i word(s)", (_1, _2, promptLength, responseLength, expected) => {
			const result = evaluateRequestSchema.safeParse({
				task: { category: "2", prompt: createMockString(promptLength) },
				practiceSession: { response: createMockString(responseLength) }
			});
			expect(result.success).toBe(expected);
		});
	});

	it("rejects unknown task categories", () => {
		const result = evaluateRequestSchema.safeParse({
			task: { category: "3", prompt: createMockString(minPrompt + 18) },
			practiceSession: { response: createMockString(200) }
		});
		expect(result.success).toBe(false);
	});
});
