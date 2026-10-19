<script lang="ts">
	import { resolve } from "$app/paths";

	type Props = {
		criteria: {
			bar: string;
			direction: string;
			name: string;
			note: string;
			score: string;
			scoreColor: string;
		}[];
	};

	const { criteria }: Props = $props();
</script>

<aside
	class="flex flex-col gap-2 overflow-hidden rounded-box border border-base-content/20 bg-base-100 p-4 hover:border-primary">
	<div class="mb-2 flex justify-between">
		<div>
			<h2 class="font-semibold">Evaluation Result</h2>
			<p class="text-xs whitespace-nowrap text-base-content/75">
				IELTS assessment criteria breakdown across past sessions
			</p>
		</div>
		<span class="badge badge-soft badge-sm whitespace-nowrap badge-primary">
			AI Estimated Band: 6.5
		</span>
	</div>
	{#each criteria as criterion (criterion.name)}
		<div class="flex flex-col gap-1">
			<div class="flex justify-between text-sm">
				<a class="font-semibold" href={resolve("/(protected)")}>
					{criterion.name}
				</a>
				<b class={criterion.scoreColor}>{criterion.score}</b>
			</div>
			<!-- TODO: Migrate to progress tag -->
			<div class="flex flex-col gap-1">
				<div class="h-1.25 overflow-hidden rounded bg-base-100">
					<span class={`block h-full rounded ${criterion.bar}`}></span>
				</div>
				<small class="text-xs text-base-content/75">{criterion.note}</small>
			</div>
		</div>
	{/each}
</aside>
