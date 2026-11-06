<script lang="ts">
	import { TrendingUp } from "@lucide/svelte";
	import type { TrendPoint } from "./utils.ts";

	type Props = { trend: TrendPoint[]; bandTarget: number };
	let { trend, bandTarget }: Props = $props();

	/** Percent positions (0-100) for the trend chart dots and line. */
	const trendPoints = $derived.by(() => {
		if (trend.length === 0) {
			return [];
		}

		const stepX = trend.length > 1 ? 94 / (trend.length - 1) : 0;
		return trend.map((point, i) => ({
			x: 3 + i * stepX,
			y: 94 - (Math.max(0, Math.min(9, point.band)) / 9) * 88,
			band: point.band,
			date: point.date
		}));
	});

	const trendLinePath = $derived(
		trendPoints
			.map((point, i) => `${i === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
			.join(" ")
	);

	const trendAreaPath = $derived(
		trendPoints.length > 1
			? `${trendLinePath} L${trendPoints[trendPoints.length - 1].x.toFixed(2)} 94 L${trendPoints[0].x.toFixed(2)} 94 Z`
			: ""
	);
</script>

{#if trendPoints.length > 1}
	<section
		class="mt-4 rounded-box border border-base-content/20 bg-base-100 p-3.5"
		aria-label="Progress over time">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<div class="flex items-center gap-2">
				<TrendingUp class="size-4 shrink-0 text-primary" />
				<h2 class="text-sm font-semibold">Progress over time</h2>
			</div>
			<span class="text-xs text-base-content/75">
				Estimated band of your last {trend.length} evaluated sessions
			</span>
		</div>

		<div class="relative mt-3 h-40">
			<span class="absolute top-0 right-0 text-[10px] text-base-content/50 tabular-nums">9</span>
			<span class="absolute right-0 bottom-0 text-[10px] text-base-content/50 tabular-nums">0</span>

			{#if bandTarget > 0}
				<div
					class="absolute inset-x-0 flex items-center"
					style:top={`${(94 - (Math.min(9, bandTarget) / 9) * 88).toFixed(2)}%`}>
					<span class="h-px flex-1 border-t border-dashed border-warning"></span>
					<span class="ms-1 text-[10px] font-semibold whitespace-nowrap text-warning">
						Target {bandTarget}
					</span>
				</div>
			{/if}

			<svg
				class="absolute inset-0 h-full w-full text-primary"
				viewBox="0 0 100 100"
				preserveAspectRatio="none"
				role="img"
				aria-label="Line chart of estimated band scores across your last {trend.length} evaluated sessions">
				{#if trendAreaPath}
					<path d={trendAreaPath} class="fill-primary/10" stroke="none" />
				{/if}
				<path
					d={trendLinePath}
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					vector-effect="non-scaling-stroke" />
			</svg>

			{#each trendPoints as point, i (i)}
				<span
					class="tooltip absolute tooltip-top size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-base-100 bg-primary"
					data-tip={`Band ${point.band.toFixed(1)} · ${point.date.toLocaleDateString()}`}
					style:left={`${point.x.toFixed(2)}%`}
					style:top={`${point.y.toFixed(2)}%`}>
				</span>
			{/each}
		</div>
	</section>
{/if}
