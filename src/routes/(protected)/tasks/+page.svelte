<script lang="ts">
	import { onDestroy, type Component } from "svelte";
	import { goto, refreshAll } from "$app/navigation";
	import { resolve } from "$app/paths";
	import {
		AlarmClock,
		AlarmClockOff,
		ArrowRight,
		CalendarDays,
		CircleDashed,
		EllipsisVertical,
		FileText,
		LibraryBig,
		PenLine,
		PieChart,
		Plus,
		Search,
		Trash,
		TriangleAlert,
		X
	} from "@lucide/svelte";
	import { closeModal, openModal } from "#lib/components/Modal.svelte";
	import {
		TASK_SUBCATEGORIES_BY_CATEGORY,
		taskSubcategoryLabel
	} from "#lib/mappings/task-subcategory.ts";
	import { bandBadgeTone } from "#lib/utils/ielts.js";
	import { formatRelativeTime } from "#lib/utils/time.js";
	import { createPractice } from "../create-practice.remote";
	import { clearTaskImage } from "../practice/[practiceSessionId=practiceSessionId]/clear-task-image.remote";
	import { createTask } from "./create-task.remote";
	import { deleteTask } from "./delete-task.remote";
	import { getTaskDependants } from "./get-task-dependants.remote";
	import { updateTask } from "./update-task.remote";

	const { data } = $props();

	type TaskItem = (typeof data.tasks)[number];
	type DependantSession = Awaited<ReturnType<typeof getTaskDependants>>["sessions"][number];

	const filters = $derived(data.filters);
	const currentPage = $derived(data.pagination.page);
	const totalPages = $derived(data.pagination.totalPages);

	const CONFIRM_PHRASE = "DELETE";

	type FilterKey = "q" | "task" | "subcategory" | "sort" | "page";

	/** Builds a query string for the current filter state with optional overrides. */
	function href(overrides: Partial<Record<FilterKey, string>>) {
		const state: Record<FilterKey, string> = {
			q: filters.q,
			task: filters.task ?? "all",
			subcategory: filters.subcategory ?? "all",
			sort: filters.sort,
			page: String(currentPage),
			...overrides
		};

		const params = new URLSearchParams();
		if (state.q) params.set("q", state.q);
		if (state.task !== "all") params.set("task", state.task);
		if (state.subcategory !== "all") params.set("subcategory", state.subcategory);
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
	onDestroy(() => {
		clearTimeout(searchTimer);
		revokePreviewUrls();
	});

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
	const currentSubcategory = $derived(filters.subcategory ?? "all");

	const activeFilters = $derived.by(() => {
		const chips: { key: "task" | "subcategory" | "search"; label: string }[] = [];
		if (filters.task) chips.push({ key: "task", label: `Task ${filters.task}` });
		if (filters.subcategory) {
			chips.push({ key: "subcategory", label: taskSubcategoryLabel(filters.subcategory) });
		}
		if (filters.q) chips.push({ key: "search", label: `"${filters.q}"` });
		return chips;
	});

	const hasFilters = $derived(activeFilters.length > 0);

	function removeFilter(key: "task" | "subcategory" | "search") {
		if (key === "search") update({ q: "" });
		else if (key === "task") update({ task: "all", subcategory: "all" });
		else if (key === "subcategory") update({ subcategory: "all" });
	}

	function clearFilters() {
		goto(resolve("/(protected)/tasks"), { reset: false });
	}

	const imageHref = (taskId: string) =>
		resolve("/(protected)/tasks/[taskId=taskId]/image", { taskId });

	const practiceHref = (id: string) =>
		resolve("/(protected)/practice/[practiceSessionId=practiceSessionId]", { practiceSessionId: id });

	/******************************************************************************
	 *                                  Practice                                  *
	 ******************************************************************************/
	let selectedPracticeSessionType = $state<"timed" | "free">("timed");

	function openPracticeModal(task: TaskItem) {
		selectedPracticeSessionType = "timed";
		openModal({
			title: "Start a practice session",
			content: { snippet: practiceModeSnippet, args: { task } },
			primaryButton: {
				text: "Start practice",
				color: "primary",
				onclick: async () => {
					const result = await createPractice({
						taskCategory: task.category,
						taskId: task.id,
						practiceSessionType: selectedPracticeSessionType
					});
					if (result.success) {
						goto(result.location);
					}
				}
			},
			secondaryButton: {
				text: "Cancel",
				color: "error",
				style: "ghost"
			}
		});
	}

	/******************************************************************************
	 *                                  Details                                   *
	 ******************************************************************************/
	function openDetailsModal(task: TaskItem) {
		openModal({
			title: { text: `Task ${task.category} details`, color: "primary" },
			content: { snippet: detailsSnippet, args: { task } },
			primaryButton: {
				text: "Practice",
				color: "primary",
				explicitClose: true,
				onclick: async () => {
					await closeModal();
					openPracticeModal(task);
				}
			},
			secondaryButton: {
				text: "Edit",
				style: "outline",
				explicitClose: true,
				onclick: async () => {
					await closeModal();
					openEditModal(task);
				}
			}
		});
	}

	/******************************************************************************
	 *                                   Create                                   *
	 ******************************************************************************/
	let createCategory = $state<"1" | "2">("1");
	let createSubcategory = $state("");
	let createPrompt = $state("");
	let createFiles = $state<FileList | null>(null);
	let createPreviewUrl = $state<string | undefined>(undefined);
	let createError = $state<string | null>(null);
	let createKey = $state(0);

	const createForm = createTask.enhance(async (form) => {
		if (await form.submit()) {
			await closeModal();
			await refreshAll();
		} else {
			createError =
				form.fields.allIssues()?.[0]?.message ?? "Please review the highlighted fields.";
		}
	});

	const createSubcategoryOptions = $derived(TASK_SUBCATEGORIES_BY_CATEGORY[createCategory]);

	function handleCreateImageChange(event: Event) {
		replacePreviewUrl(event.currentTarget as HTMLInputElement, (url) => (createPreviewUrl = url));
	}

	function openCreateModal() {
		createCategory = "1";
		createSubcategory = "";
		createPrompt = "";
		createFiles = null;
		createError = null;
		replacePreviewUrl(null, (url) => (createPreviewUrl = url));
		createKey++;
		openModal({
			title: "New task",
			content: { snippet: createFormSnippet }
		});
	}

	/******************************************************************************
	 *                                    Edit                                    *
	 ******************************************************************************/
	let editTask = $state<TaskItem>();
	let editSubcategory = $state("");
	let editPrompt = $state("");
	let editFiles = $state<FileList | null>(null);
	let editPreviewUrl = $state<string | undefined>(undefined);
	let editError = $state<string | null>(null);
	let editKey = $state(0);

	const editForm = updateTask.enhance(async (form) => {
		if (await form.submit()) {
			await closeModal();
			await refreshAll();
		} else {
			editError = form.fields.allIssues()?.[0]?.message ?? "Please review the highlighted fields.";
		}
	});

	const editSubcategoryOptions = $derived(
		editTask ? TASK_SUBCATEGORIES_BY_CATEGORY[editTask.category] : []
	);

	function handleEditImageChange(event: Event) {
		replacePreviewUrl(event.currentTarget as HTMLInputElement, (url) => (editPreviewUrl = url));
	}

	async function handleEditRemoveImage() {
		if (!editTask) return;

		await clearTaskImage({ taskId: editTask.id });
		editTask = { ...editTask, hasImage: false };
		await refreshAll();
	}

	function openEditModal(task: TaskItem) {
		editTask = task;
		editSubcategory = task.subcategory ?? "";
		editPrompt = task.prompt;
		editFiles = null;
		editError = null;
		replacePreviewUrl(null, (url) => (editPreviewUrl = url));
		editKey++;
		openModal({
			title: "Edit task",
			content: { snippet: editFormSnippet }
		});
	}

	function replacePreviewUrl(
		input: HTMLInputElement | null,
		set: (url: string | undefined) => void
	) {
		revokePreviewUrls();
		const file = input?.files?.[0];
		if (file) {
			set(URL.createObjectURL(file));
		}
	}

	function revokePreviewUrls() {
		if (createPreviewUrl) {
			URL.revokeObjectURL(createPreviewUrl);
			createPreviewUrl = undefined;
		}
		if (editPreviewUrl) {
			URL.revokeObjectURL(editPreviewUrl);
			editPreviewUrl = undefined;
		}
	}

	/******************************************************************************
	 *                                   Delete                                   *
	 ******************************************************************************/
	let confirmPhrase = $state("");

	async function handleDelete(task: TaskItem) {
		const dependants = await getTaskDependants(task.id);
		const sessions = dependants.sessions;
		confirmPhrase = "";

		openModal({
			title: { text: "Delete task", color: "error" },
			content: { snippet: deleteSnippet, args: { task, sessions } },
			primaryButton: {
				text: "Delete task",
				color: "error",
				explicitClose: true,
				get disabled() {
					return sessions.length > 0 && confirmPhrase.trim() !== CONFIRM_PHRASE;
				},
				onclick: async () => {
					if (sessions.length > 0 && confirmPhrase.trim() !== CONFIRM_PHRASE) {
						return;
					}

					await deleteTask({ taskId: task.id });
					await refreshAll();
					await closeModal();
				}
			},
			secondaryButton: { text: "Cancel", color: "primary" }
		});
	}
</script>

<svelte:head>
	<title>Task Library | IELTS Writing Practice Platform</title>
	<meta name="description" content="Manage the IELTS Writing tasks you practice with." />
</svelte:head>

<main id="main-content" class="w-full flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-9">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div class="min-w-0">
			<div class="flex items-center gap-2">
				<LibraryBig class="size-5 shrink-0 text-primary" />
				<h1 class="font-bold sm:text-lg">Task Library</h1>
			</div>
			<p class="mt-0.5 text-xs text-base-content/75">
				Your saved prompts. Practice them again, organize them, or clean up the ones you no longer
				need.
			</p>
		</div>
		<button class="btn btn-primary btn-sm sm:shrink-0" onclick={openCreateModal}>
			<Plus size="1em" />
			New task
		</button>
	</div>

	<section class="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Task summary">
		{@render statCard({ icon: FileText, label: "Total tasks", value: String(data.stats.total) })}
		{@render statCard({
			icon: PieChart,
			label: "Task 1",
			value: String(data.stats.task1),
			hint: "Visual reports"
		})}
		{@render statCard({
			icon: PenLine,
			label: "Task 2",
			value: String(data.stats.task2),
			hint: "Essays"
		})}
		{@render statCard({
			icon: CircleDashed,
			label: "Never practiced",
			value: String(data.stats.unused),
			hint: "Tasks without a session yet"
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
						{#each TASK_SUBCATEGORIES_BY_CATEGORY[currentTask as "1" | "2"] as subcategory (subcategory)}
							<option value={subcategory}>{taskSubcategoryLabel(subcategory)}</option>
						{/each}
					{:else}
						<optgroup label="Task 1">
							{#each TASK_SUBCATEGORIES_BY_CATEGORY["1"] as subcategory (subcategory)}
								<option value={subcategory}>{taskSubcategoryLabel(subcategory)}</option>
							{/each}
						</optgroup>
						<optgroup label="Task 2">
							{#each TASK_SUBCATEGORIES_BY_CATEGORY["2"] as subcategory (subcategory)}
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
				Showing <span class="font-semibold text-base-content">{data.tasks.length}</span>
				of {data.pagination.total}
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
					<button class="btn btn-ghost btn-xs" onclick={clearFilters}>Clear all</button>
				</div>
			{/if}
		</div>
	</section>

	<section class="mt-4 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Tasks">
		{#if data.pagination.total === 0 && hasFilters}
			<div
				class="col-span-full flex flex-col items-center justify-center gap-2 rounded-box border border-dashed border-base-content/20 py-16 text-base-content/75">
				<LibraryBig size="2.5em" />
				<p class="font-semibold">No tasks match your filters</p>
				<p class="text-xs">Try a different search term or clear the filters.</p>
				<button class="btn mt-2 btn-outline btn-primary btn-sm" onclick={clearFilters}>
					Clear filters
				</button>
			</div>
		{:else if data.pagination.total === 0}
			<div
				class="col-span-full flex flex-col items-center justify-center gap-2 rounded-box border border-dashed border-base-content/20 py-16 text-base-content/75">
				<LibraryBig size="2.5em" />
				<p class="font-semibold">No tasks yet</p>
				<p class="text-xs">
					Create your first task here, or start a practice from the dashboard and it will be saved
					automatically.
				</p>
				<button class="btn mt-2 btn-primary btn-sm" onclick={openCreateModal}>
					<Plus size="1em" />
					Create your first task
				</button>
			</div>
		{:else}
			{#each data.tasks as task (task.id)}
				<article
					class="flex flex-col rounded-box border border-base-content/20 bg-base-100 hover:border-primary">
					<button
						type="button"
						class="block w-full cursor-pointer bg-base-200/40"
						aria-label="View task details"
						onclick={() => openDetailsModal(task)}>
						<div class="overflow-hidden rounded-t-box border-b border-base-content/10">
							{#if task.hasImage}
								<img
									src={imageHref(task.id)}
									alt="Task visual"
									class="aspect-video w-full object-contain"
									loading="lazy" />
							{:else}
								<div
									class="flex aspect-video w-full items-center justify-center text-base-content/25">
									{#if task.category === "1"}
										<PieChart size="3em" />
									{:else}
										<PenLine size="3em" />
									{/if}
								</div>
							{/if}
						</div>
					</button>

					<div class="flex flex-1 flex-col p-3.5">
						<div class="flex flex-wrap items-center gap-1.5">
							<span class="badge rounded-box badge-soft badge-xs font-semibold badge-primary">
								Task {task.category}
							</span>
							{#if task.subcategory}
								<span class="badge badge-soft badge-xs">{taskSubcategoryLabel(task.subcategory)}</span>
							{/if}
							{#if task.bestBand !== null}
								<span class={["badge badge-soft badge-xs", bandBadgeTone(task.bestBand)]}>
									Best band {task.bestBand.toFixed(1)}
								</span>
							{/if}
							{#if task.sessionCount > 0}
								<span class="badge badge-soft badge-xs">
									{task.sessionCount}
									{task.sessionCount === 1 ? "session" : "sessions"}
								</span>
							{:else}
								<span class="badge badge-soft badge-xs badge-warning">Never practiced</span>
							{/if}
						</div>

						<button
							type="button"
							class="mt-1.5 w-full cursor-pointer text-left"
							aria-label="View task details"
							onclick={() => openDetailsModal(task)}>
							{#if task.prompt}
								<p class="line-clamp-3 text-sm">{task.prompt}</p>
							{:else}
								<p class="line-clamp-3 text-sm text-base-content/50 italic">No prompt yet</p>
							{/if}
						</button>

						<div
							class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/75">
							<span class="flex items-center gap-1">
								<CalendarDays size="1em" />
								Updated
								<time
									datetime={task.updatedAt.toISOString()}
									title={task.updatedAt.toLocaleString()}>
									{formatRelativeTime(task.updatedAt)}
								</time>
							</span>
							{#if task.lastPracticedAt}
								<span class="flex items-center gap-1">
									<AlarmClock size="1em" />
									Practiced {formatRelativeTime(task.lastPracticedAt)}
								</span>
							{/if}
						</div>

						<div class="mt-auto flex items-center gap-2 pt-3">
							<button
								class="btn btn-outline btn-primary btn-sm flex-1"
								onclick={() => openPracticeModal(task)}>
								Practice
								<ArrowRight size="1em" />
							</button>

							<div class="dropdown dropdown-end">
								<button
									class="btn btn-circle btn-ghost btn-sm"
									aria-label="Task actions"
									aria-haspopup="menu">
									<EllipsisVertical class="size-4" />
								</button>
								<ul
									class="menu dropdown-content z-1 w-36 rounded-box bg-base-100 p-1.5 shadow-sm">
									<li>
										<button onclick={() => openEditModal(task)}>
											Edit
											<PenLine size="1em" />
										</button>
									</li>
									<li>
										<button class="text-error" onclick={() => handleDelete(task)}>
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
			aria-label="Task library pagination">
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
				{#each Array.from({ length: totalPages }, (_, i) => i + 1) as pageNumber (pageNumber)}
					<button
						class="btn join-item btn-sm"
						class:btn-active={currentPage === pageNumber}
						aria-current={currentPage === pageNumber ? "page" : undefined}
						onclick={() => goToPage(pageNumber)}>
						{pageNumber}
					</button>
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

{#snippet statCard(props: { icon: Component; label: string; value: string; hint?: string })}
	<div
		class="flex flex-col rounded-box border border-base-content/20 bg-base-100 p-3.5 hover:border-primary">
		<div class="flex flex-1 items-center justify-between gap-2">
			<span class="text-xs font-semibold text-base-content/75">{props.label}</span>
			<props.icon class="size-4 shrink-0 opacity-70" />
		</div>
		<div class="mt-1.5 text-2xl font-bold">{props.value}</div>
		{#if props.hint}
			<p class="text-xs text-base-content/75">{props.hint}</p>
		{/if}
	</div>
{/snippet}

{#snippet practiceModeSnippet(props: { task: TaskItem })}
	<p class="mb-3 line-clamp-2 rounded-box bg-base-200/50 p-2.5 text-xs text-base-content/75">
		{props.task.prompt || "No prompt yet — you can add one while practicing."}
	</p>
	<p class="mb-2">Choose your preferred practice style:</p>
	<div class="flex max-h-48 justify-center gap-4">
		{#each [{ icon: AlarmClock, time: props.task.category === "1" ? 20 : 40, value: "timed" }, { icon: AlarmClockOff, value: "free" }] as option (option.value)}
			<label
				class={[
					"flex aspect-square flex-1 flex-col items-center gap-2 rounded-box border p-2 sm:gap-4",
					"transition-colors hover:border-primary hover:text-primary",
					"not-has-checked:shadow-md has-checked:bg-primary has-checked:text-primary-content"
				]}>
				<input
					class="appearance-none"
					type="radio"
					bind:group={selectedPracticeSessionType}
					value={option.value} />
				<option.icon class="w-full flex-1" />
				<span class="text-center">
					{option.value === "timed" ? `${option.time}-Min-Limit Practice` : "Unlimited Time Practice"}
				</span>
			</label>
		{/each}
	</div>
{/snippet}

{#snippet detailsSnippet(props: { task: TaskItem })}
	{#if props.task.hasImage}
		<img
			src={imageHref(props.task.id)}
			alt="Task visual"
			class="max-h-64 w-full rounded-box border border-base-content/10 bg-base-200/40 object-contain" />
	{/if}
	<p class="text-sm whitespace-pre-wrap">
		{props.task.prompt || "No prompt yet — add one by editing this task."}
	</p>
	<dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-base-content/75">
		<dt class="font-semibold">Created</dt>
		<dd>{props.task.createdAt.toLocaleString()}</dd>
		<dt class="font-semibold">Updated</dt>
		<dd>{props.task.updatedAt.toLocaleString()}</dd>
		<dt class="font-semibold">Practice sessions</dt>
		<dd>
			{props.task.sessionCount}
			{#if props.task.bestBand !== null}
				· best band {props.task.bestBand.toFixed(1)}
			{/if}
		</dd>
	</dl>
{/snippet}

{#snippet createFormSnippet()}
	{#key createKey}
		<form
			{...createForm}
			class="flex flex-col gap-3"
			enctype="multipart/form-data"
			oninput={() => (createError = null)}>
			<fieldset class="flex flex-col gap-1.5">
				<legend class="text-xs font-semibold text-base-content/75">Task category</legend>
				<div class="join w-full" role="group" aria-label="Task category">
					{#each [{ v: "1", l: "Task 1 · Visual report" }, { v: "2", l: "Task 2 · Essay" }] as option (option.v)}
						<label
							class={["btn join-item flex-1", createCategory === option.v ? "btn-primary" : ""]}>
							<input
								class="appearance-none"
								type="radio"
								name="category"
								value={option.v}
								bind:group={createCategory} />
							{option.l}
						</label>
					{/each}
				</div>
			</fieldset>

			<label class="flex flex-col gap-1.5">
				<span class="text-xs font-semibold text-base-content/75">
					Subcategory <span class="font-normal">(optional)</span>
				</span>
				<select
					class="select w-full"
					name="subcategory"
					bind:value={createSubcategory}
					onchange={() => createError = null}>
					<option value="">None</option>
					{#each createSubcategoryOptions as subcategory (subcategory)}
						<option value={subcategory}>{taskSubcategoryLabel(subcategory)}</option>
					{/each}
				</select>
			</label>

			<label class="flex flex-col gap-1.5">
				<span class="text-xs font-semibold text-base-content/75">Prompt</span>
				<textarea
					class="textarea w-full"
					name="prompt"
					rows="5"
					required
					maxlength={20000}
					placeholder="Paste or type the task prompt..."
					bind:value={createPrompt}></textarea>
			</label>

			<fieldset class="flex flex-col gap-1.5">
				<legend class="text-xs font-semibold text-base-content/75">
					Image <span class="font-normal">(optional, for Task 1 visuals)</span>
				</legend>
				<input
					class="file-input file-input-sm file-input-bordered w-full"
					type="file"
					name="image"
					accept="image/jpeg,image/png,image/webp,image/avif"
					bind:files={createFiles}
					onchange={handleCreateImageChange} />
				{#if createPreviewUrl}
					<img
						src={createPreviewUrl}
						alt="Selected visual preview"
						class="max-h-40 w-full rounded-box border border-base-content/10 object-contain" />
				{/if}
			</fieldset>

			{#if createError}
				<p class="text-xs text-error" role="alert">{createError}</p>
			{/if}

			<div class="modal-action">
				<button type="button" class="btn" onclick={() => closeModal()}>Cancel</button>
				<button type="submit" class="btn btn-primary" disabled={createTask.pending > 0}>
					{createTask.pending > 0 ? "Saving..." : "Save task"}
				</button>
			</div>
		</form>
	{/key}
{/snippet}

{#snippet editFormSnippet()}
	{#key editKey}
		<form
			{...editForm}
			class="flex flex-col gap-3"
			enctype="multipart/form-data"
			oninput={() => (editError = null)}>
			<input type="hidden" name="taskId" value={editTask?.id} />

			<div class="flex flex-wrap items-center gap-1.5">
				<span class="badge rounded-box badge-soft badge-xs font-semibold badge-primary">
					Task {editTask?.category}
				</span>
				<span class="text-xs text-base-content/75">Category cannot be changed</span>
			</div>

			<label class="flex flex-col gap-1.5">
				<span class="text-xs font-semibold text-base-content/75">
					Subcategory <span class="font-normal">(optional)</span>
				</span>
				<select class="select w-full" name="subcategory" bind:value={editSubcategory}>
					<option value="">None</option>
					{#each editSubcategoryOptions as subcategory (subcategory)}
						<option value={subcategory}>{taskSubcategoryLabel(subcategory)}</option>
					{/each}
				</select>
			</label>

			<label class="flex flex-col gap-1.5">
				<span class="text-xs font-semibold text-base-content/75">Prompt</span>
				<textarea
					class="textarea w-full"
					name="prompt"
					rows="5"
					required
					maxlength={20000}
					placeholder="Paste or type the task prompt..."
					bind:value={editPrompt}></textarea>
			</label>

			<fieldset class="flex flex-col gap-1.5">
				<legend class="text-xs font-semibold text-base-content/75">Image</legend>
				<input
					class="file-input file-input-sm file-input-bordered w-full"
					type="file"
					name="image"
					accept="image/jpeg,image/png,image/webp,image/avif"
					bind:files={editFiles}
					onchange={handleEditImageChange} />
				{#if editPreviewUrl}
					<img
						src={editPreviewUrl}
						alt="Selected visual preview"
						class="max-h-40 w-full rounded-box border border-base-content/10 object-contain" />
				{:else if editTask?.hasImage}
					<img
						src={imageHref(editTask.id)}
						alt="Current task visual"
						class="max-h-40 w-full rounded-box border border-base-content/10 bg-base-200/40 object-contain" />
					<button
						type="button"
						class="btn btn-ghost btn-xs self-start text-error"
						disabled={clearTaskImage.pending > 0}
						onclick={handleEditRemoveImage}>
						<Trash size="1em" />
						Remove image
					</button>
				{/if}
			</fieldset>

			{#if editError}
				<p class="text-xs text-error" role="alert">{editError}</p>
			{/if}

			<div class="modal-action">
				<button type="button" class="btn" onclick={() => closeModal()}>Cancel</button>
				<button type="submit" class="btn btn-primary" disabled={updateTask.pending > 0}>
					{updateTask.pending > 0 ? "Saving..." : "Save changes"}
				</button>
			</div>
		</form>
	{/key}
{/snippet}

{#snippet deleteSnippet(props: { task: TaskItem; sessions: DependantSession[] })}
	<p>
		You are about to permanently delete this task
		{#if props.sessions.length > 0}
			and its <span class="font-semibold">{props.sessions.length}</span>
			dependent practice {props.sessions.length === 1 ? "session" : "sessions"}, including their
			essays, evaluations, and chats
		{/if}. This action cannot be undone.
	</p>

	{#if props.sessions.length > 0}
		<div class="mt-3 flex flex-col gap-1.5" aria-label="Dependent practice sessions">
			<p class="text-xs font-semibold text-base-content/75">Affected practice sessions:</p>
			<div class="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
				{#each props.sessions as session (session.id)}
					<a
						class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-box border border-base-content/10 px-2.5 py-1.5 text-xs hover:bg-primary hover:text-primary-content"
						href={practiceHref(session.id)}
						target="_blank"
						rel="noopener noreferrer"
						title="Open in a new tab">
						<span class="badge rounded-box badge-soft badge-xs">
							{session.type === "timed" ? "Timed" : "Free"}
						</span>
						<span class="truncate font-semibold">{session.name}</span>
						<span class="whitespace-nowrap text-right">
							{#if session.estimatedBand}
								Band {session.estimatedBand.toFixed(1)}
							{:else}
								{formatRelativeTime(session.updatedAt)}
							{/if}
						</span>
					</a>
				{/each}
			</div>
		</div>

		<div class="mt-3 flex flex-col gap-1.5">
			<label class="flex flex-col gap-1.5">
				<span class="flex items-center gap-1.5 text-xs font-semibold text-base-content/75">
					<TriangleAlert class="size-4 text-warning" />
					Type “{CONFIRM_PHRASE}” to confirm
				</span>
				<input
					class="input w-full"
					type="text"
					placeholder={CONFIRM_PHRASE}
					autocomplete="off"
					spellcheck="false"
					aria-label='Type "{CONFIRM_PHRASE}" to confirm deletion'
					bind:value={confirmPhrase} />
			</label>
		</div>
	{:else}
		<p class="mt-2 text-xs text-base-content/75">
			This task is not used by any practice sessions yet, so nothing else will be removed.
		</p>
	{/if}
{/snippet}
