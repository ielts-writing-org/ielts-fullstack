<script lang="ts">
	import type { Component } from "svelte";
	import { goto } from "$app/navigation";
	import { AlarmClock, AlarmClockOff, ArrowRight, Clock3 } from "@lucide/svelte";
	import type { TaskCategory } from "#lib/schemas/task-category.ts";
	import { openModal } from "#lib/components/Modal.svelte";
	import { createPractice } from "./create-practice.remote";

	type Props = {
		practiceOptions: {
			description: string;
			name: string;
			requirements: string;
			supportLabel: string;
			supportTypes: string[];
			taskType: "1" | "2";
		}[];
	};

	const { practiceOptions }: Props = $props();

	const handleCreateCustomTaskPractice = (taskType: TaskCategory) => {
		openModal({
			children: practiceOptionsSnippet,
			childrenProps: {
				options: [
					{
						icon: AlarmClock,
						time: taskType === "1" ? 20 : 40,
						value: "timed"
					},
					{
						icon: AlarmClockOff,
						value: "free"
					}
				]
			},
			content: "Choose your preferred practice style:",
			primaryButton: {
				action: async () => {
					const result = await createPractice({ taskCategory: taskType });
					if (result.success) {
						goto(result.location);
					}
				},
				color: "primary",
				text: "Create"
			},
			secondaryButton: {
				color: "error",
				style: "ghost",
				text: "Cancel"
			},
			title: "Start a custom task practice"
		});
	};
</script>

<div class="grid grid-cols-1 gap-3.5 md:grid-cols-2">
	{#each practiceOptions as option (option)}
		<article
			class="flex min-h-60 flex-col overflow-hidden rounded-box border border-base-content/20 bg-base-100 p-4 hover:border-primary">
			<div class="flex justify-between gap-1.5 text-xs">
				<span class="badge rounded-box badge-soft badge-sm font-semibold badge-primary">
					TASK {option.taskType}
				</span>
				<span class="flex items-center gap-1 text-base-content/75">
					<Clock3 size="1em" />
					{option.requirements}
				</span>
			</div>
			<h3 class="mt-3 font-semibold">{option.name}</h3>
			<p class="mb-3 truncate text-xs text-base-content/75">
				{option.description}
			</p>
			<span class="mb-1 text-xs font-semibold text-base-content/75">{option.supportLabel}</span>
			<div class="flex flex-wrap gap-1.5">
				{#each option.supportTypes as type (type)}
					<div class="badge badge-soft badge-xs">{type}</div>
				{/each}
			</div>
			<button
				class="btn mt-auto btn-outline btn-primary"
				onclick={() => handleCreateCustomTaskPractice(option.taskType)}>
				Start Task {option.taskType} Practice
				<ArrowRight size="1em" />
			</button>
		</article>
	{/each}
</div>

{#snippet practiceOptionsSnippet(props: {
	options: ({
		icon: Component;
	} & ({ time: number; value: "timed" } | { value: "free" }))[];
})}
	<div class="flex max-h-48 justify-center gap-4">
		{#each props.options as option, i (option.value)}
			<label
				class={[
					"flex aspect-square flex-1 flex-col items-center gap-2 rounded-box border p-2 sm:gap-4",
					"transition-colors hover:border-primary hover:text-primary",
					"not-has-checked:shadow-md has-checked:bg-primary has-checked:text-primary-content"
				]}>
				<input
					class="appearance-none"
					type="radio"
					name="practiceType"
					value={option.value}
					defaultChecked={i === 0} />
				<option.icon class="w-full flex-1" />
				<span class="text-center">
					{option.value === "timed"
						? `${option.time}-Min-Limit Practice`
						: "Unlimited Time Practice"}
				</span>
			</label>
		{/each}
	</div>
{/snippet}
