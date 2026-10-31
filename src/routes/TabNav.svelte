<script lang="ts">
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { navItems } from "./nav-items.ts";
</script>

<nav
	class="fixed inset-x-0 bottom-0 z-10 border-t border-base-content/10 bg-base-100 pb-[env(safe-area-inset-bottom)] lg:hidden"
	aria-label="Main navigation">
	<div class="mx-auto flex max-w-lg items-stretch">
		{#each navItems as item (item.label)}
			{@const isActive = item.href === page.route.id}
			<a
				class={[
					"flex flex-1 flex-col items-center gap-1 px-2 py-2 text-xs font-semibold transition-colors",
					isActive ? "text-primary" : "text-base-content/75 hover:text-primary"
				]}
				aria-current={isActive ? "page" : undefined}
				href={resolve(item.href)}>
				<item.icon class="size-5" />
				{item.label}
			</a>
		{/each}
	</div>
</nav>
