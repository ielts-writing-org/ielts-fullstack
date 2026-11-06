import z from "zod";
import { countWords } from "#lib/utils/stats.ts";

const PROMPT_MIN_WORDS = 15;
const PROMPT_MAX_WORDS = 85;

export const taskPromptSchema = z.string().refine((val) => {
	const words = countWords(val);
	return words >= PROMPT_MIN_WORDS && words <= PROMPT_MAX_WORDS;
}, `Task prompt must be between ${PROMPT_MIN_WORDS.toString()} and ${PROMPT_MAX_WORDS.toString()} words`);
