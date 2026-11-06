<script lang="ts">
	import { onDestroy } from "svelte";
	import { goto } from "$app/navigation";
	import { Search, X } from "@lucide/svelte";
	import { getTaskSubcategories, taskSubcategoryLabel } from "#lib/domain/task-subcategory.ts";
	import { buildQuery, tasksHref, type FilterKey, type TaskFiltersData } from "./links.ts";

	type Props = { filters: TaskFiltersData; resultCount: number; total: number };
	let { filters, resultCount, total }: Props = $props();

	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	onDestroy(() => clearTimeout(searchTimer));

	const currentTask = $derived(filters.task ?? "all");
	const currentSource = $derived(filters.source ?? "all");
	const currentSubcategory = $derived(filters.subcategory ?? "all");

	const activeFilters = $derived.by(() => {
		const chips: {
			key: "task" | "subcategory" | "source" | "search";
			label: string;
		}[] = [];
		if (filters.source) {
			chips.push({ key: "source", label: filters.source === "mine" ? "My tasks" : "Examples" });
		}
		if (filters.task) chips.push({ key: "task", label: `Task ${filters.task}` });
		if (filters.subcategory) {
			chips.push({ key: "subcategory", label: taskSubcategoryLabel(filters.subcategory) });
		}
		if (filters.q) chips.push({ key: "search", label: `"${filters.q}"` });
		return chips;
	});

	function update(overrides: Partial<Record<FilterKey, string>>) {
		goto(tasksHref + buildQuery(filters, 1, { page: "1", ...overrides }), { reset: false });
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

	function removeFilter(key: "task" | "subcategory" | "source" | "search") {
		if (key === "search") update({ q: "" });
		else if (key === "task") update({ task: "all", subcategory: "all" });
		else if (key === "subcategory") update({ subcategory: "all" });
		else if (key === "source") update({ source: "all" });
	}
</script>

<section
	class={["mt-4 rounded-box border border-base-content/20 bg-base-100 p-3", "hover:border-primary"]}
	aria-label="Filters">
	<div class="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
		<label class="input w-full input-sm lg:max-w-sm">
			<Search class="size-4 opacity-60" />
			<input
				type="search"
				placeholder="Search by prompt or subcategory..."
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

		<div class="flex flex-1 flex-wrap items-center gap-2">
			<!-- Task source -->
			<div class="join" role="group" aria-label="Filter by source">
				{#each [{ v: "all", l: "All" }, { v: "mine", l: "My tasks" }, { v: "example", l: "Examples" }] as option (option.v)}
					<button
						class="btn join-item btn-sm"
						class:btn-active={currentSource === option.v}
						aria-pressed={currentSource === option.v}
						onclick={() => update({ source: option.v })}>
						{option.l}
					</button>
				{/each}
			</div>

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
				value={currentSubcategory}
				onchange={(event) => update({ subcategory: event.currentTarget.value })}>
				<option value="all">All subcategories</option>
				{#if currentTask !== "all"}
					{#each getTaskSubcategories(currentTask) as subcategory (subcategory)}
						<option value={subcategory}>{taskSubcategoryLabel(subcategory)}</option>
					{/each}
				{:else}
					<optgroup label="Task 1">
						{#each getTaskSubcategories("1") as subcategory (subcategory)}
							<option value={subcategory}>{taskSubcategoryLabel(subcategory)}</option>
						{/each}
					</optgroup>
					<optgroup label="Task 2">
						{#each getTaskSubcategories("2") as subcategory (subcategory)}
							<option value={subcategory}>{taskSubcategoryLabel(subcategory)}</option>
						{/each}
					</optgroup>
				{/if}
			</select>

			<!-- Sort -->
			<select
				class="select select-sm"
				aria-label="Sort tasks"
				value={filters.sort}
				onchange={(event) => update({ sort: event.currentTarget.value })}>
				<option value="recent">Newest first</option>
				<option value="oldest">Oldest first</option>
				<option value="practiced">Most recently practiced</option>
				<option value="name">Prompt A–Z</option>
			</select>
		</div>
	</div>

	<div
		class="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-base-content/10 pt-2.5">
		<p class="text-xs text-base-content/75">
			Showing <span class="font-semibold text-base-content">{resultCount}</span>
			of {total}
			tasks
		</p>

		{#if activeFilters.length > 0}
			<div class="flex flex-1 flex-wrap items-center justify-end gap-1.5">
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
				<button class="btn btn-ghost btn-xs" onclick={() => goto(tasksHref, { reset: false })}>
					Clear all
				</button>
			</div>
		{/if}
	</div>
</section>
