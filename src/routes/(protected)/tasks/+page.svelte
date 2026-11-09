<script lang="ts">
	import { goto, refreshAll } from "$app/navigation";
	import { LibraryBig, Plus } from "@lucide/svelte";
	import { openModal } from "#lib/components/Modal.svelte";
	import TaskCreateForm from "#lib/components/TaskCreateForm.svelte";
	import { getTaskDependants } from "#lib/remotes/query/get-task-dependants.remote.js";
	import { tasksHref, type TaskItem } from "./links.ts";
	import TaskListItem from "./TaskListItem.svelte";
	import TaskStats from "./TaskStats.svelte";
	import TaskDeleteConfirm from "./TaskDeleteConfirm.svelte";
	import TaskDetails from "./TaskDetails.svelte";
	import TaskEditForm from "./TaskEditForm.svelte";
	import TaskFilters from "./TaskFilters.svelte";
	import TaskPagination from "./TaskPagination.svelte";
	import TaskPracticeSetup from "./TaskPracticeSetup.svelte";
	import { getProfile } from "#lib/remotes/query/get-profile.remote.ts";

	const { data } = $props();

	const filters = $derived(data.filters);
	const hasFilters = $derived(
		Boolean(filters.source || filters.task || filters.subcategory || filters.q)
	);

	function openCreateModal() {
		openModal({
			title: "New task",
			content: {
				component: TaskCreateForm,
				props: { submitLabel: "Save task", onSaved: refreshAll }
			}
		});
	}

	function openPracticeModal(task: TaskItem) {
		openModal({
			title: "Start a practice session",
			content: { component: TaskPracticeSetup, props: { task } }
		});
	}

	function openDetailsModal(task: TaskItem) {
		openModal({
			title: { text: `Task ${task.category} details`, color: "primary" },
			content: {
				component: TaskDetails,
				props: {
					task,
					onPractice: () => openPracticeModal(task),
					onEdit: () => openEditModal(task),
					onDelete: () => openDeleteModal(task)
				}
			},
			closeButton: true,
			closeByBackdrop: true
		});
	}

	function openEditModal(task: TaskItem) {
		openModal({
			title: "Edit task",
			content: { component: TaskEditForm, props: { task, onSaved: refreshAll } }
		});
	}

	async function openDeleteModal(task: TaskItem) {
		const { sessions } = await getTaskDependants(task.id);
		openModal({
			title: { text: "Delete task", color: "error" },
			content: {
				component: TaskDeleteConfirm,
				props: { task, sessions, onDeleted: refreshAll }
			}
		});
	}
</script>

<svelte:head>
	<title>Task Library | IELTS Writing Practice Platform</title>
	<meta name="description" content="Manage the IELTS Writing tasks you practice with." />
</svelte:head>

<main id="main-content" class="w-full flex-1 overflow-y-auto p-3 sm:p-4 lg:px-9">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div class="min-w-0">
			<div class="flex items-center gap-2">
				<LibraryBig class="size-5 shrink-0 text-primary" />
				<h1 class="font-bold sm:text-lg">Task Library</h1>
			</div>
			<p class="mt-0.5 text-xs text-base-content/75">
				Your saved prompts and built-in example tasks. Practice them again, organize them, or clean
				up the ones you no longer need.
			</p>
		</div>
		<button class="btn btn-primary btn-sm sm:shrink-0" onclick={openCreateModal}>
			<Plus size="1em" />
			New task
		</button>
	</div>

	<TaskStats stats={data.stats} />

	<TaskFilters {filters} resultCount={data.tasks.length} total={data.pagination.total} />

	<section class="mt-4 flex w-full flex-col gap-2" aria-label="Tasks">
		{#if data.pagination.total === 0 && hasFilters}
			<div
				class="flex flex-col items-center justify-center gap-2 rounded-box border border-dashed border-base-content/20 py-16 text-base-content/75">
				<LibraryBig size="2.5em" />
				<p class="font-semibold">No tasks match your filters</p>
				<p class="text-xs">Try a different search term or clear the filters.</p>
				<button
					class="btn mt-2 btn-outline btn-primary btn-sm"
					onclick={() => goto(tasksHref, { reset: false })}>
					Clear filters
				</button>
			</div>
		{:else if data.pagination.total === 0}
			<div
				class="flex flex-col items-center justify-center gap-2 rounded-box border border-dashed border-base-content/20 py-16 text-base-content/75">
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
				<TaskListItem
					{task}
					bandTarget={(await getProfile()).bandTarget}
					onDetails={() => openDetailsModal(task)}
					onPractice={() => openPracticeModal(task)}
					onEdit={() => openEditModal(task)}
					onDelete={() => openDeleteModal(task)} />
			{/each}
		{/if}
	</section>

	{#if data.pagination.total > 0}
		<TaskPagination {filters} page={data.pagination.page} totalPages={data.pagination.totalPages} />
	{/if}
</main>
