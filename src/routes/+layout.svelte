<script lang="ts">
	import type { LayoutProps } from "./$types";
	import { page } from "$app/state";
	import Modal from "#lib/components/Modal.svelte";
	import BrandHeader from "./BrandHeader.svelte";
	import MainNav from "./MainNav.svelte";
	import MobileDock from "./MobileDock.svelte";
	import PracticeHeader from "./PracticeHeader.svelte";
	import UserMenu from "./UserMenu.svelte";
	import "./layout.css";

	let { data, children }: LayoutProps = $props();

	const inPracticeSession = $derived(Boolean(page.data.metadata));
	const showTabBar = $derived(data.session && data.user && !page.data.metadata);
</script>

<Modal />

<a
	class="btn sr-only btn-primary btn-sm focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
	href="#main-content">
	Skip to main content
</a>

<div
	class={[
		"flex h-dvh w-full flex-col bg-base-100 text-base-content",
		showTabBar && "not-lg:pb-16"
	]}>
	<header
		class="navbar sticky top-0 z-10 flex shrink-0 gap-2 border-b border-base-content/10 bg-base-100 not-lg:flex-wrap">
		{#if inPracticeSession}
			<PracticeHeader />
		{:else}
			<BrandHeader />

			<!-- Desktop nav -->
			{#if data.session}
				<MainNav items={data.navItems} />
			{/if}
		{/if}

		<!-- User menu -->
		{#if data.session && data.user}
			<UserMenu user={data.user} />
		{/if}
	</header>

	{@render children()}
</div>

<!-- Mobile nav -->
{#if showTabBar}
	<MobileDock items={data.navItems} />
{/if}
