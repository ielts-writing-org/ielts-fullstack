<script lang="ts">
	import { resolve } from "$app/paths";
	import { ChevronRight, RotateCcwClock } from "@lucide/svelte";

	type Props = {
		practiceSessions: {
			band: number | null | undefined;
			category: string;
			id: string;
			meta: string;
			name: string;
		}[];
	};

	const { practiceSessions }: Props = $props();
</script>

<div class="rounded-box border border-base-content/20 bg-base-100 p-3.5 hover:border-primary">
	<div class="mb-2.5 flex items-center justify-between">
		<h2 class="text-sm font-semibold">Recent Practice Sessions</h2>
		<a
			class="flex items-center text-xs font-semibold text-primary"
			href={resolve("/(protected)/history")}>
			View complete history <ChevronRight size={14} />
		</a>
	</div>
	{#if practiceSessions.length === 0}
		<div class="flex flex-col items-center justify-center gap-2 py-6 text-base-content/75">
			<RotateCcwClock size="2em" />
			<p class="text-xs">No practice sessions yet.</p>
		</div>
	{:else}
		{#each practiceSessions as practiceSession (practiceSession.id)}
			<a
				class="mt-1.5 grid min-h-7.5 cursor-pointer grid-cols-[45px_minmax(0,1fr)_120px] items-center gap-1.5 rounded-box border border-primary-content px-2.5 text-xs hover:bg-primary hover:text-primary-content sm:grid-cols-[45px_minmax(170px,1fr)_150px_120px]"
				href={resolve("/(protected)/practice/[practiceSessionId=practiceSessionId]", {
					practiceSessionId: practiceSession.id
				})}>
				<span class="badge rounded-box badge-soft badge-xs badge-primary">
					{practiceSession.category}
				</span>
				<span class="truncate font-semibold">{practiceSession.name}</span>
				<small class="hidden text-xs sm:block">{practiceSession.meta}</small>
				<span class="text-right text-xs">
					{practiceSession.band
						? `Overall band ${practiceSession.band.toFixed(1)}`
						: "No evaluation"}
				</span>
			</a>
		{/each}
	{/if}
</div>
