import z from "zod";
import type { TaskCategory } from "./task-category";

export const TASK_RESPONSE_IDEAL_WORDS: Record<TaskCategory, number> = {
	"1": 150,
	"2": 250
};

export const taskResponseSchema = z.string();

export function getResponseIdealWordCount(category: TaskCategory): number {
	return TASK_RESPONSE_IDEAL_WORDS[category];
}

export function getResponseAcceptableWordCount(taskCategory: TaskCategory): [number, number] {
	const ideal = getResponseIdealWordCount(taskCategory);
	return [ideal - 30, ideal + 70];
}
