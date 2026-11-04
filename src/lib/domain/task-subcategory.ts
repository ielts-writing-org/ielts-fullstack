import { z } from "zod";
import type { TaskCategory } from "./task-category";

const TASK_1_SUBCATEGORIES = [
	"line-graph",
	"bar-chart",
	"pie-chart",
	"table",
	"mixed-charts",
	"process",
	"map"
] as const;
const TASK_2_SUBCATEGORIES = [
	"letter",
	"opinion-essay",
	"discussion-essay",
	"advantages-disadvantages-essay",
	"problem-solution-essay",
	"two-part-question-essay"
] as const;
const ALL_TASK_SUBCATEGORIES = [...TASK_1_SUBCATEGORIES, ...TASK_2_SUBCATEGORIES] as const;

export type TaskSubcategory<TTaskCategory extends TaskCategory> = TTaskCategory extends "1"
	? (typeof TASK_1_SUBCATEGORIES)[number]
	: (typeof TASK_2_SUBCATEGORIES)[number];

export function getTaskSubcategories(category: TaskCategory) {
	return category === "1" ? TASK_1_SUBCATEGORIES : TASK_2_SUBCATEGORIES;
}

export function getAllTaskSubcategories() {
	return ALL_TASK_SUBCATEGORIES;
}

export const task1SubcategorySchema = z.enum(TASK_1_SUBCATEGORIES);
export const task2SubcategorySchema = z.enum(TASK_2_SUBCATEGORIES);
export const taskSubcategorySchema = z.enum(ALL_TASK_SUBCATEGORIES);

export function isValidSubcategory<TTaskCategory extends TaskCategory>(
	category: TTaskCategory,
	subcategory: string
): subcategory is TaskSubcategory<TTaskCategory> {
	return category === "1"
		? task1SubcategorySchema.safeParse(subcategory).success
		: task2SubcategorySchema.safeParse(subcategory).success;
}

const TASK_SUBCATEGORY_LABELS = {
	"line-graph": "Line graph",
	"bar-chart": "Bar chart",
	"pie-chart": "Pie chart",
	table: "Table",
	"mixed-charts": "Mixed charts",
	process: "Process",
	map: "Map",
	letter: "Letter",
	"opinion-essay": "Opinion essay",
	"discussion-essay": "Discussion essay",
	"advantages-disadvantages-essay": "Advantages & disadvantages essay",
	"problem-solution-essay": "Problem & solution essay",
	"two-part-question-essay": "Two-part question essay"
} as const satisfies Record<TaskSubcategory<TaskCategory>, string>;

export function taskSubcategoryLabel(subcategory: TaskSubcategory<TaskCategory>) {
	return TASK_SUBCATEGORY_LABELS[subcategory];
}
