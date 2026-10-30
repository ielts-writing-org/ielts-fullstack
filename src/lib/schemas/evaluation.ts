import { z } from "zod";
import { bandSchema } from "./band";
import { criterionCheckStatus } from "./criteria";

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
		strength: z.array(strengthDetailsSchema),
		weakness: z.array(weaknessDetailsSchema),
		why: z.string(),
		nextBandGap: z.string().nullable()
	})
	.meta({ id: "Criterion" });

const task1EvaluationSchema = z.object({
	taskCategory: z.literal("1"),
	criteria: z.object({
		taskAchievement: criterionSchema,
		coherenceAndCohesion: criterionSchema,
		lexicalResource: criterionSchema,
		grammaticalRangeAndAccuracy: criterionSchema
	})
});

const task2EvaluationSchema = z.object({
	taskCategory: z.literal("2"),
	criteria: z.object({
		taskResponse: criterionSchema,
		coherenceAndCohesion: criterionSchema,
		lexicalResource: criterionSchema,
		grammaticalRangeAndAccuracy: criterionSchema
	})
});

export const evaluationSchema = z.intersection(
	z.discriminatedUnion("taskCategory", [task1EvaluationSchema, task2EvaluationSchema]),
	z.object({
		summary: z.string(),
		estimatedBand: bandSchema
	})
);

export type EvaluationCriterion = z.infer<typeof criterionSchema>;
export type Evaluation = z.infer<typeof evaluationSchema>;
