import type { TaskCategory } from "#lib/schemas/task-category.ts";
import type { AllTaskSubcategory, TaskSubcategory } from "#lib/schemas/task-subcategory.ts";

/** Human-friendly labels for task subcategories, keyed by their stored value. */
export const TASK_SUBCATEGORY_LABELS = {
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
} as const satisfies Record<AllTaskSubcategory, string>;

const TASK_1_SUBCATEGORIES = [
	"line-graph",
	"bar-chart",
	"pie-chart",
	"table",
	"mixed-charts",
	"process",
	"map"
] as const satisfies readonly TaskSubcategory<"1">[];

const TASK_2_SUBCATEGORIES = [
	"letter",
	"opinion-essay",
	"discussion-essay",
	"advantages-disadvantages-essay",
	"problem-solution-essay",
	"two-part-question-essay"
] as const satisfies readonly TaskSubcategory<"2">[];

/** Subcategories that are valid for each task category. */
export const TASK_SUBCATEGORIES_BY_CATEGORY: Record<
	TaskCategory,
	readonly AllTaskSubcategory[]
> = {
	"1": TASK_1_SUBCATEGORIES,
	"2": TASK_2_SUBCATEGORIES
};

/** Whether `subcategory` is a valid subcategory of `category`. */
export function isValidSubcategoryFor(
	category: TaskCategory,
	subcategory: string
): subcategory is AllTaskSubcategory {
	return (TASK_SUBCATEGORIES_BY_CATEGORY[category] as readonly string[]).includes(subcategory);
}

/** Display label for a subcategory value. */
export function taskSubcategoryLabel(subcategory: AllTaskSubcategory): string {
	return TASK_SUBCATEGORY_LABELS[subcategory];
}
