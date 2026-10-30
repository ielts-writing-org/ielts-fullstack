import { countWords } from "#lib/utils/stats.ts";
import { z } from "zod";

const PROMPT_MIN_WORDS = 15;
const PROMPT_MAX_WORDS = 85;
const RESPONSE_MIN_WORDS = 125;
const RESPONSE_MAX_WORDS = 320;

const taskPromptSchema = z.string("Task prompt should be a string.").refine((val) => {
	const words = countWords(val);
	return words >= PROMPT_MIN_WORDS && words <= PROMPT_MAX_WORDS;
}, `Task prompt must be between ${PROMPT_MIN_WORDS.toString()} and ${PROMPT_MAX_WORDS.toString()} words`);

const practiceSessionSchema = z.object({
	response: z.string().refine((val) => {
		const words = countWords(val);
		return words >= RESPONSE_MIN_WORDS && words <= RESPONSE_MAX_WORDS;
	}, `Task response must be between ${RESPONSE_MIN_WORDS.toString()} and ${RESPONSE_MAX_WORDS.toString()} words`)
});

const taskSchema = z.discriminatedUnion("category", [
	z.object({
		category: z.literal("1"),
		prompt: taskPromptSchema,
		imageName: z.string("Task image name should be a string.")
	}),
	z.object({
		category: z.literal("2"),
		prompt: taskPromptSchema
	})
]);

export const evaluateRequestSchema = z.object({
	task: taskSchema,
	practiceSession: practiceSessionSchema
});

export type EvaluateRequest = z.infer<typeof evaluateRequestSchema>;
