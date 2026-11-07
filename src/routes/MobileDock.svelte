<script lang="ts">
	import { page } from "$app/state";
	import { resolve } from "$app/paths";
	import type { LayoutProps } from "./$types";

	type NavItem = LayoutProps["data"]["navItems"][number];

	type Props = { items: readonly NavItem[] };
	let { items }: Props = $props();
</script>

<nav class="dock text-primary lg:hidden" aria-label="Main navigation">
	{#each items as item (item.label)}
		{const isActive = $derived(item.href === page.route.id)}
		<a
			class={[isActive && "dock-active"]}
			href={resolve(item.href)}
			aria-current={isActive ? "page" : undefined}>
			<item.icon class="size-5" />
			<span class="dock-label">{item.label}</span>
		</a>
	{/each}
</nav>
