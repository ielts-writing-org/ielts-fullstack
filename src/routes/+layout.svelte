<script lang="ts">
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import AppLogo from "#lib/components/AppLogo.svelte";
	import Modal from "#lib/components/Modal.svelte";
	import MainNav from "./MainNav.svelte";
	import UserMenu from "./UserMenu.svelte";
	import "./layout.css";

	let { children, data } = $props();

	const isPracticePage = $derived(
		page.route.id === "/(protected)/practice/[practiceSessionId=practiceSessionId]"
	);
</script>

<Modal />
<div class="flex h-screen w-full flex-col overflow-y-auto bg-base-100 text-base-content">
	<header
		class="navbar sticky top-0 z-10 flex shrink-0 gap-2 border-b border-base-content/10 bg-base-100 not-lg:flex-wrap">
		{#if isPracticePage}
			<div class="navbar-start gap-2">
				<AppLogo />
				<div class="flex-1 overflow-hidden">
					<h2 class="block overflow-hidden text-lg font-bold text-ellipsis text-primary">
						{page.data.pageName}
					</h2>
					<h3 class="text-xs">{page.data.pageDescription}</h3>
				</div>
			</div>
		{:else}
			<div class="navbar-start flex-1 items-center">
				<a
					class="flex items-center gap-2"
					href={resolve("/(protected)")}
					aria-label="IELTS Writing Practice Platform Home">
					<AppLogo />
					<div class="flex flex-col">
						<h1 class="leading-6 font-semibold text-primary sm:text-lg">
							IELTS Writing Practice Platform
						</h1>
						<h2 class="hidden text-base-content/75 sm:text-xs">with IELTS Academic AI Tutor</h2>
					</div>
				</a>
			</div>

			{#if data.session}
				<MainNav />
			{/if}
		{/if}

		{#if data.session && data.user && data.profile}
			<div class="navbar-end flex-1 gap-2 overflow-hidden">
				<UserMenu user={data.user} profile={data.profile} />
			</div>
		{/if}
	</header>

	{@render children()}
</div>
