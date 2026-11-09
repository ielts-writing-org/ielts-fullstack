<script lang="ts">
	import { roundToNearestHalf } from "#lib/utils/math.ts";

	type Props = {
		criteria: {
			name: string;
			task1: number;
			task2: number;
		}[];
		bandTarget: number;
	};
	let { criteria, bandTarget }: Props = $props();
</script>

<div class={["flex flex-wrap gap-3 border-t border-base-content/10 pt-3"]}>
	{#each criteria as criterion (criterion.name)}
		<div class="flex basis-full gap-4 sm:basis-[48%]">
			<div class="flex-1 text-sm font-semibold">{criterion.name}</div>
			<div class="flex gap-4 sm:flex-1">
				{@render taskBand("1", criterion.task1, bandTarget ?? 0)}
				{@render taskBand("2", criterion.task2, bandTarget ?? 0)}
			</div>
		</div>
	{/each}
</div>

{#snippet taskBand(taskCategory: string, taskAvg: number, bandTarget: number)}
	<div class="flex flex-col items-center">
		<div
			class={["radial-progress", taskAvg < bandTarget ? "text-warning" : "text-success"]}
			style:--value={(taskAvg / 9) * 100}
			style:--size="2em"
			aria-valuenow={taskAvg}
			role="progressbar">
			{roundToNearestHalf(taskAvg).toFixed(1)}
		</div>
		<div class="text-xs text-base-content/75">Task {taskCategory}</div>
	</div>
{/snippet}
