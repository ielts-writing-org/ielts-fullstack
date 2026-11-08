<script lang="ts">
	import { beforeNavigate } from "$app/navigation";

	type Props = {
		canLeave: boolean;
	};

	const props: Props = $props();

	beforeNavigate(({ cancel, shallow }) => {
		if (shallow || (!props.canLeave && !window.confirm("The application is busy. Leave anyway?"))) {
			cancel();
		}
	});
</script>

<svelte:window on:beforeunload={(e) => !props.canLeave && e.preventDefault()} />
