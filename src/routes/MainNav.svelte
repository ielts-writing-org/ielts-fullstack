<script lang="ts">
	import { page } from "$app/state";
	import { resolve } from "$app/paths";
	import type { LayoutProps } from "./$types";

	type NavItem = LayoutProps["data"]["navItems"][number];

	type Props = { items: readonly NavItem[] };
	let { items }: Props = $props();
</script>

<nav
	class="navbar-center justify-center gap-4 text-sm not-lg:hidden lg:flex-1"
	aria-label="Main navigation">
	{#each items as item (item.label)}
		{const isActive = $derived(item.href === page.route.id)}
		<a
			class={[
				"rounded-box px-3 py-1.5 font-semibold",
				isActive
					? "bg-primary text-primary-content"
					: "text-base-content hover:bg-base-200 hover:text-primary"
			]}
			href={resolve(item.href)}
			aria-current={isActive ? "page" : undefined}>
			<item.icon class="mr-1 inline size-4 align-[-0.2em]" />
			{item.label}
		</a>
	{/each}
</nav>
