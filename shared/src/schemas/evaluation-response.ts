import { z } from "zod";

const CheckEvaluationResponseSchema = z.object({
	id: z.string(),
	weight: z.number().min(0).max(1),
	status: z.enum(["met", "partially_met", "not_met"]),
	evidence: z.string().min(1).meta({
		description: "What causes the problem?"
	}),
	why: z.string().min(1).meta({
		description: "Explain why choose the status based on evidence."
	})
});

const ProblemEvaluationResponseSchema = z.object({
	what: z.string().min(1),
	evidence: z.string().min(1).meta({
		description: "What causes the problem?"
	}),
	how_to: z.string().min(1).meta({
		description: "How to fix the problem?"
	})
});

const CriterionEvaluationResponseSchema = z
	.object({
		band: z.number().min(0).max(9).nullable(),
		checks: z.array(CheckEvaluationResponseSchema).min(1).meta({
			description: "Must include all check even they are not met."
		}),
		problems: z.array(ProblemEvaluationResponseSchema).meta({
			description: "Fixable problems exist in the response."
		}),
		why_this_band: z.string(),
		why_not_next_band: z.string().nullable()
	})
	.meta({
		id: "CriterionEvaluationResponse"
	});

export const EvaluationResponseSchema = z.object({
	criteria: z.object({
		task_response: CriterionEvaluationResponseSchema,
		coherence_and_cohesion: CriterionEvaluationResponseSchema,
		lexical_resource: CriterionEvaluationResponseSchema,
		grammatical_range_and_accuracy: CriterionEvaluationResponseSchema
	}),
	overall_band: z.number().min(0).max(9).nullable().meta({
		description: "The overall score based on the 4 criteria."
	})
});

export type CheckEvaluationResponse = z.infer<typeof CheckEvaluationResponseSchema>;
export type ProblemEvaluationResponse = z.infer<typeof ProblemEvaluationResponseSchema>;
export type CriterionEvaluationResponse = z.infer<typeof CriterionEvaluationResponseSchema>;
export type EvaluationResponse = z.infer<typeof EvaluationResponseSchema>;
