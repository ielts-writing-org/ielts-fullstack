import { z } from "zod";

const evaluationCheckSchema = z.object({
	id: z.string(),
	name: z.string().meta({ description: "Human-friendly name" }),
	weight: z.number().min(0).max(1),
	status: z.enum(["met", "partially_met", "not_met"]),
	why: z.string().min(1)
});

const evaluationProblemSchema = z.object({
	name: z.string().min(1),
	description: z.string().min(1),
	advice: z.string().min(1)
});

const evaluationCriterionSchema = z
	.object({
		band: z.number().min(0).max(9).multipleOf(0.5).nullable(),
		checks: z.array(evaluationCheckSchema).min(1).meta({
			description: "Include all checks even they are not met."
		}),
		problems: z.array(evaluationProblemSchema).meta({
			description: "Fixable problems exist in the response."
		}),
		why_this_band: z.string(),
		why_not_next_band: z.string().optional()
	})
	.meta({
		id: "EvaluateCriterion"
	});

export const evaluationSchema = z.object({
	criteria: z.object({
		task_response: evaluationCriterionSchema,
		coherence_and_cohesion: evaluationCriterionSchema,
		lexical_resource: evaluationCriterionSchema,
		grammatical_range_and_accuracy: evaluationCriterionSchema
	}),
	overall_band: z.number().min(0).max(9).multipleOf(0.5).nullable().meta({
		description: "The overall score based on the 4 criteria."
	})
});

export type EvaluationCheck = z.infer<typeof evaluationCheckSchema>;
export type EvaluationProblem = z.infer<typeof evaluationProblemSchema>;
export type EvaluationCriterion = z.infer<typeof evaluationCriterionSchema>;
export type Evaluation = z.infer<typeof evaluationSchema>;
