<script lang="ts">
	import { goto } from "$app/navigation";
	import { ArrowRight, Clock3 } from "@lucide/svelte";
	import type { TaskCategory } from "#lib/schemas/task-category.ts";
	import { openModal } from "#lib/components/Modal.svelte";
	import { createPractice } from "./create-practice.remote";
	import PracticeTypePicker from "./PracticeTypePicker.svelte";
	import TaskCreateForm from "#lib/components/TaskCreateForm.svelte";

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

	let selectedPracticeSessionType = $state<"timed" | "free">("timed");

	/** Opens the combined "new task + practice style" flow for a fixed category. */
	const handleCreateCustomTaskPractice = (taskCategory: TaskCategory) => {
		selectedPracticeSessionType = "timed";
		openModal({
			title: `Start Task ${taskCategory} practice`,
			content: { snippet: startPracticeSnippet, args: { category: taskCategory } }
		});
	};

	async function startPractice(taskCategory: TaskCategory, taskId: string) {
		try {
			const result = await createPractice({
				taskCategory,
				taskId,
				practiceSessionType: selectedPracticeSessionType
			});
			if (result.success) {
				goto(result.location);
			}
		} catch (error) {
			openModal({
				title: "Unable to start practice",
				content: String(error),
				primaryButton: "Close"
			});
		}
	}
</script>

<div class="grid grid-cols-1 gap-3.5 md:grid-cols-2">
	{#each practiceOptions as option (option)}
	<article
		class="flex min-h-60 flex-col overflow-hidden rounded-box border border-base-content/20 bg-base-100 p-4 transition-shadow hover:border-primary hover:shadow-sm">
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
				class="btn btn-primary mt-auto"
				onclick={() => handleCreateCustomTaskPractice(option.taskCategory)}>
				Start Task {option.taskCategory} Practice
				<ArrowRight size="1em" />
			</button>
		</article>
	{/each}
</div>

{#snippet startPracticeSnippet(props: { category: TaskCategory })}
	<p class="mb-3 text-xs text-base-content/75">
		Set up the task you want to write about, pick a practice style, and start.
	</p>
	<TaskCreateForm
		category={props.category}
		submitLabel="Start practice"
		onSaved={(taskId) => startPractice(props.category, taskId)}>
		<fieldset class="flex flex-col gap-1.5">
			<legend class="text-xs font-semibold text-base-content/75">Practice style</legend>
			<PracticeTypePicker bind:value={selectedPracticeSessionType} category={props.category} />
		</fieldset>
	</TaskCreateForm>
{/snippet}
