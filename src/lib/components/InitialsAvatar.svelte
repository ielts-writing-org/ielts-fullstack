<script lang="ts">
	type Props = {
		name: string;
		class?: string;
	};

	const { name, class: className }: Props = $props();

	const initials = $derived.by(() => {
		const splitedName = name.split(" ");
		return splitedName[0][0].toUpperCase() + splitedName[splitedName.length - 1][0].toUpperCase();
	});
</script>

<span
	class={[
		"grid aspect-square w-10 shrink-0 place-items-center rounded-full bg-primary font-extrabold text-primary-content ring ring-base-content/20",
		className
	]}
	role="img">
	{initials}
</span>
