<script lang="ts">
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { navItems } from "./nav-items.ts";
</script>

<nav
	class="navbar-center justify-center gap-4 text-sm not-lg:hidden lg:flex-1"
	aria-label="Main navigation">
	{#each navItems as item (item.label)}
		{const isActive = $derived(item.href === page.route.id)}
		<a
			class={[
				"rounded-box px-3 py-1.5 font-semibold",
				isActive
					? "bg-primary text-primary-content"
					: "text-base-content hover:bg-base-200 hover:text-primary"
			]}
			aria-current={isActive ? "page" : undefined}
			href={resolve(item.href)}>
			<item.icon class="mr-1 inline size-4 align-[-0.125em]" />
			{item.label}
		</a>
	{/each}
</nav>
