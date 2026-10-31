<script lang="ts" generics="Category extends TaskCategory">
	import { resolve } from "$app/paths";
	import { ArrowRight, CalendarDays, Clock, InfinityIcon } from "@lucide/svelte";
	import type { TaskCategory } from "#lib/schemas/task-category.ts";
	import type { TaskSubcategory } from "#lib/schemas/task-subcategory.ts";
	import type { PracticeSessionType } from "#lib/schemas/practice-session-type.ts";
	import { timeLimitMinutesFor } from "#lib/utils/ielts.ts";
	import { bandTone } from "#lib/utils/ielts.ts";
	import { formatRelativeTime } from "#lib/utils/time.ts";
	import { taskSubcategoryLabel } from "#lib/mappings/task-subcategory.ts";

	type Props = {
		practiceSession: {
			id: string;
			name: string;
			type: PracticeSessionType;
			updatedAt: Date;
			band: number | undefined;
		};
		task: {
			category: Category;
			subcategory: TaskSubcategory<Category> | null;
			prompt: string;
		};
	};

	const { task, practiceSession }: Props = $props();

	const evaluated = $derived(practiceSession.band !== undefined);
</script>

<section
	class="relative overflow-hidden rounded-box border border-primary/30 bg-base-100 px-4 py-3.5 sm:px-5"
	aria-label="Continue where you left off">
	<div class="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden="true"></div>

	<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
		<div class="min-w-0 flex-1 sm:pl-1.5">
			<p class="text-xs font-bold tracking-wide text-primary uppercase">
				Continue where you left off
			</p>
			<div class="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-semibold">
				<span class="badge badge-soft badge-sm badge-primary">Task {task.category}</span>
				{#if task.subcategory}
					<span class="badge badge-ghost badge-sm font-medium">
						{taskSubcategoryLabel(task.subcategory)}
					</span>
				{/if}
				<span class="badge badge-ghost badge-sm font-medium">
					{#if practiceSession.type === "timed"}
						<Clock class="size-4" />
						{timeLimitMinutesFor(task.category)} min limit
					{:else}
						<InfinityIcon class="size-4" />
						Unlimited time
					{/if}
				</span>
				{#if practiceSession.band !== undefined}
					<span
						class={[
							"badge badge-sm font-semibold",
							practiceSession.band >= 7.5 && "badge-success",
							practiceSession.band >= 5.5 && practiceSession.band < 7.5 && "badge-warning",
							practiceSession.band < 5.5 && "badge-error"
						]}>
						Band {practiceSession.band.toFixed(1)}
					</span>
				{:else}
					<span class="badge badge-ghost badge-sm font-medium">Not evaluated</span>
				{/if}
			</div>
			<h2 class="mt-1 truncate font-semibold">{practiceSession.name}</h2>
			{#if task.prompt}
				<p class="mt-0.5 line-clamp-2 max-w-3xl text-xs text-base-content/75">{task.prompt}</p>
			{/if}
			<p class="mt-1.5 flex items-center gap-1 text-xs text-base-content/75">
				<CalendarDays class="size-3.5" />
				Last worked on
				<time
					datetime={practiceSession.updatedAt.toISOString()}
					title={practiceSession.updatedAt.toLocaleString()}>
					{formatRelativeTime(practiceSession.updatedAt)}
				</time>
			</p>
		</div>

		<div class="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
			{#if practiceSession.band !== undefined}
				<div class="hidden flex-col items-center sm:flex">
					<div
						class={["radial-progress text-sm font-semibold", bandTone(practiceSession.band)]}
						style:--value={(practiceSession.band / 9) * 100}
						style:--size="3em"
						role="progressbar"
						aria-label="Overall band of this session"
						aria-valuenow={practiceSession.band}
						aria-valuemin={0}
						aria-valuemax={9}>
						{practiceSession.band.toFixed(1)}
					</div>
					<span class="mt-0.5 text-xs text-base-content/75">Overall</span>
				</div>
			{/if}
			<a
				class="btn btn-primary"
				href={resolve("/(protected)/practice/[practiceSessionId=practiceSessionId]", {
					practiceSessionId: practiceSession.id
				})}>
				{evaluated ? "Review session" : "Continue session"}
				<ArrowRight size="1em" />
			</a>
		</div>
	</div>
</section>
