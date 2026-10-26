<script lang="ts">
	import { resolve } from "$app/paths";
	import { ArrowRight } from "@lucide/svelte";
	import type { TaskCategory } from "#lib/schemas/task-category.ts";

	type Props = {
		practiceSession: {
			id: string;
			name: string;
			type: "free" | "timed";
			updatedAt: Date;
		};
		task: {
			category: TaskCategory;
			subcategory?: string;
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
			<div class="badge badge-soft badge-sm badge-primary">PREVIOUS PRACTICE SESSION</div>
			<div class="font-semibold text-base-content/75">
				<span>
					Task {task.category}{task.subcategory === "uncategorized" ? "" : `: ${task.subcategory}`}
				</span>
				<span class="mx-1">•</span>
				{#if practiceSession.type === "timed"}
					<span>Est. {task.category === "1" ? 20 : 40} min</span>
				{:else}
					<span>Unlimited time</span>
				{/if}
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
