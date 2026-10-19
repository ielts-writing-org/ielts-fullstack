<script lang="ts">
	import { ArrowRight } from "@lucide/svelte";
	import type { TaskCategory } from "#lib/schemas/task-category.ts";

	type Props = {
		taskInfo: {
			category: string;
			description: string;
			est: number;
			title: string;
			type: TaskCategory;
		};
	};

	const { taskInfo }: Props = $props();
</script>

<section
	class="flex min-h-24.5 w-full flex-col items-start justify-between gap-4 rounded-box border border-base-content/20 bg-base-100 px-4 py-3 hover:border-primary sm:flex-row sm:items-center sm:px-5"
	aria-label="Recommended practice">
	<div class="min-w-0">
		<div class="flex flex-wrap items-center gap-2 text-xs font-semibold">
			<span class="badge badge-soft badge-sm badge-primary">RECOMMENDED FOR YOU</span>
			<span class="font-semibold text-base-content/75">
				Task {taskInfo.type}: {taskInfo.category}
				<span class="mx-1">•</span>
				Est. {taskInfo.est} min
			</span>
		</div>
		<h1 class="my-1.5 font-semibold">{taskInfo.title}</h1>
		<p class="max-w-3xl text-xs text-base-content/75">
			{taskInfo.description}
		</p>
	</div>
	<button class="btn btn-primary">
		Practice this task
		<ArrowRight size="1em" />
	</button>
</section>
