<script lang="ts">
	import { resolve } from "$app/paths";
	import { page } from "$app/state";

	const items = [
		{ href: "/(protected)", label: "Dashboard" },
		{ href: "/(protected)/tasks", label: "Tasks" },
		{ href: "/(protected)/history", label: "History" }
	] satisfies {
		href: typeof page.route.id;
		label: string;
	}[];
</script>

<nav
	class="navbar-center justify-center gap-4 text-sm not-lg:order-1 not-lg:w-full lg:flex-1"
	aria-label="Main navigation">
	{#each items as item (item.label)}
		{const isActive = $derived(item.href === page.route.id)}
		<a
			class={[
				"rounded-box px-3 py-1.5 font-semibold",
				isActive
					? "bg-primary text-primary-content"
					: "text-base-content hover:bg-primary-content hover:text-primary"
			]}
			aria-current={isActive ? "page" : undefined}
			href={resolve(item.href)}>
			{item.label}
		</a>
	{/each}
</nav>
