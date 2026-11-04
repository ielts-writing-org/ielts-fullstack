<script lang="ts">
	import type { LayoutProps } from "./$types";
	import { page } from "$app/state";
	import { resolve } from "$app/paths";
	import { refreshAll } from "$app/navigation";
	import { ArrowLeft, Clock, FileText, InfinityIcon, LogOut, Palette } from "@lucide/svelte";
	import { minWordsFor, timeLimitMinutesFor } from "#lib/utils/ielts.js";
	import { taskSubcategoryLabel } from "#lib/domain/task-subcategory.ts";
	import { authClient } from "#lib/auth/auth-client.ts";
	import AppLogo from "#lib/components/AppLogo.svelte";
	import Modal, { openModal } from "#lib/components/Modal.svelte";
	import { resetTheme } from "#lib/components/ThemeController.svelte";
	import { getProfile } from "#lib/remotes/query/get-profile.remote.ts";
	import ChangeBandTarget from "./ChangeBandTarget.svelte";
	import ChangeTheme from "./ChangeTheme.svelte";
	import "./layout.css";

	let { data, children }: LayoutProps = $props();

	const showTabBar = $derived(data.session && data.user && !page.data.practiceSession);

	async function handleSignOut() {
		openModal({
			title: {
				text: "Sign out confirmation",
				color: "error"
			},
			content: "You are about to sign out!",
			primaryButton: {
				text: "Sign out",
				color: "error",
				style: "ghost",
				onclick: async () => {
					const result = await authClient.signOut();
					if (result.error) {
						return openModal({
							title: "Sign out error",
							content: `Cannot sign out: ${result.error.message}`,
							primaryButton: "Close"
						});
					}

					await resetTheme();
					await refreshAll();
				}
			},
			secondaryButton: {
				text: "Cancel",
				color: "primary",
				style: "default"
			},
			bypassBusy: true
		});
	}

	async function handleChangeTarget() {
		openModal({
			title: "Change target band",
			content: {
				component: ChangeBandTarget,
				props: { bandTarget: (await getProfile()).bandTarget ?? 0 }
			}
		});
	}

	function handleChangeTheme() {
		openModal({
			title: "Change theme",
			content: { component: ChangeTheme, props: {} }
		});
	}
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
	]}>
	<header
		class="navbar sticky top-0 z-10 flex shrink-0 gap-2 border-b border-base-content/10 bg-base-100 not-lg:flex-wrap">
		{const session = page.data.practiceSession}
		{#if session}
			<div class="navbar-start min-w-0 gap-2">
				<a
					class="btn btn-circle shrink-0 btn-ghost btn-sm"
					href={resolve("/(protected)")}
					aria-label="Back to dashboard">
					<ArrowLeft class="size-[1em]" />
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
							{session.taskSubcategory
								? taskSubcategoryLabel(session.taskSubcategory)
								: "Uncategorized"}
						</span>
						<span class="badge badge-ghost badge-sm font-medium">
							{#if session.type === "timed"}
								<Clock class="size-[1em]" />
								{timeLimitMinutesFor(session.taskCategory)} min limit
							{:else}
								<InfinityIcon class="size-[1em]" />
								Unlimited time
							{/if}
						</span>
						{const minWords = minWordsFor(session.taskCategory)}
						<span
							class="badge gap-1 badge-ghost badge-sm font-medium"
							title={`A strong answer for this task is at least ${minWords} words`}>
							<FileText class="size-[1em]" />
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

			<!-- Desktop nav -->
			{#if data.session}
				<nav
					class="navbar-center justify-center gap-4 text-sm not-lg:hidden lg:flex-1"
					aria-label="Main navigation">
					{#each data.navItems as item (item.label)}
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
			{/if}
		{/if}

		<!-- User menu -->
		{#if data.session && data.user}
			<div class="navbar-end flex-1 gap-2 overflow-hidden">
				<div class="flex flex-col items-end gap-1 overflow-hidden">
					<div dir="rtl" class="w-full truncate text-left font-semibold">
						{data.user.name}
					</div>

					<button
						class="badge cursor-pointer badge-soft badge-xs font-semibold hover:bg-primary hover:text-primary-content"
						onclick={handleChangeTarget}
						title="Change target">
						Target: Band {(await getProfile()).bandTarget ?? 0}
					</button>
				</div>

				<div class="avatar shrink-0">
					<button
						class="cursor-pointer"
						style="anchor-name: --avatar"
						popovertarget="avatar-popover"
						title="Open Menu">
						<img
							class="w-10 rounded-full ring ring-base-content/20"
							src={data.user.image}
							alt={data.user.name} />
					</button>

					<ul
						class="menu dropdown rounded-box bg-base-100 text-nowrap shadow-sm"
						style="position-anchor: --avatar"
						id="avatar-popover"
						popover="auto">
						<li>
							<button
								class="justify-end active:bg-primary active:text-primary-content"
								onclick={handleChangeTheme}>
								Change theme
								<Palette class="size-[1em]" />
							</button>
						</li>

						<div class="divider mt-2 mb-0 divider-error"></div>

						<li>
							<button
								class="w-full justify-end text-error hover:bg-error hover:text-error-content active:bg-error active:text-error-content"
								onclick={handleSignOut}>
								Sign Out
								<LogOut class="size-[1em]" />
							</button>
						</li>
					</ul>
				</div>
			</div>
		{/if}
	</header>

	{@render children()}
</div>

<!-- Mobile nav -->
{#if showTabBar}
	<nav class="dock text-primary lg:hidden" aria-label="Main navigation">
		{#each data.navItems as item (item.label)}
			{const isActive = $derived(item.href === page.route.id)}
			<a
				class={[isActive && "dock-active"]}
				href={resolve(item.href)}
				aria-current={isActive ? "page" : undefined}>
				<item.icon class="size-5" />
				<span class="dock-label">{item.label}</span>
			</a>
		{/each}
	</nav>
{/if}
