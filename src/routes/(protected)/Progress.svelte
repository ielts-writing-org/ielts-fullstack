<script lang="ts">
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
			<div class="flex gap-2">
				<div class="flex-1">
					<p class="text-sm font-semibold">
						{criterion.name}
					</p>
					<p class="text-xs text-base-content/60">No note</p>
				</div>
				<div class="flex justify-end gap-4">
					{#each criterion.scores as score, index (score)}
						<div class="flex flex-col items-center">
							<div
								class={[
									"radial-progress",
									score >= 7.5 && "text-success",
									score >= 5.5 && score < 7.5 && "text-warning",
									score < 5.5 && "text-error"
								]}
								style:--value={(score / 9) * 100}
								style:--size="2em"
								aria-valuenow={score}
								role="progressbar">
								{score}
							</div>
							<div class="text-xs">Task {index + 1}</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</aside>
