<script lang="ts">
	import { Minus, TrendingDown, TrendingUp } from "@lucide/svelte";

	type Props = {
		/** Overall bands of the most recent evaluated sessions, oldest first. */
		trend: number[];
	};
	let { trend }: Props = $props();

	const trendSummary = $derived.by(() => {
		if (trend.length < 2) {
			return null;
		}

		const half = Math.floor(trend.length / 2);
		const older = trend.slice(0, half).reduce((sum, band) => sum + band, 0) / half;
		const recent = trend.slice(half).reduce((sum, band) => sum + band, 0) / (trend.length - half);
		const difference = recent - older;

		if (difference >= 0.25) {
			return { icon: TrendingUp, label: "Improving", tone: "text-success" };
		}
		if (difference <= -0.25) {
			return { icon: TrendingDown, label: "Declining", tone: "text-error" };
		}
		return { icon: Minus, label: "Steady", tone: "text-base-content/75" };
	});

	const trendPath = $derived.by(() => {
		if (trend.length < 2) {
			return "";
		}

		const stepX = 96 / (trend.length - 1);
		return trend
			.map((band, i) => {
				const x = 2 + i * stepX;
				const clamped = Math.max(0, Math.min(9, band));
				const y = 26 - (clamped / 9) * 22;
				return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
			})
			.join(" ");
	});
</script>

{#if trendSummary}
	<div class="mt-0.5 border-t border-base-content/10 pt-2">
		<div class="flex items-center gap-1.5 text-xs">
			<trendSummary.icon class={["size-3.5 shrink-0", trendSummary.tone]} />
			<span class="font-semibold">{trendSummary.label}</span>
			<span class="text-base-content/75">· last {trend.length} evaluations</span>
		</div>
		<svg
			class="mt-1 h-7 w-full text-primary"
			viewBox="0 0 100 28"
			preserveAspectRatio="none"
			role="img"
			aria-label="Band scores of your last {trend.length} evaluations, oldest to newest">
			<path
				d={trendPath}
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				vector-effect="non-scaling-stroke" />
		</svg>
	</div>
{/if}
