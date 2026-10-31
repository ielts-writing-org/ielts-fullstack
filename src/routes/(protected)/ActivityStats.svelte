<script lang="ts">
	import type { Component } from "svelte";
	import { CalendarDays, Flame, NotebookText, PenLine } from "@lucide/svelte";

	type Props = {
		activity: {
			totalWords: number;
			sessionsThisWeek: number;
			totalSessions: number;
			evaluated: number;
		};
		streakDays: number;
	};

	const { activity, streakDays }: Props = $props();

	const isNewUser = $derived(activity.totalSessions === 0);
</script>

<!-- Quiet stat band: borderless tiles so the bordered practice/progress cards
	stay the visual anchors of the page. -->
<section class="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Practice activity">
	{@render statTile({
		icon: PenLine,
		label: "Words written",
		value: activity.totalWords.toLocaleString("en-US"),
		hint: "Across all sessions"
	})}
	{@render statTile({
		icon: CalendarDays,
		label: "Sessions this week",
		value: String(activity.sessionsThisWeek),
		hint: "Past 7 days"
	})}
	{@render statTile({
		icon: Flame,
		label: "Day streak",
		value: String(streakDays),
		hint: isNewUser
			? "Practice today to start one"
			: streakDays > 0
				? "Consecutive practice days"
				: "Practice today to extend it",
		highlight: streakDays > 0
	})}
	{@render statTile({
		icon: NotebookText,
		label: "Total sessions",
		value: String(activity.totalSessions),
		hint: "All time"
	})}
</section>

{#snippet statTile(props: {
	icon: Component;
	label: string;
	value: string;
	hint?: string;
	highlight?: boolean;
})}
	<div class="flex flex-col rounded-box bg-base-200/40 p-3.5">
		<div class="flex flex-1 items-center justify-between gap-2">
			<span class="text-xs font-semibold text-base-content/75">{props.label}</span>
			<props.icon class={["size-4 shrink-0", props.highlight ? "text-warning" : "opacity-60"]} />
		</div>
		<div class={["mt-1.5 text-2xl font-bold", props.highlight && "text-warning"]}>
			{props.value}
		</div>
		{#if props.hint}
			<p class="text-xs text-base-content/75">{props.hint}</p>
		{/if}
	</div>
{/snippet}
