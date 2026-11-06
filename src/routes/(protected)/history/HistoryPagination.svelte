<script lang="ts">
	import { goto } from "$app/navigation";
	import { buildHref, historyHref, pageWindow, type HistoryFiltersData } from "./utils.ts";

	type Props = { filters: HistoryFiltersData; page: number; totalPages: number };
	let { filters, page, totalPages }: Props = $props();

	function goToPage(next: number) {
		goto(historyHref + buildHref(filters, page, { page: String(next) }), { reset: false });
	}
</script>

<nav
	class="mt-4 flex flex-wrap items-center justify-between gap-2"
	aria-label="Practice history pagination">
	<span class="text-xs text-base-content/75">
		Page {page} of {totalPages}
	</span>

	<div class="join">
		<button
			class="btn join-item btn-sm"
			disabled={page === 1}
			aria-label="Previous page"
			onclick={() => goToPage(page - 1)}>
			Prev
		</button>
		{#each pageWindow(page, totalPages) as pageNumber, i (i)}
			{#if pageNumber === null}
				<span class="btn btn-disabled join-item border-base-content/20 bg-base-100 btn-sm">
					...
				</span>
			{:else}
				<button
					class="btn join-item btn-sm"
					class:btn-active={page === pageNumber}
					aria-current={page === pageNumber ? "page" : undefined}
					onclick={() => goToPage(pageNumber)}>
					{pageNumber}
				</button>
			{/if}
		{/each}
		<button
			class="btn join-item btn-sm"
			disabled={page === totalPages}
			aria-label="Next page"
			onclick={() => goToPage(page + 1)}>
			Next
		</button>
	</div>
</nav>
