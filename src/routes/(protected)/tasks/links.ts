import { resolve } from "$app/paths";
import { SvelteURLSearchParams } from "svelte/reactivity";
import type { PageData } from "./$types";
import type { TaskSubcategory } from "#lib/domain/task-subcategory.ts";
import type { TaskCategory } from "#lib/domain/task-category.ts";

export type TaskItem = PageData["tasks"][number];

export type FilterKey = "q" | "task" | "subcategory" | "source" | "sort" | "page";

export type TaskFiltersData = {
	q: string;
	task: "1" | "2" | null;
	subcategory: TaskSubcategory<TaskCategory> | null;
	source: "mine" | "example" | null;
	sort: "recent" | "oldest" | "name" | "practiced";
};

export const tasksHref = resolve("/(protected)/tasks");

/** Builds a query string for the given filter state with optional overrides. */
export function buildQuery(
	filters: TaskFiltersData,
	currentPage: number,
	overrides: Partial<Record<FilterKey, string>> = {}
) {
	const state: Record<FilterKey, string> = {
		q: filters.q,
		task: filters.task ?? "all",
		subcategory: filters.subcategory ?? "all",
		source: filters.source ?? "all",
		sort: filters.sort,
		page: String(currentPage),
		...overrides
	};

	const params = new SvelteURLSearchParams();
	if (state.q) params.set("q", state.q);
	if (state.task !== "all") params.set("task", state.task);
	if (state.subcategory !== "all") params.set("subcategory", state.subcategory);
	if (state.source !== "all") params.set("source", state.source);
	if (state.sort !== "recent") params.set("sort", state.sort);
	if (state.page !== "1") params.set("page", state.page);

	const query = params.toString();
	return query ? `?${query}` : "";
}

export function practiceHref(practiceSessionId: string) {
	return resolve("/(protected)/practice/[practiceSessionId=practiceSessionId]", {
		practiceSessionId
	});
}
