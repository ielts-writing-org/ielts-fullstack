import { countWords } from "./text-stats.ts";
import { getResponseAcceptableWordCount, taskPromptSchema, taskResponseSchema } from "./task.ts";
import { z } from "zod";

// --- Band scale ---

/** IELTS bands run from 0 to 9 in half-band steps. */
export const BAND_MIN = 0;
export const BAND_MAX = 9;

export const bandSchema = z.number().min(BAND_MIN).max(BAND_MAX);

/** Rounds a computed band to the nearest half band (0.5 steps). */
export function roundToNearestHalfBand(value: number): number {
	return (Math.sign(value) * Math.round(Math.abs(value * 2))) / 2;
}

/** Band position as a 0-1 fraction of the IELTS scale, clamped. */
export function getBandFraction(band: number): number {
	return Math.max(0, Math.min(1, band / BAND_MAX));
}

/** Band position as a 0-100 percentage of the IELTS scale, clamped. */
export function getBandPercentage(band: number): number {
	return getBandFraction(band) * 100;
}

/**
 * Official IELTS Writing overall band: Task 2 carries twice the weight of
 * Task 1 — (task1 + task2 * 2) / 3. When only one task has been graded, its
 * band is the overall band; with neither, 0.
 */
export function combineWritingBands(task1Band: number | null, task2Band: number | null): number {
	if (task1Band !== null && task2Band !== null) {
		return (task1Band + task2Band * 2) / 3;
	}

	return task1Band ?? task2Band ?? 0;
}

// --- Criteria ---

export const criteriaForTask1Schema = z.enum([
	"taskAchievement",
	"coherenceAndCohesion",
	"lexicalResource",
	"grammaticalRangeAndAccuracy"
]);

export const criteriaForTask2Schema = z.enum([
	"taskResponse",
	"coherenceAndCohesion",
	"lexicalResource",
	"grammaticalRangeAndAccuracy"
]);

export const criteria = [
	...new Set([...criteriaForTask1Schema.options, ...criteriaForTask2Schema.options])
];

export const criterionCheckStatus = z.enum(["met", "partially_met", "not_met"]);

export type CriteriaForTask1 = z.infer<typeof criteriaForTask1Schema>;
export type CriteriaForTask2 = z.infer<typeof criteriaForTask2Schema>;
export type Criteria = CriteriaForTask1 | CriteriaForTask2;
export type CriterionCheckStatus = z.infer<typeof criterionCheckStatus>;

export const CRITERIA_LABELS = {
	taskAchievement: "Task Achievement",
	taskResponse: "Task Response",
	coherenceAndCohesion: "Coherence & Cohesion",
	lexicalResource: "Lexical Resource",
	grammaticalRangeAndAccuracy: "Grammar Range & Accuracy"
} as const satisfies Record<Criteria, string>;

export const CRITERION_CHECK_STATUS_LABELS = {
	met: "Met",
	partially_met: "Partially met",
	not_met: "Not met"
} as const satisfies Record<CriterionCheckStatus, string>;

export const isCriteriaKey = (key: unknown): key is Criteria => {
	return criteria.includes(key as Criteria);
};

// --- Evaluation schema (the AI grading contract) ---

const criterionCheckSchema = z
	.object({
		title: z.string(),
		status: criterionCheckStatus,
		evidence: z.string()
	})
	.meta({ id: "CriterionCheck" });

const strengthDetailsSchema = z
	.object({
		title: z.string(),
		evidence: z.string()
	})
	.meta({ id: "CriterionStrength" });

const weaknessDetailsSchema = z
	.object({
		title: z.string(),
		evidence: z.string(),
		advice: z.string()
	})
	.meta({ id: "CriterionWeakness" });

const criterionSchema = z
	.object({
		band: bandSchema,
		checks: z.array(criterionCheckSchema).min(1),
		strengths: z.array(strengthDetailsSchema),
		weaknesses: z.array(weaknessDetailsSchema),
		why: z.string(),
		nextBandGap: z.string().nullable()
	})
	.meta({ id: "Criterion" });

const task1Criteria = z.object({
	taskAchievement: criterionSchema,
	coherenceAndCohesion: criterionSchema,
	lexicalResource: criterionSchema,
	grammaticalRangeAndAccuracy: criterionSchema
});

const task2Criteria = z.object({
	taskResponse: criterionSchema,
	coherenceAndCohesion: criterionSchema,
	lexicalResource: criterionSchema,
	grammaticalRangeAndAccuracy: criterionSchema
});

export const evaluationSchema = z.discriminatedUnion("taskCategory", [
	z.object({
		taskCategory: z.literal("1"),
		criteria: task1Criteria,
		summary: z.string(),
		estimatedBand: bandSchema
	}),
	z.object({
		taskCategory: z.literal("2"),
		criteria: task2Criteria,
		summary: z.string(),
		estimatedBand: bandSchema
	})
]);

export type EvaluationCriterion = z.infer<typeof criterionSchema>;
export type Evaluation = z.infer<typeof evaluationSchema>;

/**
 * Per-criterion bands keyed by their criterion key.
 *
 * Only one of `taskAchievement` (Task 1) or `taskResponse` (Task 2) is present,
 * so the record is partial. Returns `null` when the session has no evaluation.
 */
export function getCriterionBands(
	result: Evaluation | undefined
): Partial<Record<Criteria, number>> | null {
	if (!result) {
		return null;
	}

	const { coherenceAndCohesion, lexicalResource, grammaticalRangeAndAccuracy } = result.criteria;

	return result.taskCategory === "1"
		? {
				taskAchievement: result.criteria.taskAchievement.band,
				coherenceAndCohesion: coherenceAndCohesion.band,
				lexicalResource: lexicalResource.band,
				grammaticalRangeAndAccuracy: grammaticalRangeAndAccuracy.band
			}
		: {
				taskResponse: result.criteria.taskResponse.band,
				coherenceAndCohesion: coherenceAndCohesion.band,
				lexicalResource: lexicalResource.band,
				grammaticalRangeAndAccuracy: grammaticalRangeAndAccuracy.band
			};
}

// --- Evaluate request validation ---

export const evaluateRequestSchema = z
	.object({
		task: z.discriminatedUnion("category", [
			z.object({
				category: z.literal("1"),
				prompt: taskPromptSchema,
				imageName: z.string()
			}),
			z.object({
				category: z.literal("2"),
				prompt: taskPromptSchema
			})
		]),
		practiceSession: z.object({
			response: taskResponseSchema
		})
	})
	.superRefine((val, ctx) => {
		const [min, max] = getResponseAcceptableWordCount(val.task.category);
		const words = countWords(val.practiceSession.response);
		if (words < min || words > max) {
			ctx.addIssue(`Task response must be between ${min.toString()} and ${max.toString()} words`);
		}
	});

export type EvaluateRequest = z.infer<typeof evaluateRequestSchema>;
