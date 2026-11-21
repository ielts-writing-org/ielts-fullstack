<script lang="ts">
	type Props = {
		name: string;
		class?: string;
	};

	const { name, class: className }: Props = $props();

	const initials = $derived.by(() => {
		if (!name || !name.trim()) return "IW";

		const splitedName = name.trim().split(" ");
		if (splitedName.length === 1) {
			return splitedName[0][0].toUpperCase();
		}
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
