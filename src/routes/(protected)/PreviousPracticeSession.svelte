<script lang="ts" generics="Category extends TaskCategory">
	import { resolve } from "$app/paths";
	import { ArrowRight, Clock, InfinityIcon } from "@lucide/svelte";
	import type { TaskCategory } from "#lib/schemas/task-category.ts";
	import type { TaskSubcategory } from "#lib/schemas/task-subcategory.ts";
	import type { PracticeSessionType } from "#lib/schemas/practice-session-type.ts";
	import { timeLimitMinutesFor } from "#lib/utils/ielts.ts";

	type Props = {
		practiceSession: {
			id: string;
			name: string;
			type: PracticeSessionType;
			updatedAt: Date;
		};
		task: {
			category: Category;
			subcategory: TaskSubcategory<Category> | null;
			prompt: string;
		};
	};

	const { task, practiceSession }: Props = $props();
</script>

<section
	class="flex min-h-24.5 w-full flex-col items-start justify-between gap-4 rounded-box border border-base-content/20 bg-base-100 px-4 py-3 hover:border-primary sm:flex-row sm:items-center sm:px-5"
	aria-label="Recommended practice">
	<div class="max-w-full min-w-0 flex-1">
		<div class="flex flex-wrap items-center gap-2 text-xs font-semibold">
			<div class="font-semibold text-base-content/75">
				<span class="badge badge-soft badge-sm badge-primary">
					Task {task.category}
				</span>
				<span class="badge badge-ghost badge-sm font-medium">
					{task.subcategory ? task.subcategory : "Uncategorized"}
				</span>
				<span class="badge badge-ghost badge-sm font-medium">
					{#if practiceSession.type === "timed"}
						<Clock class="size-4" />
						{timeLimitMinutesFor(task.category)} min limit
					{:else}
						<InfinityIcon class="size-4" />
						Unlimited time
					{/if}
				</span>
			</div>
		</div>
		<h1 class="my-1.5 truncate font-bold">{practiceSession.name}</h1>
		<p class="max-w-3xl text-xs text-base-content/75">{task.prompt}</p>
	</div>
	<div class="tooltip" data-tip={practiceSession.updatedAt.toLocaleString()}>
		<a
			class="btn btn-primary"
			href={resolve("/(protected)/practice/[practiceSessionId=practiceSessionId]", {
				practiceSessionId: practiceSession.id
			})}>
			Resume Session
			<ArrowRight size="1em" />
		</a>
	</div>
</section>
