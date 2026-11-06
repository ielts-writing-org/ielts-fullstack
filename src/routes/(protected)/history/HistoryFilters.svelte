<script lang="ts">
	import { onDestroy } from "svelte";
	import { goto } from "$app/navigation";
	import { Search, X } from "@lucide/svelte";
	import type { TaskCategory } from "#lib/domain/task-category.ts";
	import { getTaskSubcategoryLabel, type TaskSubcategory } from "#lib/domain/task-subcategory.ts";
	import { buildHref, historyHref, type FilterKey, type HistoryFiltersData } from "./utils.ts";

	type Props = {
		filters: HistoryFiltersData;
		resultCount: number;
		total: number;
		availableSubcategories: readonly TaskSubcategory<TaskCategory>[];
	};
	let { filters, resultCount, total, availableSubcategories }: Props = $props();

	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	onDestroy(() => clearTimeout(searchTimer));

	const currentTask = $derived(filters.task ?? "all");
	const currentType = $derived(filters.type ?? "all");
	const currentStatus = $derived(filters.status ?? "all");
	let currentSubcategory = $derived<TaskSubcategory<TaskCategory> | "all">(
		filters.subcategory ?? "all"
	);

	const activeFilters = $derived.by(() => {
		const chips: { key: "task" | "subcategory" | "type" | "status" | "search"; label: string }[] =
			[];
		if (filters.task) chips.push({ key: "task", label: `Task ${filters.task}` });
		if (filters.subcategory) {
			chips.push({ key: "subcategory", label: getTaskSubcategoryLabel(filters.subcategory) });
		}
		if (filters.type) {
			chips.push({ key: "type", label: filters.type === "timed" ? "Timed" : "Unlimited time" });
		}
		if (filters.status) {
			chips.push({
				key: "status",
				label: filters.status === "evaluated" ? "Evaluated" : "Not evaluated"
			});
		}
		if (filters.q) chips.push({ key: "search", label: `"${filters.q}"` });
		return chips;
	});

	function update(overrides: Partial<Record<FilterKey, string>>) {
		goto(historyHref + buildHref(filters, 1, { page: "1", ...overrides }), { reset: false });
	}

	function onSearchInput(value: string) {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			const next = value.trim();
			if (next !== filters.q) update({ q: next });
		}, 300);
	}

	function clearSearch() {
		clearTimeout(searchTimer);
		update({ q: "" });
	}

	function removeFilter(key: "task" | "subcategory" | "type" | "status" | "search") {
		if (key === "search") update({ q: "" });
		else if (key === "task") update({ task: "all" });
		else if (key === "subcategory") update({ subcategory: "all" });
		else if (key === "type") update({ type: "all" });
		else if (key === "status") update({ status: "all" });
	}
</script>

<section
	class={[
		"mt-4 rounded-box border border-base-content/20 bg-base-100 p-3.5",
		"hover:border-primary"
	]}
	aria-label="Filters">
	<div class="flex flex-col gap-2.5 lg:flex-row lg:justify-between">
		<label class="input w-full input-sm lg:max-w-sm">
			<Search class="size-4 opacity-60" />
			<input
				type="search"
				placeholder="Search by name, type or prompt..."
				value={filters.q}
				oninput={(event) => onSearchInput(event.currentTarget.value)} />
			{#if filters.q}
				<button
					class="cursor-pointer"
					type="button"
					aria-label="Clear search"
					onclick={clearSearch}>
					<X class="size-4 opacity-60" />
				</button>
			{/if}
		</label>

		<label
			class="flex shrink-0 cursor-pointer gap-2 py-1.5 text-xs text-base-content/75"
			title="Also search inside your essay text">
			<input
				type="checkbox"
				class="toggle toggle-primary toggle-sm"
				checked={filters.body}
				onchange={(event) => update({ body: event.currentTarget.checked ? "1" : "0" })} />
			<span>Search in essays</span>
		</label>

		<div class="flex flex-1 flex-wrap items-center gap-2">
			<!-- Task Category -->
			<div class="join" role="group" aria-label="Filter by task">
				{#each [{ v: "all", l: "All tasks" }, { v: "1", l: "Task 1" }, { v: "2", l: "Task 2" }] as option (option.v)}
					<button
						class="btn join-item btn-sm"
						class:btn-active={currentTask === option.v}
						aria-pressed={currentTask === option.v}
						onclick={() => update({ task: option.v, subcategory: "all" })}>
						{option.l}
					</button>
				{/each}
			</div>

			<!-- Task Subcategory -->
			<select
				class="select max-w-52 select-sm"
				aria-label="Filter by subcategory"
				bind:value={currentSubcategory}
				onchange={() => update({ subcategory: currentSubcategory })}>
				<option value="all">All subcategories</option>
				{#each availableSubcategories as subcategory (subcategory)}
					<option value={subcategory}>{getTaskSubcategoryLabel(subcategory)}</option>
				{/each}
			</select>

			<!-- Evaluation status -->
			<div class="join" role="group" aria-label="Filter by evaluation status">
				{#each [{ v: "all", l: "Any status" }, { v: "evaluated", l: "Evaluated" }, { v: "unevaluated", l: "Not evaluated" }] as option (option.v)}
					<button
						class="btn join-item btn-sm"
						class:btn-active={currentStatus === option.v}
						aria-pressed={currentStatus === option.v}
						onclick={() => update({ status: option.v })}>
						{option.l}
					</button>
				{/each}
			</div>

			<!-- Practice type -->
			<div class="join" role="group" aria-label="Filter by practice type">
				{#each [{ v: "all", l: "Any type" }, { v: "timed", l: "Timed" }, { v: "free", l: "Unlimited" }] as option (option.v)}
					<button
						class="btn join-item btn-sm"
						class:btn-active={currentType === option.v}
						aria-pressed={currentType === option.v}
						onclick={() => update({ type: option.v })}>
						{option.l}
					</button>
				{/each}
			</div>

			<!-- Sort -->
			<div class="flex flex-1 flex-wrap items-center justify-end gap-2">
				<select
					class="select select-sm"
					aria-label="Sort sessions"
					value={filters.sort}
					onchange={(event) => update({ sort: event.currentTarget.value })}>
					<option value="recent">Newest first</option>
					<option value="oldest">Oldest first</option>
					<option value="band">Highest band</option>
					<option value="words">Most words</option>
				</select>
			</div>
		</div>
	</div>

	<div
		class="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-base-content/10 pt-2.5">
		<p class="text-xs text-base-content/75">
			Showing <span class="font-semibold text-base-content">{resultCount}</span>
			of {total}
			sessions
		</p>
	</div>

	{#if activeFilters.length > 0}
		<div class="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-base-content/10 pt-2.5">
			<span class="text-xs text-base-content/75">Active filters:</span>
			{#each activeFilters as filter (filter.key)}
				<button
					class="badge cursor-pointer gap-1 badge-soft badge-sm hover:bg-primary hover:text-primary-content"
					title="Remove filter"
					onclick={() => removeFilter(filter.key)}>
					{filter.label}
					<X class="size-3" />
				</button>
			{/each}
			<button class="btn btn-ghost btn-xs" onclick={() => goto(historyHref, { reset: false })}>
				Clear all
			</button>
		</div>
	{/if}
</section>
