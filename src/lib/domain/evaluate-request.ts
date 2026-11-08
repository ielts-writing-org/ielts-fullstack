import { z } from "zod";
import { taskPromptSchema } from "./task-prompt";
import { getResponseAcceptableWordCount, taskResponseSchema } from "./task-response";
import { countWords } from "#lib/utils/stats.ts";

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
		if (words < min && words > max) {
			ctx.addIssue(`Task prompt must be between ${min.toString()} and ${max.toString()} words`);
		}
	});

export type EvaluateRequest = z.infer<typeof evaluateRequestSchema>;
