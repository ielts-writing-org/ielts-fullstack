<script lang="ts">
	import { roundToNearestHalf } from "#lib/utils/math.ts";

	type Props = {
		criteria: {
			name: string;
			scores: number[];
		}[];
		bandTarget: number;
		overallBand: number;
	};

	const { criteria, bandTarget, overallBand }: Props = $props();
</script>

<aside
	class="flex flex-col gap-2 overflow-hidden rounded-box border border-base-content/20 bg-base-100 p-4 hover:border-primary">
	<div class="flex justify-between">
		<div>
			<h2 class="font-bold">Evaluation Result</h2>
			<p class="text-xs whitespace-nowrap text-base-content/75">Average band between sesssions</p>
		</div>
		<span
			class={[
				"badge badge-sm font-semibold whitespace-nowrap",
				overallBand >= bandTarget && "badge-success",
				overallBand < bandTarget && "badge-warning"
			]}>
			Estimated Average Band: {overallBand}
		</span>
	</div>
	<div class="flex flex-col gap-2">
		{#each criteria as criterion (criterion.name)}
			<div class="flex gap-4">
				<div class="flex-1">
					{const criterionAvg = (criterion.scores[0] * 1) / 3 + (criterion.scores[1] * 2) / 3}
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
					{#each criterion.scores as taskAvg, index (index)}
						<div
							class="tooltip tooltip-left"
							data-tip={`Average task ${index + 1} band: ${roundToNearestHalf(taskAvg).toFixed(1)}`}>
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
								<div class="text-xs">Task {index + 1}</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</aside>
