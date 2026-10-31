<script lang="ts">
	type Props = {
		class?: string;
	};

	const { class: className }: Props = $props();
</script>

<span
	class={[
		"grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary font-extrabold text-primary-content",
		className
	]}>
	IW
</span>
