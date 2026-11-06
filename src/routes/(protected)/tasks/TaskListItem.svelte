<script lang="ts">
	import {
		AlarmClock,
		ArrowRight,
		CalendarDays,
		ChartPie,
		EllipsisVertical,
		PenLine,
		Trash
	} from "@lucide/svelte";
	import { getBandBadgeTone } from "#lib/utils/ielts.js";
	import { formatRelativeTime } from "#lib/utils/time.js";
	import { getTaskSubcategoryLabel } from "#lib/domain/task-subcategory.ts";
	import { type TaskItem } from "./links.ts";
	import { getImageUrl } from "#lib/utils/links.ts";

	type Props = {
		task: TaskItem;
		onDetails: () => void;
		onPractice: () => void;
		onEdit: () => void;
		onDelete: () => void;
	};
	let { task, onDetails, onPractice, onEdit, onDelete }: Props = $props();
</script>

<article
	class={[
		"flex items-center gap-3 rounded-box border border-base-content/20 bg-base-100 p-3 transition-colors",
		"hover:border-primary hover:shadow"
	]}>
	<button
		type="button"
		class={[
			"flex aspect-video h-16 cursor-pointer items-center justify-center overflow-hidden border border-base-content/10 bg-base-200/50",
			"sm:h-24"
		]}
		aria-label="View task details"
		onclick={onDetails}>
		{#if task.imageName}
			<img
				src={getImageUrl(task.imageName)}
				alt="Task visual"
				class="size-full object-contain"
				loading="lazy" />
		{:else}
			{#if task.category === "1"}
				<ChartPie class="size-5 text-base-content/25" />
			{:else}
				<PenLine class="size-5 text-base-content/25" />
			{/if}
		{/if}
	</button>

	<button
		type="button"
		class="min-w-0 flex-1 cursor-pointer text-left"
		aria-label="View task details"
		onclick={onDetails}>
		{#if task.prompt}
			<p class="line-clamp-2 text-sm">{task.prompt}</p>
		{:else}
			<p class="line-clamp-2 text-sm text-base-content/50 italic">No prompt yet</p>
		{/if}
		<div class="mt-1 flex flex-wrap items-center gap-1 text-xs text-base-content/75">
			<span class="badge rounded-box badge-soft badge-xs font-semibold badge-primary">
				Task {task.category}
			</span>
			{#if task.isExample}
				<span class="badge badge-soft badge-xs badge-info">Example</span>
			{/if}
			{#if task.subcategory}
				<span class="badge badge-soft badge-xs">{getTaskSubcategoryLabel(task.subcategory)}</span>
			{/if}
			{#if task.bestBand !== null}
				<span class={["badge badge-soft badge-xs", getBandBadgeTone(task.bestBand)]}>
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
			<span class="flex items-center gap-1">
				<CalendarDays size="1em" />
				<time datetime={task.updatedAt.toISOString()} title={task.updatedAt.toLocaleString()}>
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
	</button>

	<div class="hidden shrink-0 items-center gap-1.5 sm:flex">
		<button class="btn btn-outline btn-primary btn-sm" onclick={onPractice}>
			Practice
			<ArrowRight size="1em" />
		</button>

		{#if !task.isExample}
			<div class="dropdown dropdown-end">
				<button
					class="btn btn-circle btn-ghost btn-sm"
					aria-label="Task actions"
					aria-haspopup="menu">
					<EllipsisVertical class="size-4" />
				</button>
				<ul class="menu dropdown-content z-1 w-36 rounded-box bg-base-100 p-1.5 shadow-sm">
					<li>
						<button onclick={onEdit}>
							Edit
							<PenLine size="1em" />
						</button>
					</li>
					<li>
						<button class="text-error" onclick={onDelete}>
							Delete
							<Trash size="1em" />
						</button>
					</li>
				</ul>
			</div>
		{/if}
	</div>
</article>
