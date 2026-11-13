<script lang="ts">
	type Props = {
		status: string;
		statusCode: number;
		errorMessage: string | undefined;
		errorCode: string | undefined;
	};

	const props: Props = $props();
</script>

<p class="mt-4 font-semibold">
	{props.errorMessage ?? "There was an unexpected error while signing you in"}
</p>
<p class="mt-4 text-xs text-base-content/75">
	{#if props.errorCode}
		<span class="font-semibold">Error Code:</span>
		{props.errorCode}
		<br />
	{/if}
	<span class="font-semibold">Status:</span>
	{props.statusCode} - {props.status}
</p>
