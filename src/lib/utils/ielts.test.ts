import { describe, expect, it } from "vitest";
import { getTimeLimitInMinutes, convertBandToProgressValue } from "./ielts.ts";
import { getResponseIdealWordCount } from "#lib/domain/task-response.ts";

/**
 * Official IELTS Writing exam requirements drive the practice UI: Task 1 = 20
 * minutes / 150 words, Task 2 = 40 minutes / 250 words. The band tone helpers
 * color every band badge in the app consistently.
 */
describe("official task requirements", () => {
	it("uses the Task 1 requirements", () => {
		expect(getResponseIdealWordCount("1")).toBe(150);
		expect(getTimeLimitInMinutes("1")).toBe(20);
	});

	it("uses the Task 2 requirements", () => {
		expect(getResponseIdealWordCount("2")).toBe(250);
		expect(getTimeLimitInMinutes("2")).toBe(40);
	});
});

describe("convertBandToProgressValue", () => {
	it("maps the band scale onto 0-100", () => {
		expect(convertBandToProgressValue(0)).toBe(0);
		expect(convertBandToProgressValue(9)).toBe(100);
		expect(convertBandToProgressValue(4.5)).toBe(50);
	});

	it("clamps out-of-range bands", () => {
		expect(convertBandToProgressValue(-2)).toBe(0);
		expect(convertBandToProgressValue(12)).toBe(100);
	});
});
