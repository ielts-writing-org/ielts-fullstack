<script lang="ts">
	import { Target } from "@lucide/svelte";
	import { roundToNearestHalf } from "#lib/utils/math.ts";
	import { getBandTone, convertBandToProgressValue } from "#lib/utils/ielts.ts";
	import BandTarget from "./BandTarget.svelte";
	import BandTrend from "./BandTrend.svelte";
	import CriteriaBreakdown from "./CriteriaBreakdown.svelte";

	type Props = {
		statistics: {
			criteria: {
				name: string;
				task1: number;
				task2: number;
			}[];
			estimatedBand: number;
		};
		bandTarget: number;
		/** Overall bands of the most recent evaluated sessions, oldest first. */
		trend: number[];
		evaluatedCount: number;
	};
	let { statistics, bandTarget, trend, evaluatedCount }: Props = $props();

	const overall = $derived(roundToNearestHalf(statistics.estimatedBand));
	const hasEvaluations = $derived(evaluatedCount > 0);
</script>

<aside
	class="flex flex-col gap-3 overflow-hidden rounded-box border border-base-content/20 bg-base-100 p-4 hover:border-primary"
	aria-label="Progress">
	<div>
		<h2 class="font-semibold">Progress</h2>
		<p class="text-xs whitespace-nowrap text-base-content/75">
			Average band across evaluated sessions
		</p>
	</div>

	{#if !hasEvaluations}
		<div
			class="flex flex-1 flex-col items-center justify-center gap-2 rounded-box border border-dashed border-base-content/20 py-8 text-center text-base-content/75">
			<Target class="size-8 opacity-60" />
			<p class="text-sm font-semibold">No evaluations yet</p>
			<p class="max-w-60 text-xs">
				Write a response and run Evaluate to unlock your band breakdown and track your progress.
			</p>
		</div>
	{:else}
		<div class="flex items-center gap-4">
			<div class="flex flex-col items-center">
				<div
					class={["radial-progress font-bold", getBandTone(overall)]}
					style:--value={convertBandToProgressValue(overall)}
					style:--size="4.75em"
					role="progressbar"
					aria-label="Overall average band"
					aria-valuenow={overall}
					aria-valuemin={0}
					aria-valuemax={9}>
					{overall.toFixed(1)}
				</div>
				<span class="mt-1 text-xs text-base-content/75">Overall</span>
			</div>

			<div class="flex min-w-0 flex-1 flex-col gap-2">
				<BandTarget {bandTarget} {overall} />
				<BandTrend {trend} />
			</div>
		</div>

		<CriteriaBreakdown criteria={statistics.criteria} />
	{/if}
</aside>
