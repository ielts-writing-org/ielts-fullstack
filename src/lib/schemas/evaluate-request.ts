import { countWords } from "#lib/utils/stats.ts";
import { z } from "zod";

const PROMPT_MIN_WORDS = 15;
const PROMPT_MAX_WORDS = 85;
const RESPONSE_MIN_WORDS = 125;
const RESPONSE_MAX_WORDS = 320;

const baseEvaluationRequestSchema = z.object({
	prompt: z.string().refine((val) => {
		const words = countWords(val);
		return words >= PROMPT_MIN_WORDS && words <= PROMPT_MAX_WORDS;
	}, `Task prompt must be between ${PROMPT_MIN_WORDS.toString()} and ${PROMPT_MAX_WORDS.toString()} words`),
	response: z.string().refine((val) => {
		const words = countWords(val);
		return words >= RESPONSE_MIN_WORDS && words <= RESPONSE_MAX_WORDS;
	}, `Task response must be between ${RESPONSE_MIN_WORDS.toString()} and ${RESPONSE_MAX_WORDS.toString()} words`)
});

const evaluation1RequestSchema = baseEvaluationRequestSchema.extend({
	id: z.literal("1"),
	image: z.instanceof(File)
});

const evaluation2RequestSchema = baseEvaluationRequestSchema.extend({
	id: z.literal("2")
});

export const evaluateRequestSchema = z.discriminatedUnion("id", [
	evaluation1RequestSchema,
	evaluation2RequestSchema
]);

export type EvaluateRequest = z.infer<typeof evaluateRequestSchema>;
