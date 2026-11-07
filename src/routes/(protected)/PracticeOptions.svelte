<script lang="ts">
	import { ArrowRight, Clock3 } from "@lucide/svelte";
	import type { TaskCategory } from "#lib/domain/task-category.ts";
	import { openModal } from "#lib/components/Modal.svelte";
	import NewTaskPractice from "./NewTaskPractice.svelte";

	type Props = {
		practiceOptions: {
			taskCategory: "1" | "2";
			name: string;
			description: string;
			requirements: string;
			supportLabel: string;
			supportTypes: string[];
		}[];
	};

	const { practiceOptions }: Props = $props();

	let openKey = 0;

	function openStartPracticeModal(taskCategory: TaskCategory) {
		openModal({
			title: `Start Task ${taskCategory} practice`,
			content: {
				component: NewTaskPractice,
				props: { category: taskCategory, openKey: ++openKey }
			}
		});
	}
</script>

<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
	{#each practiceOptions as option (option)}
		<article
			class="flex min-h-66 flex-col overflow-hidden rounded-box border border-base-content/20 bg-base-100 p-4">
			<div class="flex justify-between gap-1.5 text-xs">
				<span class="badge rounded-box badge-soft badge-sm font-semibold badge-primary">
					TASK {option.taskCategory}
				</span>
				<span class="flex items-center gap-1 text-base-content/75">
					<Clock3 size="1em" />
					{option.requirements}
				</span>
			</div>
			<h3 class="mt-3 font-semibold">{option.name}</h3>
			<p class="mb-3 line-clamp-2 text-xs text-base-content/75">
				{option.description}
			</p>
			<span class="mb-1 text-xs font-semibold text-base-content/75">{option.supportLabel}</span>
			<div class="flex flex-wrap gap-1.5">
				{#each option.supportTypes as type (type)}
					<div class="badge badge-soft badge-xs">{type}</div>
				{/each}
			</div>
			<button
				class="btn mt-auto btn-primary"
				onclick={() => openStartPracticeModal(option.taskCategory)}>
				Start Task {option.taskCategory} Practice
				<ArrowRight size="1em" />
			</button>
		</article>
	{/each}
</div>
