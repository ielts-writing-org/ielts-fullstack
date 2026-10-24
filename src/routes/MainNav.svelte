<script lang="ts">
	import type { PathnameWithSearchOrHash } from "$app/types";
	import type { RouteIdWithSearchOrHash } from "$app/types";
	import { resolve } from "$app/paths";

	const items = [
		{ active: true, href: "/(protected)", label: "Practice" },
		{ href: "/(protected)", label: "Tasks" },
		{ href: "/(protected)", label: "History" }
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
					: "text-base-content hover:text-primary"
			]}
			href={resolve(item.href)}>
			{item.label}
		</a>
	{/each}
</nav>
