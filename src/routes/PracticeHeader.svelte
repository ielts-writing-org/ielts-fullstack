<script lang="ts">
	import { page } from "$app/state";
	import { resolve } from "$app/paths";
	import { ArrowLeft } from "@lucide/svelte";
	import { getTaskSubcategoryLabel } from "#lib/domain/task-subcategory.ts";

	const session = $derived(page.data.metadata);
</script>

<div class="navbar-start min-w-0 gap-2">
	<a
		class="btn btn-circle shrink-0 btn-ghost btn-sm"
		href={resolve("/(protected)")}
		aria-label="Back to dashboard">
		<ArrowLeft class="size-[1em]" />
	</a>
	<div class="min-w-0 flex-1 overflow-hidden">
		<h1 class="block truncate text-lg font-bold text-primary">
			{page.data.title}
		</h1>
		<h2 class="flex flex-nowrap gap-1 overflow-x-auto text-xs font-semibold text-base-content/75">
			<span class="badge badge-soft badge-xs badge-primary">
				Task {session?.taskCategory}
			</span>
			<span class="badge badge-ghost badge-xs font-medium">
				{session?.taskSubcategory
					? getTaskSubcategoryLabel(session.taskSubcategory)
					: "Uncategorized"}
			</span>
		</h2>
	</div>
</div>
