<script lang="ts">
	import { resolve } from "$app/paths";
	import ErrorModal from "$lib/components/error/ErrorModal.svelte";
	import ThemeToggle from "$lib/components/theme/ThemeController.svelte";
	import { ArrowLeft } from "@lucide/svelte";
	import { page } from "$app/state";

	const { children, data } = $props();
</script>

<header class="navbar sticky top-0 z-50 bg-base-200 shadow">
	<div class="navbar-start lg:gap-4">
		<a
			href={resolve("/")}
			class="btn btn-sm not-lg:btn-ghost lg:btn-md"
			aria-label="Back to Dashboard">
			<ArrowLeft size="1em" />
			<span class="hidden md:inline">Dashboard</span>
		</a>
		<div>
			<h2 class="font-semibold">{page.data.pageTitle}</h2>
			<h3 class="hidden text-xs md:block">{page.data.pageSubtitle}</h3>
		</div>
	</div>
	<div class="navbar-center">
		<ThemeToggle class="hidden sm:inline-flex" currentTheme={data.theme} />
		{#if data.session}
			<div class="badge badge-outline badge-sm font-semibold badge-warning sm:hidden">🔥 5</div>
		{/if}
	</div>

	<div class="navbar-end gap-2">
		{#if data.session}
			<div
				class="badge hidden badge-outline badge-sm font-semibold badge-warning sm:inline md:inline-flex">
				🔥 5-Day Streak
			</div>
			<div class="badge badge-soft badge-sm font-semibold sm:inline">Target: 7.5</div>

			<div class="hidden text-sm font-semibold md:inline">{data.user?.name}</div>
			<div class="avatar w-8">
				<img
					class="rounded-full ring ring-base-content/20"
					src={data.user?.image}
					alt={data.user?.name} />
			</div>
		{/if}
	</div>
</header>

{@render children()}

<ErrorModal />
