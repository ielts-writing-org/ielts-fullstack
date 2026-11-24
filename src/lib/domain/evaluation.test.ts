import { describe, expect, it } from "vitest";
import {
	BAND_MAX,
	BAND_MIN,
	bandSchema,
	combineWritingBands,
	evaluationSchema,
	evaluateRequestSchema,
	getBandFraction,
	getBandPercentage,
	getCriterionBands,
	roundToNearestHalfBand
} from "./evaluation.ts";
import {
	getPromptAcceptableWordCount,
	getResponseAcceptableWordCount,
	getResponseIdealWordCount
} from "./task.ts";
import { createMockString } from "#lib/testing/test.ts";

describe("bandSchema", () => {
	it("accepts every half-step band on the IELTS scale", () => {
		for (let band = BAND_MIN; band <= BAND_MAX; band += 0.5) {
			expect(bandSchema.safeParse(band).success).toBe(true);
		}
	});

	it.each([0, 0.5, 2.5, 6, 9])("accepts band %f", (band) => {
		expect(bandSchema.safeParse(band).success).toBe(true);
	});

	it.each([-1, -0.5, 9.5, 10, Number.NaN, Number.POSITIVE_INFINITY])("rejects band %f", (band) => {
		expect(bandSchema.safeParse(band).success).toBe(false);
	});

	it.each(["6", null, undefined, {}, true])("rejects non-number %s", (value) => {
		expect(bandSchema.safeParse(value).success).toBe(false);
	});
});

describe("roundToNearestHalfBand()", () => {
	it.each([
		[0, 0],
		[0.24, 0],
		[0.25, 0.5],
		[0.74, 0.5],
		[0.75, 1],
		[1.2, 1],
		[1.75, 2],
		[6.24, 6],
		[6.25, 6.5],
		[6.74, 6.5],
		[6.75, 7],
		[8.99, 9]
	])("rounds %f to %f", (value, expected) => {
		expect(roundToNearestHalfBand(value)).toBe(expected);
	});

	it("keeps every half-step band unchanged", () => {
		for (let band = BAND_MIN; band <= BAND_MAX; band += 0.5) {
			expect(roundToNearestHalfBand(band)).toBe(band);
		}
	});

	it("mirrors negative values", () => {
		expect(roundToNearestHalfBand(-1.2)).toBe(-1);
		expect(roundToNearestHalfBand(-1.25)).toBe(-1.5);
	});
});

describe("getBandFraction()", () => {
	it.each([
		[0, 0],
		[4.5, 0.5],
		[9, 1]
	])("maps band %f to the fraction %f", (band, expected) => {
		expect(getBandFraction(band)).toBeCloseTo(expected);
	});

	it.each([
		[-2, 0],
		[12, 1]
	])("clamps band %f to the fraction %f", (band, expected) => {
		expect(getBandFraction(band)).toBe(expected);
	});
});

describe("getBandPercentage()", () => {
	it.each([
		[0, 0],
		[4.5, 50],
		[7.5, 83.333],
		[9, 100]
	])("maps band %f to %f%%", (band, expected) => {
		expect(getBandPercentage(band)).toBeCloseTo(expected);
	});

	it("increases monotonically across the band scale", () => {
		for (let band = 0.5; band <= BAND_MAX; band += 0.5) {
			expect(getBandPercentage(band)).toBeGreaterThan(getBandPercentage(band - 0.5));
		}
	});

	it("clamps bands outside the IELTS scale", () => {
		expect(getBandPercentage(-2)).toBe(0);
		expect(getBandPercentage(12)).toBe(100);
	});
});

describe("combineWritingBands()", () => {
	it("weights Task 2 twice when both tasks are graded", () => {
		expect(combineWritingBands(6, 7.5)).toBeCloseTo(7);
		expect(combineWritingBands(5, 7)).toBeCloseTo(6.3333, 3);
		expect(combineWritingBands(7, 7)).toBe(7);
	});

	it("uses the only graded task", () => {
		expect(combineWritingBands(6.5, null)).toBe(6.5);
		expect(combineWritingBands(null, 7.5)).toBe(7.5);
	});

	it("returns 0 when neither task is graded", () => {
		expect(combineWritingBands(null, null)).toBe(0);
	});

	it("rounds to the nearest half band when combined with the formatter", () => {
		expect(roundToNearestHalfBand(combineWritingBands(6, 7.5))).toBe(7);
		expect(roundToNearestHalfBand(combineWritingBands(5, 7))).toBe(6.5);
		expect(roundToNearestHalfBand(combineWritingBands(null, 6.8))).toBe(7);
	});
});

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

/**
 * The evaluation schema is the contract with the AI grader: the provider must
 * return exactly this shape (enforced via structured output), and the history
 * UI derives its per-criterion bands from it through getCriterionBands().
 */
function criterion(band: number) {
	const checks: { title: string; status: string; evidence: string }[] = [
		{
			title: "Clear overview",
			status: "met",
			evidence: "The introduction frames the response."
		},
		{
			title: "Position developed",
			status: "partially_met",
			evidence: "The stance fades in the second body paragraph."
		}
	];

	return {
		band,
		checks,
		strengths: [{ title: "Linking", evidence: "Ideas flow with connectors." }],
		weaknesses: [
			{
				title: "Word choice",
				evidence: "Some vocabulary is repeated.",
				advice: "Vary word choice with synonyms."
			}
		],
		why: "The response addresses the task with clear support.",
		nextBandGap: "Develop the second body paragraph further."
	};
}

function task1Payload() {
	return {
		taskCategory: "1",
		summary: "A clear visual report.",
		estimatedBand: 6.5,
		criteria: {
			taskAchievement: criterion(6),
			coherenceAndCohesion: criterion(7),
			lexicalResource: criterion(6.5),
			grammaticalRangeAndAccuracy: criterion(6.5)
		}
	};
}

describe("evaluationSchema", () => {
	it("parses a complete Task 1 grading payload from the AI", () => {
		const result = evaluationSchema.safeParse(task1Payload());

		expect(result.success).toBe(true);
		if (!result.success || result.data.taskCategory !== "1") return;

		expect(result.data.summary).toBe("A clear visual report.");
		expect(result.data.estimatedBand).toBe(6.5);
		expect(result.data.criteria.taskAchievement.band).toBe(6);
		expect(result.data.criteria.taskAchievement.checks).toHaveLength(2);
		expect(result.data.criteria.taskAchievement.weaknesses[0].advice).toBe(
			"Vary word choice with synonyms."
		);
	});

	it("parses a Task 2 payload graded on task response instead of task achievement", () => {
		const payload = {
			taskCategory: "2",
			summary: "A well-structured discussion essay.",
			estimatedBand: 7,
			criteria: {
				taskResponse: criterion(7),
				coherenceAndCohesion: criterion(7),
				lexicalResource: criterion(6.5),
				grammaticalRangeAndAccuracy: criterion(7)
			}
		};

		const result = evaluationSchema.safeParse(payload);

		expect(result.success).toBe(true);
		if (!result.success || result.data.taskCategory !== "2") return;

		expect(result.data.summary).toBe("A well-structured discussion essay.");
		expect(result.data.criteria.taskResponse.band).toBe(7);
		expect(result.data.criteria).not.toHaveProperty("taskAchievement");
	});

	it("rejects an estimated band outside the IELTS scale", () => {
		const payload = { ...task1Payload(), estimatedBand: 9.5 };
		expect(evaluationSchema.safeParse(payload).success).toBe(false);
	});

	it("rejects a payload missing one of the four criteria", () => {
		const { criteria, ...rest } = task1Payload();
		const { lexicalResource, ...incomplete } = criteria;
		void lexicalResource;
		const payload = { ...rest, criteria: incomplete };

		expect(evaluationSchema.safeParse(payload).success).toBe(false);
	});

	it("rejects a criterion without at least one check", () => {
		const payload = task1Payload();
		payload.criteria.taskAchievement.checks = [];

		expect(evaluationSchema.safeParse(payload).success).toBe(false);
	});

	it("rejects an unknown check status", () => {
		const payload = task1Payload();
		payload.criteria.taskAchievement.checks[0].status = "failed";

		expect(evaluationSchema.safeParse(payload).success).toBe(false);
	});

	it("rejects an unknown task category", () => {
		const payload = { ...task1Payload(), taskCategory: "3" };
		expect(evaluationSchema.safeParse(payload).success).toBe(false);
	});

	it("exposes the JSON schema sent to the AI provider for structured output", () => {
		const serialized = JSON.stringify(evaluationSchema.toJSONSchema());

		expect(serialized).toContain('"taskCategory"');
		expect(serialized).toContain('"estimatedBand"');
		expect(serialized).toContain('"nextBandGap"');
	});
});

describe("getCriterionBands()", () => {
	it("returns null when the session has no evaluation", () => {
		expect(getCriterionBands(undefined)).toBeNull();
	});

	it("keys Task 1 bands by task achievement plus the shared criteria", () => {
		const evaluation = evaluationSchema.parse(task1Payload());
		const bands = getCriterionBands(evaluation);

		expect(bands).toEqual({
			taskAchievement: 6,
			coherenceAndCohesion: 7,
			lexicalResource: 6.5,
			grammaticalRangeAndAccuracy: 6.5
		});
		expect(bands).not.toHaveProperty("taskResponse");
	});

	it("keys Task 2 bands by task response plus the shared criteria", () => {
		const evaluation = evaluationSchema.parse({
			taskCategory: "2",
			summary: "A well-structured discussion essay.",
			estimatedBand: 6.5,
			criteria: {
				taskResponse: criterion(6),
				coherenceAndCohesion: criterion(6.5),
				lexicalResource: criterion(7),
				grammaticalRangeAndAccuracy: criterion(7)
			}
		});
		const bands = getCriterionBands(evaluation);

		expect(bands).toEqual({
			taskResponse: 6,
			coherenceAndCohesion: 6.5,
			lexicalResource: 7,
			grammaticalRangeAndAccuracy: 7
		});
		expect(bands).not.toHaveProperty("taskAchievement");
	});
});
