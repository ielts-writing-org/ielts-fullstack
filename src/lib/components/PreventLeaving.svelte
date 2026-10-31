<script lang="ts">
	import { beforeNavigate } from "$app/navigation";

	type Props = {
		by: boolean;
	};

	const props: Props = $props();

	beforeNavigate(({ cancel, shallow }) => {
		if (shallow || (props.by && !window.confirm("The application is busy. Leave anyway?"))) {
			cancel();
		}
	});
</script>

<svelte:window on:beforeunload={(e) => props.by && e.preventDefault()} />
