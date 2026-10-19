<script lang="ts">
	import type { PathnameWithSearchOrHash } from "$app/types";
	import type { RouteIdWithSearchOrHash } from "$app/types";
	import { resolve } from "$app/paths";
	import { Sparkle } from "@lucide/svelte";

	const items = [
		{ active: true, href: "/(protected)", label: "Practice" },
		{ href: "/(protected)", label: "Tasks" },
		{ href: "/(protected)", label: "History" },
		{ highlight: true, href: "/(protected)", label: "AI Tutor" }
	] satisfies {
		active?: boolean;
		highlight?: boolean;
		href: PathnameWithSearchOrHash | RouteIdWithSearchOrHash;
		label: string;
	}[];
</script>

<nav
	class="navbar-center justify-evenly text-sm not-lg:order-1 not-lg:w-full lg:flex-1"
	aria-label="Main navigation">
	{#each items as item (item.label)}
		<a
			class={[
				"rounded-box px-3 py-1.5 font-semibold",
				item.active
					? "bg-primary-content text-primary hover:text-primary"
					: "text-base-content hover:text-primary",
				item.highlight ? "relative hover:text-warning" : ""
			]}
			href={resolve(item.href)}>
			{#if item.highlight}
				<Sparkle class="absolute top-1 right-0.5 text-warning" size="0.875em" />
			{/if}
			{item.label}
		</a>
	{/each}
</nav>
