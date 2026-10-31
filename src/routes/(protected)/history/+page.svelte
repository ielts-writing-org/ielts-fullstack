<script lang="ts">
	import { onDestroy, type Component } from "svelte";
	import { goto, refreshAll } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import {
		ArrowRight,
		CalendarDays,
		Check,
		CircleCheck,
		Clock3,
		Copy,
		Download,
		EllipsisVertical,
		FileText,
		MessageSquare,
		PenLine,
		PieChart,
		RotateCcwClock,
		Search,
		Trash,
		TrendingUp,
		TriangleAlert,
		X
	} from "@lucide/svelte";
	import { openModal } from "#lib/components/Modal.svelte";
	import { roundToNearestHalf } from "#lib/utils/math.ts";
	import { timeLimitMinutesFor } from "#lib/utils/ielts.js";
	import { CRITERIA_MAP } from "#lib/mappings/criteria.js";
	import { taskSubcategoryLabel } from "#lib/mappings/task-subcategory.ts";
	import { deletePracticeSession } from "../../delete-practice-session.remote";
	import { changeSessionName } from "../../change-session-name.remote";
	import { formatRelativeTime } from "#lib/utils/time.js";

	const { data } = $props();

	const filters = $derived(data.filters);
	const currentPage = $derived(data.pagination.page);
	const totalPages = $derived(data.pagination.totalPages);
	const availableSubcategories = $derived(data.availableSubcategories);
	const stats = $derived(data.stats);
	const bandTarget = $derived(page.data.profile?.bandTarget ?? 0);

	type FilterKey = "q" | "task" | "subcategory" | "type" | "status" | "body" | "sort" | "page";

	/** Builds a query string for the current filter state with optional overrides. */
	function href(overrides: Partial<Record<FilterKey, string>>) {
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
		return query ? `?${query}` : "?";
	}

	/** Applies a filter change and resets to the first page. */
	function update(overrides: Partial<Record<FilterKey, string>>) {
		goto(href({ page: "1", ...overrides }), { reset: false });
	}

	function goToPage(next: number) {
		goto(href({ page: String(next) }), { reset: false });
	}

	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	onDestroy(() => clearTimeout(searchTimer));

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

	const currentTask = $derived(filters.task ?? "all");
	const currentType = $derived(filters.type ?? "all");
	const currentStatus = $derived(filters.status ?? "all");
	const currentSubcategory = $derived(filters.subcategory ?? "all");

	const paged = $derived(
		data.practiceSessions.map((session) => ({
			...session,
			rings: (Object.keys(CRITERIA_MAP) as (keyof typeof CRITERIA_MAP)[]).flatMap((key) => {
				const band = session.criteria?.[key];
				return band === undefined ? [] : [{ key, label: CRITERIA_MAP[key], band }];
			})
		}))
	);

	const activeFilters = $derived.by(() => {
		const chips: { key: "task" | "subcategory" | "type" | "status" | "search"; label: string }[] =
			[];
		if (filters.task) chips.push({ key: "task", label: `Task ${filters.task}` });
		if (filters.subcategory) {
			chips.push({ key: "subcategory", label: taskSubcategoryLabel(filters.subcategory) });
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

	const hasFilters = $derived(activeFilters.length > 0);

	function removeFilter(key: "task" | "subcategory" | "type" | "status" | "search") {
		if (key === "search") update({ q: "" });
		else if (key === "task") update({ task: "all" });
		else if (key === "subcategory") update({ subcategory: "all" });
		else if (key === "type") update({ type: "all" });
		else if (key === "status") update({ status: "all" });
	}

	function clearFilters() {
		goto(resolve("/(protected)/history"), { reset: false });
	}

	const bandTone = (band: number) =>
		band >= 7.5 ? "text-success" : band >= 5.5 ? "text-warning" : "text-error";

	const practiceHref = (id: string) =>
		resolve("/(protected)/practice/[practiceSessionId=practiceSessionId]", {
			practiceSessionId: id
		});

	const minWords = (category: "1" | "2") => (category === "1" ? 150 : 250);

	/**
	 * Page numbers to render, `null` marking an ellipsis gap. Keeps long page
	 * lists to the edges plus a window around the current page.
	 */
	function pageWindow(current: number, total: number): (number | null)[] {
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

	/** Percent positions (0-100) for the trend chart dots and line. */
	const trendPoints = $derived.by(() => {
		const trend = data.trend;
		if (trend.length === 0) {
			return [];
		}

		const stepX = trend.length > 1 ? 94 / (trend.length - 1) : 0;
		return trend.map((point, i) => ({
			x: 3 + i * stepX,
			y: 94 - (Math.max(0, Math.min(9, point.band)) / 9) * 88,
			band: point.band,
			date: point.date
		}));
	});

	const trendLinePath = $derived(
		trendPoints
			.map((point, i) => `${i === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
			.join(" ")
	);

	const trendAreaPath = $derived(
		trendPoints.length > 1
			? `${trendLinePath} L${trendPoints[trendPoints.length - 1].x.toFixed(2)} 94 L${trendPoints[0].x.toFixed(2)} 94 Z`
			: ""
	);

	let renameSessionId = $state<string | null>(null);
	let renameValue = $state("");

	function handleRename(session: (typeof data.practiceSessions)[number]) {
		renameSessionId = session.id;
		renameValue = session.name;
		openModal({
			title: "Rename practice session",
			content: { snippet: renameSnippet },
			primaryButton: {
				text: "Save",
				color: "primary",
				onclick: async () => {
					const name = renameValue.trim();
					if (!name || !renameSessionId) {
						return;
					}

					await changeSessionName({ practiceSessionId: renameSessionId, newName: name });
					await refreshAll();
				}
			},
			secondaryButton: { text: "Cancel", color: "error", style: "ghost" }
		});
	}

	function handleDelete(session: (typeof data.practiceSessions)[number]) {
		openModal({
			title: { text: "Delete practice session", color: "error" },
			content: `"${session.name}" and its evaluation will be permanently removed. This cannot be undone.`,
			primaryButton: {
				text: "Delete",
				color: "error",
				style: "ghost",
				onclick: async () => {
					await deletePracticeSession({ practiceSessionId: session.id });
					await refreshAll();
				}
			},
			secondaryButton: { text: "Cancel", color: "primary" }
		});
	}

	let copiedSessionId = $state<string | null>(null);

	/** Turns a session name into a safe download filename. */
	function sanitizeFilename(name: string): string {
		const cleaned = name
			.replace(/[^\w\s-]/g, "")
			.trim()
			.replace(/\s+/g, "-");
		return cleaned || "practice-session";
	}

	async function handleCopyEssay(session: (typeof data.practiceSessions)[number]) {
		try {
			await navigator.clipboard.writeText(session.response);
			copiedSessionId = session.id;
			setTimeout(() => {
				if (copiedSessionId === session.id) {
					copiedSessionId = null;
				}
			}, 1500);
		} catch {
			openModal({
				title: "Copy failed",
				content: "Your browser blocked clipboard access. Use Download .txt instead.",
				primaryButton: "Close"
			});
		}
	}

	function handleDownloadEssay(session: (typeof data.practiceSessions)[number]) {
		const blob = new Blob([session.response], { type: "text/plain;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = `${sanitizeFilename(session.name)}.txt`;
		anchor.click();
		URL.revokeObjectURL(url);
	}
</script>

<svelte:head>
	<title>Practice History | IELTS Writing Practice Platform</title>
	<meta name="description" content="Review all your past IELTS Writing practice sessions." />
</svelte:head>

<main id="main-content" class="w-full flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-9">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div class="min-w-0">
			<div class="flex items-center gap-2">
				<RotateCcwClock class="size-5 shrink-0 text-primary" />
				<h1 class="font-bold sm:text-lg">Practice History</h1>
			</div>
			<p class="mt-0.5 text-xs text-base-content/75">
				Review everything you have written and track how your band score changes over time.
			</p>
		</div>
		<a class="btn btn-primary btn-sm sm:shrink-0" href={resolve("/(protected)")}>
			<PenLine size="1em" />
			Start new practice
		</a>
	</div>

	{#if trendPoints.length > 1}
		<section
			class="mt-4 rounded-box border border-base-content/20 bg-base-100 p-3.5"
			aria-label="Progress over time">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<div class="flex items-center gap-2">
					<TrendingUp class="size-4 shrink-0 text-primary" />
					<h2 class="text-sm font-semibold">Progress over time</h2>
				</div>
				<span class="text-xs text-base-content/75">
					Estimated band of your last {data.trend.length} evaluated sessions
				</span>
			</div>

			<div class="relative mt-3 h-40">
				<span class="absolute top-0 right-0 text-[10px] text-base-content/50 tabular-nums">
					9
				</span>
				<span
					class="absolute right-0 bottom-0 text-[10px] text-base-content/50 tabular-nums">
					0
				</span>

				{#if bandTarget > 0}
					<div
						class="absolute inset-x-0 flex items-center"
						style:top={`${(94 - (Math.min(9, bandTarget) / 9) * 88).toFixed(2)}%`}>
						<span class="h-px flex-1 border-t border-dashed border-warning"></span>
						<span class="ms-1 text-[10px] font-semibold whitespace-nowrap text-warning">
							Target {bandTarget}
						</span>
					</div>
				{/if}

				<svg
					class="absolute inset-0 h-full w-full text-primary"
					viewBox="0 0 100 100"
					preserveAspectRatio="none"
					role="img"
					aria-label="Line chart of estimated band scores across your last {data.trend.length} evaluated sessions">
					{#if trendAreaPath}
						<path d={trendAreaPath} class="fill-primary/10" stroke="none" />
					{/if}
					<path
						d={trendLinePath}
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						vector-effect="non-scaling-stroke" />
				</svg>

				{#each trendPoints as point, i (i)}
					<span
						class="tooltip tooltip-top absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-base-100 bg-primary"
						data-tip={`Band ${point.band.toFixed(1)} · ${point.date.toLocaleDateString()}`}
						style:left={`${point.x.toFixed(2)}%`}
						style:top={`${point.y.toFixed(2)}%`}>
					</span>
				{/each}
			</div>
		</section>
	{/if}

	<section class="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Practice summary">
		{@render statTile({
			icon: FileText,
			label: "Total sessions",
			value: String(stats.total),
			hint: "All time"
		})}
		{@render statTile({
			icon: CircleCheck,
			label: "Evaluated",
			value: String(stats.evaluated),
			hint: `${stats.total - stats.evaluated} awaiting evaluation`
		})}
		{@render bandStatTile({
			icon: PieChart,
			label: "Task 1 bands",
			evaluated: stats.task1.evaluated,
			average: stats.task1.average,
			best: stats.task1.best
		})}
		{@render bandStatTile({
			icon: PenLine,
			label: "Task 2 bands",
			evaluated: stats.task2.evaluated,
			average: stats.task2.average,
			best: stats.task2.best
		})}
	</section>

	<section
		class="mt-4 rounded-box border border-base-content/20 bg-base-100 p-3.5"
		aria-label="Filters">
		<div class="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
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
				class="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-base-content/75"
				title="Also search inside your essay text">
				<input
					type="checkbox"
					class="toggle toggle-primary toggle-sm"
					checked={filters.body}
					onchange={(event) =>
						update({ body: event.currentTarget.checked ? "1" : "0" })} />
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
					value={currentSubcategory}
					onchange={(event) => update({ subcategory: event.currentTarget.value })}>
					<option value="all">All subcategories</option>
					{#each availableSubcategories as subcategory (subcategory)}
						<option value={subcategory}>{taskSubcategoryLabel(subcategory)}</option>
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
			</div>
		</div>

		<div
			class="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-base-content/10 pt-2.5">
			<p class="text-xs text-base-content/75">
				Showing <span class="font-semibold text-base-content">{paged.length}</span>
				of {data.pagination.total}
				sessions
			</p>

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

		{#if activeFilters.length > 0}
			<div
				class="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-base-content/10 pt-2.5">
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
				<button class="btn btn-ghost btn-xs" onclick={clearFilters}>Clear all</button>
			</div>
		{/if}
	</section>

	<section class="mt-4 flex flex-col gap-2.5" aria-label="Practice sessions">
		{#if data.pagination.total === 0 && hasFilters}
			<div
				class="flex flex-col items-center justify-center gap-2 rounded-box border border-dashed border-base-content/20 py-16 text-base-content/75">
				<RotateCcwClock size="2.5em" />
				<p class="font-semibold">No practice sessions match your filters</p>
				<p class="text-xs">Try a different search term or clear the filters.</p>
				<button class="btn mt-2 btn-outline btn-primary btn-sm" onclick={clearFilters}>
					Clear filters
				</button>
			</div>
		{:else if data.pagination.total === 0}
			<div
				class="flex flex-col items-center justify-center gap-2 rounded-box border border-dashed border-base-content/20 py-16 text-base-content/75">
				<RotateCcwClock size="2.5em" />
				<p class="font-semibold">No practice sessions yet</p>
				<p class="text-xs">Start a Task 1 or Task 2 practice and it will show up here.</p>
				<a class="btn mt-2 btn-primary btn-sm" href={resolve("/(protected)")}>
					Start new practice
					<ArrowRight size="1em" />
				</a>
			</div>
		{:else}
			{#each paged as session (session.id)}
				<article
					class="rounded-box border border-base-content/20 bg-base-100 p-3.5 hover:border-primary">
					<div class="flex flex-col gap-3 lg:flex-row lg:items-center">
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-1.5">
								<span class="badge rounded-box badge-soft badge-xs font-semibold badge-primary">
									Task {session.taskCategory}
								</span>
								{#if session.taskSubcategory}
									<span class="badge badge-soft badge-xs">
										{taskSubcategoryLabel(session.taskSubcategory)}
									</span>
								{/if}
								{#if session.estimatedBand}
									<span class="badge badge-soft badge-xs badge-success">Evaluated</span>
								{:else}
									<span class="badge badge-soft badge-xs badge-info">Not evaluated</span>
								{/if}
							</div>

							<h3 class="mt-1.5 truncate font-semibold">{session.name}</h3>
							<p class="mt-0.5 truncate text-xs text-base-content/75">{session.taskPrompt}</p>

							<div
								class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/75">
								<span class="flex items-center gap-1">
									<CalendarDays size="1em" />
									<time
										datetime={session.updatedAt.toISOString()}
										title={session.updatedAt.toLocaleString()}>
										{formatRelativeTime(session.updatedAt)}
									</time>
								</span>
								<span class="flex items-center gap-1">
									<Clock3 size="1em" />
									{session.type === "timed"
										? `${timeLimitMinutesFor(session.taskCategory)} min limit`
										: "Unlimited time"}
								</span>
								<span
									class="tooltip tooltip-top"
									data-tip={session.words >= minWords(session.taskCategory)
										? `Meets the ${minWords(session.taskCategory)}-word minimum`
										: `Below the ${minWords(session.taskCategory)}-word minimum`}>
									<span class="flex items-center gap-1">
										<FileText size="1em" />
										<span
											class={session.words < minWords(session.taskCategory)
												? "text-warning"
												: undefined}>
											{session.words} words
										</span>
										{#if session.words >= minWords(session.taskCategory)}
											<Check class="size-3 text-success" />
										{:else}
											<TriangleAlert class="size-3 text-warning" />
										{/if}
									</span>
								</span>
								<span class="flex items-center gap-1">
									<MessageSquare size="1em" />
									{session.messages} messages
								</span>
							</div>
						</div>

						<div class="flex items-center justify-between gap-3 lg:shrink-0 lg:justify-end">
							{#if session.estimatedBand !== undefined && session.criteria}
								<div class="flex items-center gap-3">
									<div class="flex flex-col items-center">
										<div
											class={["radial-progress font-semibold", bandTone(session.estimatedBand)]}
											style:--value={(session.estimatedBand / 9) * 100}
											style:--size="3.25em"
											role="progressbar"
											aria-label="Overall band"
											aria-valuenow={session.estimatedBand}
											aria-valuemin={0}
											aria-valuemax={9}>
											{session.estimatedBand.toFixed(1)}
										</div>
										<span class="mt-0.5 text-xs text-base-content/75">Overall</span>
									</div>

									<div class="hidden items-center gap-1.5 sm:flex">
										{#each session.rings as ring (ring.key)}
											<div class="tooltip tooltip-top" data-tip={`${ring.label}: ${ring.band}`}>
												<div
													class={["radial-progress text-xs", bandTone(ring.band)]}
													style:--value={(ring.band / 9) * 100}
													style:--size="2.25em"
													role="progressbar"
													aria-label={ring.label}
													aria-valuenow={ring.band}
													aria-valuemin={0}
													aria-valuemax={9}>
													{ring.band}
												</div>
											</div>
										{/each}
									</div>
								</div>
							{:else}
								<span class="badge badge-ghost badge-sm whitespace-nowrap">No evaluation yet</span>
							{/if}

							<a
								class="btn shrink-0 btn-outline btn-primary btn-sm"
								href={practiceHref(session.id)}>
								{session.estimatedBand ? "Review" : "Continue"}
								<ArrowRight size="1em" />
							</a>

							<div class="dropdown dropdown-end">
								<button
									class="btn btn-circle btn-ghost btn-sm"
									aria-label="Session actions"
									aria-haspopup="menu">
									<EllipsisVertical class="size-4" />
								</button>
							<ul class="menu dropdown-content z-1 w-44 rounded-box bg-base-100 p-1.5 shadow-sm">
								<li>
									<button onclick={() => handleCopyEssay(session)}>
										{copiedSessionId === session.id ? "Copied!" : "Copy essay"}
										<Copy size="1em" />
									</button>
								</li>
								<li>
									<button onclick={() => handleDownloadEssay(session)}>
										Download .txt
										<Download size="1em" />
									</button>
								</li>
								<li class="mt-1 border-t border-base-content/10 pt-1">
									<button onclick={() => handleRename(session)}>
										Rename
										<PenLine size="1em" />
									</button>
								</li>
								<li>
									<button class="text-error" onclick={() => handleDelete(session)}>
										Delete
										<Trash size="1em" />
									</button>
								</li>
							</ul>
							</div>
						</div>
					</div>
				</article>
			{/each}
		{/if}
	</section>

	{#if data.pagination.total > 0}
		<nav
			class="mt-4 flex flex-wrap items-center justify-between gap-2"
			aria-label="Practice history pagination">
			<span class="text-xs text-base-content/75">
				Page {currentPage} of {totalPages}
			</span>

			<div class="join">
				<button
					class="btn join-item btn-sm"
					disabled={currentPage === 1}
					aria-label="Previous page"
					onclick={() => goToPage(currentPage - 1)}>
					Prev
				</button>
				{#each pageWindow(currentPage, totalPages) as pageNumber, i (i)}
					{#if pageNumber === null}
						<span class="join-item btn btn-sm btn-disabled border-base-content/20 bg-base-100"
							>…</span
						>
					{:else}
						<button
							class="btn join-item btn-sm"
							class:btn-active={currentPage === pageNumber}
							aria-current={currentPage === pageNumber ? "page" : undefined}
							onclick={() => goToPage(pageNumber)}>
							{pageNumber}
						</button>
					{/if}
				{/each}
				<button
					class="btn join-item btn-sm"
					disabled={currentPage === totalPages}
					aria-label="Next page"
					onclick={() => goToPage(currentPage + 1)}>
					Next
				</button>
			</div>
		</nav>
	{/if}
</main>

{#snippet statTile(props: {
	icon: Component;
	label: string;
	value: string;
	hint?: string;
})}
	<div class="flex flex-col rounded-box border border-base-content/20 bg-base-100 p-3.5 hover:border-primary">
		<div class="flex flex-1 items-center justify-between gap-2">
			<span class="text-xs font-semibold text-base-content/75">{props.label}</span>
			<props.icon class="size-4 shrink-0 opacity-60" />
		</div>
		<div class="mt-1.5 text-2xl font-bold">{props.value}</div>
		{#if props.hint}
			<p class="text-xs text-base-content/75">{props.hint}</p>
		{/if}
	</div>
{/snippet}

{#snippet bandStatTile(props: {
	icon: Component;
	label: string;
	evaluated: number;
	average: number;
	best: number;
})}
	<div class="flex flex-col rounded-box border border-base-content/20 bg-base-100 p-3.5 hover:border-primary">
		<div class="flex flex-1 items-center justify-between gap-2">
			<span class="text-xs font-semibold text-base-content/75">{props.label}</span>
			<props.icon class="size-4 shrink-0 opacity-60" />
		</div>
		<div class="mt-1.5 text-2xl font-bold">
			{#if props.evaluated > 0}
				<span class={bandTone(props.best)}>{props.best.toFixed(1)}</span>
			{:else}
				–
			{/if}
		</div>
		<p class="text-xs text-base-content/75">
			{#if props.evaluated > 0}
				Average {roundToNearestHalf(props.average).toFixed(1)} · {props.evaluated}
				{props.evaluated === 1 ? "session" : "sessions"}
			{:else}
				No evaluated sessions yet
			{/if}
		</p>
	</div>
{/snippet}

{#snippet renameSnippet()}
	<p class="mb-3 text-xs text-base-content/75">Enter a new name for this practice session.</p>
	<input
		class="input w-full"
		bind:value={renameValue}
		maxlength={64}
		placeholder="Practice session name"
		aria-label="New session name" />
{/snippet}
