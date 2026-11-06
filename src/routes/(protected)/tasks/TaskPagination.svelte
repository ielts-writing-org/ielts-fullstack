<script lang="ts">
	import { goto } from "$app/navigation";
	import { buildQuery, tasksHref, type TaskFiltersData } from "./links.ts";

	type Props = { filters: TaskFiltersData; page: number; totalPages: number };
	let { filters, page, totalPages }: Props = $props();

	function goToPage(next: number) {
		goto(tasksHref + buildQuery(filters, page, { page: String(next) }), { reset: false });
	}
</script>

<nav class="mt-4 flex flex-wrap items-center justify-between gap-2" aria-label="Task library pagination">
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
		{#each Array.from({ length: totalPages }, (_, i) => i + 1) as pageNumber (pageNumber)}
			<button
				class="btn join-item btn-sm"
				class:btn-active={page === pageNumber}
				aria-current={page === pageNumber ? "page" : undefined}
				onclick={() => goToPage(pageNumber)}>
				{pageNumber}
			</button>
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
