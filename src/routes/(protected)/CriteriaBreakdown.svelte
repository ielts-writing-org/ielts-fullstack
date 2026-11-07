<script lang="ts">
	import { roundToNearestHalf } from "#lib/utils/math.ts";

	type Props = {
		criteria: {
			name: string;
			task1: number;
			task2: number;
		}[];
	};
	let { criteria }: Props = $props();
</script>

<div
	class="flex flex-col gap-2 border-t border-base-content/10 pt-3"
	title="Task 2 bands are weighted double, matching the IELTS overall writing band calculation">
	{#each criteria as criterion (criterion.name)}
		<div class="flex gap-4">
			<div class="flex-1">
				{const criterionAvg = (criterion.task1 * 1) / 3 + (criterion.task2 * 2) / 3}
				<div class="text-sm font-semibold">{criterion.name}</div>
				<div class="flex items-center gap-2">
					<div
						class={[
							"text-sm font-medium",
							criterionAvg >= 7.5 && "text-success",
							criterionAvg >= 5.5 && criterionAvg < 7.5 && "text-warning",
							criterionAvg < 5.5 && "text-error"
						]}>
						{roundToNearestHalf(criterionAvg).toFixed(1)}
					</div>
					<progress
						class={[
							"progress",
							criterionAvg >= 7.5 && "progress-success",
							criterionAvg >= 5.5 && criterionAvg < 7.5 && "progress-warning",
							criterionAvg < 5.5 && "progress-error"
						]}
						value={criterionAvg}
						max="9">
					</progress>
				</div>
			</div>
			<div class="flex justify-end gap-4">
				{@render taskBand("1", criterion.task1)}
				{@render taskBand("2", criterion.task2)}
			</div>
		</div>
	{/each}
</div>

{#snippet taskBand(taskCategory: string, taskAvg: number)}
	<div
		class="tooltip tooltip-left"
		data-tip={`Average task ${taskCategory} band: ${roundToNearestHalf(taskAvg).toFixed(1)}`}>
		<div class="flex flex-col items-center">
			<div
				class={[
					"radial-progress",
					taskAvg >= 7.5 && "text-success",
					taskAvg >= 5.5 && taskAvg < 7.5 && "text-warning",
					taskAvg < 5.5 && "text-error"
				]}
				style:--value={(taskAvg / 9) * 100}
				style:--size="2em"
				aria-valuenow={taskAvg}
				role="progressbar">
				{roundToNearestHalf(taskAvg).toFixed(1)}
			</div>
			<div class="text-xs text-base-content/75">Task {taskCategory}</div>
		</div>
	</div>
{/snippet}
