import { z } from "zod";
import { bandSchema } from "../domain/band";
import { criterionCheckStatus } from "../domain/criteria";

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
