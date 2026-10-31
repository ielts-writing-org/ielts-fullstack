<script lang="ts">
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { ArrowLeft, Clock, FileText, InfinityIcon } from "@lucide/svelte";
	import { minWordsFor, timeLimitMinutesFor } from "#lib/utils/ielts.js";
	import { taskSubcategoryLabel } from "#lib/mappings/task-subcategory.ts";
	import AppLogo from "#lib/components/AppLogo.svelte";
	import Modal from "#lib/components/Modal.svelte";
	import MainNav from "./MainNav.svelte";
	import TabNav from "./TabNav.svelte";
	import UserMenu from "./UserMenu.svelte";
	import "./layout.css";

	let { children, data } = $props();

	// Measured so mobile sticky elements (e.g. the practice toolbar) can sit
	// directly under the header, whose height varies with wrapped rows.
	let headerHeight = $state(0);

	// The mobile tab bar mirrors the desktop nav and stays out of practice
	// sessions, which are focus mode.
	const showTabBar = $derived(
		Boolean(data.session && data.user && data.profile) && !page.data.practiceSession
	);
</script>

<Modal />

<a
	class="btn sr-only btn-primary btn-sm focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
	href="#main-content">
	Skip to main content
</a>

<div
	class={[
		"flex h-dvh w-full flex-col overflow-y-auto bg-base-100 text-base-content",
		showTabBar && "not-lg:pb-16"
	]}
	style:--app-header-height={`${headerHeight}px`}>
	<header
		bind:clientHeight={headerHeight}
		class="navbar sticky top-0 z-10 flex shrink-0 gap-2 border-b border-base-content/10 bg-base-100 not-lg:flex-wrap">
		{#if page.data.practiceSession}
			{const session = page.data.practiceSession}
			<div class="navbar-start min-w-0 gap-2">
				<a
					class="btn btn-circle shrink-0 btn-ghost btn-sm"
					href={resolve("/(protected)")}
					aria-label="Back to dashboard">
					<ArrowLeft class="size-5" />
				</a>
				<div class="min-w-0 flex-1 overflow-hidden">
					<h1 class="block truncate text-lg font-bold text-primary">
						{page.data.title}
					</h1>
					<h2 class="flex flex-nowrap overflow-x-auto text-xs font-semibold text-base-content/75">
						<span class="badge badge-soft badge-sm badge-primary">
							Task {session.taskCategory}
						</span>
						<span class="badge badge-ghost badge-sm font-medium">
							{session.taskSubcategory ? taskSubcategoryLabel(session.taskSubcategory) : "Uncategorized"}
						</span>
						<span class="badge badge-ghost badge-sm font-medium">
							{#if session.type === "timed"}
								<Clock class="size-4" />
								{timeLimitMinutesFor(session.taskCategory)} min limit
							{:else}
								<InfinityIcon class="size-4" />
								Unlimited time
							{/if}
						</span>
						{const minWords = minWordsFor(session.taskCategory)}
						<span
							class="badge gap-1 badge-ghost badge-sm font-medium"
							title={`A strong answer for this task is at least ${minWords} words`}>
							<FileText class="size-4" />
							Min {minWords} words
						</span>
					</h2>
				</div>
			</div>
		{:else}
			<div class="navbar-start flex-1 items-center">
				<a class="flex items-center gap-2" href={resolve("/(protected)")} aria-label="Dashboard">
					<AppLogo />
					<div class="flex flex-col">
						<h1 class="leading-6 font-bold text-primary sm:text-lg">
							IELTS Writing Practice Platform
						</h1>
						<h2 class="hidden text-xs font-semibold text-base-content/75 sm:inline">
							with IELTS Academic AI Tutor
						</h2>
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

{#if showTabBar}
	<TabNav />
{/if}
