<script lang="ts">
	import { goto, refreshAll } from "$app/navigation";
	import { ArrowRight, PenLine, RotateCcwClock } from "@lucide/svelte";
	import { openModal } from "#lib/components/Modal.svelte";
	import { deletePracticeSession } from "#lib/remotes/command/delete-practice-session.remote.js";
	import { historyHref, newPracticeHref, type SessionItem } from "./utils.ts";
	import HistoryFilters from "./HistoryFilters.svelte";
	import HistoryPagination from "./HistoryPagination.svelte";
	import HistoryStats from "./HistoryStats.svelte";
	import HistoryTrend from "./HistoryTrend.svelte";
	import RenameSessionModal from "./RenameSessionModal.svelte";
	import SessionCard from "./SessionCard.svelte";
	import { getProfile } from "#lib/remotes/query/get-profile.remote.ts";

	const { data } = $props();

	const filters = $derived(data.filters);
	const bandTarget = $derived((await getProfile()).bandTarget ?? 0);
	const hasFilters = $derived(
		Boolean(filters.task || filters.subcategory || filters.type || filters.status || filters.q)
	);

	function handleRename(session: SessionItem) {
		openModal({
			title: "Rename practice session",
			content: {
				component: RenameSessionModal,
				props: { session, onSaved: refreshAll }
			}
		});
	}

	function handleDelete(session: SessionItem) {
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
		<a class="btn btn-primary btn-sm sm:shrink-0" href={newPracticeHref}>
			<PenLine size="1em" />
			Start new practice
		</a>
	</div>

	<HistoryTrend trend={data.trend} {bandTarget} />

	<HistoryStats stats={data.stats} {bandTarget} />

	<HistoryFilters
		{filters}
		resultCount={data.practiceSessions.length}
		total={data.pagination.total}
		availableSubcategories={data.availableSubcategories} />

	<section class="mt-4 flex flex-col gap-2.5" aria-label="Practice sessions">
		{#if data.pagination.total === 0 && hasFilters}
			<div
				class="flex flex-col items-center justify-center gap-2 rounded-box border border-dashed border-base-content/20 py-16 text-base-content/75">
				<RotateCcwClock size="2.5em" />
				<p class="font-semibold">No practice sessions match your filters</p>
				<p class="text-xs">Try a different search term or clear the filters.</p>
				<button
					class="btn mt-2 btn-outline btn-primary btn-sm"
					onclick={() => goto(historyHref, { reset: false })}>
					Clear filters
				</button>
			</div>
		{:else if data.pagination.total === 0}
			<div
				class="flex flex-col items-center justify-center gap-2 rounded-box border border-dashed border-base-content/20 py-16 text-base-content/75">
				<RotateCcwClock size="2.5em" />
				<p class="font-semibold">No practice sessions yet</p>
				<p class="text-xs">Start a Task 1 or Task 2 practice and it will show up here.</p>
				<a class="btn mt-2 btn-primary btn-sm" href={newPracticeHref}>
					Start new practice
					<ArrowRight size="1em" />
				</a>
			</div>
		{:else}
			{#each data.practiceSessions as session (session.id)}
				<SessionCard {session} {bandTarget} onRename={handleRename} onDelete={handleDelete} />
			{/each}
		{/if}
	</section>

	{#if data.pagination.total > 0}
		<HistoryPagination
			{filters}
			page={data.pagination.page}
			totalPages={data.pagination.totalPages} />
	{/if}
</main>
