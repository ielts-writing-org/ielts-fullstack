<script lang="ts">
	import { ChartPie, CircleDashed, FileText, PenLine } from "@lucide/svelte";
	import type { PageData } from "./$types";

	type Stats = PageData["stats"];

	type Props = { stats: Stats };
	let { stats }: Props = $props();

	const cards = $derived([
		{
			icon: FileText,
			label: "Total tasks",
			value: String(stats.total),
			hint: "Your own tasks only"
		},
		{ icon: ChartPie, label: "Task 1", value: String(stats.task1), hint: "Visual reports" },
		{ icon: PenLine, label: "Task 2", value: String(stats.task2), hint: "Essays" },
		{
			icon: CircleDashed,
			label: "Never practiced",
			value: String(stats.unused),
			hint: "Tasks without a session yet"
		}
	]);
</script>

<section class="mt-4 flex flex-wrap gap-3" aria-label="Task summary">
	{#each cards as card (card.label)}
		<div
			class={[
				"flex basis-[48%] flex-col rounded-box border border-base-content/20 bg-base-100 p-3",
				"hover:border-primary",
				"xl:flex-1"
			]}>
			<div class="flex flex-1 items-center justify-between gap-2">
				<span class="text-xs font-semibold text-base-content/75">{card.label}</span>
				<card.icon class="shrink-0 opacity-75" size="1em" />
			</div>
			<div class="mt-1.5 text-2xl font-bold">{card.value}</div>
			<p class="text-xs text-base-content/75">{card.hint}</p>
		</div>
	{/each}
</section>
