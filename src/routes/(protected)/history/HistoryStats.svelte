<script lang="ts">
	import type { Component } from "svelte";
	import { CircleCheck, FileText, PenLine, PieChart } from "@lucide/svelte";
	import { roundToNearestHalf } from "#lib/utils/math.ts";
	import { type HistoryStats } from "./utils.ts";
	import { getBandTone } from "#lib/utils/ielts.ts";

	type Props = { stats: HistoryStats };
	let { stats }: Props = $props();
</script>

<section class="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Practice summary">
	{@render statTile({
		icon: FileText,
		label: "Total sessions",
		value: String(stats.total),
		hint: "All time"
	})}
	{@render statTile({
		icon: CircleCheck,
		label: "Evaluated",
		value: String(stats.evaluated),
		hint: `${stats.total - stats.evaluated} awaiting evaluation`
	})}
	{@render bandStatTile({
		icon: PieChart,
		label: "Task 1 bands",
		evaluated: stats.task1.evaluated,
		average: stats.task1.average,
		best: stats.task1.best
	})}
	{@render bandStatTile({
		icon: PenLine,
		label: "Task 2 bands",
		evaluated: stats.task2.evaluated,
		average: stats.task2.average,
		best: stats.task2.best
	})}
</section>

{#snippet statTile(props: { icon: Component; label: string; value: string; hint?: string })}
	<div class="flex flex-col rounded-box border border-base-content/20 bg-base-100 p-3">
		<div class="flex flex-1 items-center justify-between gap-2">
			<span class="text-xs font-semibold text-base-content/75">{props.label}</span>
			<props.icon class="size-4 shrink-0 opacity-60" />
		</div>
		<div class="mt-1.5 text-2xl font-bold">{props.value}</div>
		{#if props.hint}
			<p class="text-xs text-base-content/75">{props.hint}</p>
		{/if}
	</div>
{/snippet}

{#snippet bandStatTile(props: {
	icon: Component;
	label: string;
	evaluated: number;
	average: number;
	best: number;
})}
	<div class="flex flex-col rounded-box border border-base-content/20 bg-base-100 p-3">
		<div class="flex flex-1 items-center justify-between gap-2">
			<span class="text-xs font-semibold text-base-content/75">{props.label}</span>
			<props.icon class="size-4 shrink-0 opacity-60" />
		</div>
		<div class="mt-1.5 text-2xl font-bold">
			{#if props.evaluated > 0}
				<span class={getBandTone(props.best)}>{props.best.toFixed(1)}</span>
			{:else}
				–
			{/if}
		</div>
		<p class="text-xs text-base-content/75">
			{#if props.evaluated > 0}
				Average {roundToNearestHalf(props.average).toFixed(1)} · {props.evaluated}
				{props.evaluated === 1 ? "session" : "sessions"}
			{:else}
				No evaluated sessions yet
			{/if}
		</p>
	</div>
{/snippet}
