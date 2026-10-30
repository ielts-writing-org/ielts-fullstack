<script lang="ts">
	import type { SerializedZodError } from "#lib/utils/error.ts";

	type Props = {
		errors: SerializedZodError[];
	};

	const props: Props = $props();
</script>

<ol class="list-inside list-decimal">
	{#each props.errors as error, i (i)}
		<li>
			<span class="font-semibold">{error.field}:</span>
			{error.message}
		</li>
	{/each}
</ol>
