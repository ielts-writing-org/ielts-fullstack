import z from "zod";
import { countWords } from "#lib/utils/stats.ts";

const [min, max] = getPromptAcceptableWordCount();

export const taskPromptSchema = z.string().refine((val) => {
	const words = countWords(val);
	return words >= min && words <= max;
}, `Task prompt must be between ${min.toString()} and ${max.toString()} words`);

export function getPromptAcceptableWordCount(): [number, number] {
	return [15, 85];
}
