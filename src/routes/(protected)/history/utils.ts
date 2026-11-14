import type { TaskCategory } from "#lib/domain/task-category.ts";
import type { TaskSubcategory } from "#lib/domain/task-subcategory.ts";
import { resolve } from "$app/paths";
import type { PageData } from "./$types";

export type SessionItem = PageData["practiceSessions"][number];
export type HistoryStats = PageData["stats"];
export type TrendPoint = PageData["trend"][number];

export type FilterKey = "q" | "task" | "subcategory" | "type" | "status" | "body" | "sort" | "page";

export type HistoryFiltersData = {
	q: string;
	task: "1" | "2" | null;
	subcategory: TaskSubcategory<TaskCategory> | null;
	type: "timed" | "free" | null;
	status: "evaluated" | "unevaluated" | null;
	body: boolean;
	sort: "recent" | "oldest" | "band" | "words";
};

export function buildHistoryHref(query?: string) {
	return resolve(`/(protected)/history?${query}`);
}

export const newPracticeHref = resolve("/(protected)");

export function practiceHref(practiceSessionId: string) {
	return resolve("/(protected)/practice/[practiceSessionId=practiceSessionId]", {
		practiceSessionId
	});
}

/** Builds a query string for the given filter state with optional overrides. */
export function buildHref(
	filters: HistoryFiltersData,
	currentPage: number,
	overrides: Partial<Record<FilterKey, string>> = {}
) {
	const state: Record<FilterKey, string> = {
		q: filters.q,
		task: filters.task ?? "all",
		subcategory: filters.subcategory ?? "all",
		type: filters.type ?? "all",
		status: filters.status ?? "all",
		body: filters.body ? "1" : "0",
		sort: filters.sort,
		page: String(currentPage),
		...overrides
	};

	const params = new URLSearchParams();
	if (state.q) params.set("q", state.q);
	if (state.task !== "all") params.set("task", state.task);
	if (state.subcategory !== "all") params.set("subcategory", state.subcategory);
	if (state.type !== "all") params.set("type", state.type);
	if (state.status !== "all") params.set("status", state.status);
	if (state.body === "1") params.set("body", "1");
	if (state.sort !== "recent") params.set("sort", state.sort);
	if (state.page !== "1") params.set("page", state.page);

	const query = params.toString();
	return query ? `${query}` : "";
}

/**
 * Page numbers to render, `null` marking an ellipsis gap. Keeps long page
 * lists to the edges plus a window around the current page.
 */
export function pageWindow(current: number, total: number): (number | null)[] {
	if (total <= 7) {
		return Array.from({ length: total }, (_, i) => i + 1);
	}

	const wanted = new Set([1, total, current - 1, current, current + 1]);
	const ordered = [...wanted].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

	const window: (number | null)[] = [];
	let previous = 0;
	for (const pageNumber of ordered) {
		if (pageNumber - previous > 1) {
			window.push(null);
		}
		window.push(pageNumber);
		previous = pageNumber;
	}
	return window;
}
