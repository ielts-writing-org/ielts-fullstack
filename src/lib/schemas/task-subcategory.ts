import { z } from "zod";
import type { TaskCategory } from "./task-category";

export type TaskSubcategory<TCategory extends TaskCategory> = TCategory extends "1"
	? "line-graph" | "bar-chart" | "pie-chart" | "table" | "mixed-charts" | "process" | "map"
	: | "letter"
		| "opinion-essay"
		| "discussion-essay"
		| "advantages-disadvantages-essay"
		| "problem-solution-essay"
		| "two-part-question-essay";

export type AllTaskSubcategory = TaskSubcategory<"1" | "2">;

export const task1SubcategorySchema = z.enum([
	"line-graph",
	"bar-chart",
	"pie-chart",
	"table",
	"mixed-charts",
	"process",
	"map"
]);

export const task2SubcategorySchema = z.enum([
	"letter",
	"opinion-essay",
	"discussion-essay",
	"advantages-disadvantages-essay",
	"problem-solution-essay",
	"two-part-question-essay"
]);

export const taskSubcategorySchema = z.enum([
	...task1SubcategorySchema.options,
	...task2SubcategorySchema.options
]);
