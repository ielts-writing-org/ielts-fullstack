<script lang="ts">
	import { authClient } from "#lib/auth/auth-client.ts";
	// import ThemeToggle from "#lib/components/theme/ThemeController.svelte";
	import Modal, { openModal } from "#lib/components/modal/Modal.svelte";
	import ThemeController from "#lib/components/theme/ThemeController.svelte";
	import { refreshAll } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { LogOut, Palette, Sparkle, Undo2 } from "@lucide/svelte";
	import "./layout.css";

	let { children, data } = $props();

	const handleSignOut = async () => {
		const result = await authClient.signOut();
		if (result.data?.success) {
			await refreshAll();
		}
	};
</script>

<div class="flex h-screen w-full flex-col bg-base-100 text-base-content">
	<header
		class="navbar sticky top-0 z-10 flex shrink-0 gap-2 border-b border-base-content/10 bg-base-100 not-lg:flex-wrap">
		<!-- In pratice -->
		{#if page.route.id === "/(protected)/practice/[taskId=taskId]"}
			<div class="navbar-start gap-2">
				{@render logo()}
				<div class="flex-1 overflow-hidden">
					<!-- TODO: Feat change practice title -->
					<h2 class="block overflow-hidden text-lg font-bold text-ellipsis text-primary">
						{page.data.pageTitle}
					</h2>
					<h3 class="text-xs">{page.data.pageSubtitle}</h3>
				</div>
			</div>
		{:else}
			<!-- Not in practice -->
			<div class="navbar-start items-center sm:flex-1">
				<a
					class="flex items-center gap-2"
					href={resolve("/(public)")}
					aria-label="IELTS Writing Practice Platform Home">
					{@render logo()}
					<div class="flex flex-col">
						<h1 class="text-lg leading-6 font-semibold">IELTS Writing Practice Platform</h1>
						<h2 class="hidden text-xs text-base-content/75 sm:inline">
							with IELTS Academic AI Tutor
						</h2>
					</div>
				</a>
			</div>

			<!-- Only show nav bar if user signed in -->
			{#if data.session}
				<nav
					class="navbar-center justify-evenly text-sm not-lg:order-1 not-lg:w-full lg:flex-1"
					aria-label="Main navigation">
					<a
						class="rounded-box bg-primary-content px-3 py-1.5 font-semibold text-primary hover:text-primary"
						href={resolve("/(public)")}>
						Practice
					</a>
					<a
						class="rounded-box px-3 py-1.5 font-semibold text-base-content hover:text-primary"
						href={resolve("/(public)")}>
						Tasks
					</a>
					<a
						class=" rounded-box px-3 py-1.5 font-semibold text-base-content hover:text-primary"
						href={resolve("/(public)")}>
						History
					</a>
					<a
						class="relative rounded-box px-3 py-1.5 font-semibold text-base-content hover:text-warning"
						href={resolve("/(public)")}>
						<Sparkle class="absolute top-1 right-0.5 text-warning" size="0.875em" />
						AI Tutor
					</a>
				</nav>
			{/if}
		{/if}

		<!-- User info -->
		<div class="navbar-end flex-1 gap-2 overflow-hidden">
			{#if data.session}
				<!-- <a
					class="badge hidden badge-outline badge-sm font-semibold badge-warning sm:inline-flex"
					href={resolve("/(public)")}>
					🔥 5-Day Streak
				</a> -->
				<div class="flex flex-col items-end gap-1 overflow-hidden">
					<div
						dir="rtl"
						class="w-full overflow-hidden text-left font-semibold text-nowrap text-ellipsis">
						{data.session.user.name}
					</div>
					<a
						class="badge badge-soft badge-xs font-semibold"
						href={resolve("/(public)")}
						title="Change target">
						Target: Band 7.5
					</a>
				</div>
				<div class="avatar shrink-0">
					<button
						class="cursor-pointer"
						popovertarget="avatar-popover"
						style="anchor-name:--avatar">
						<img
							class="w-10 rounded-full ring ring-base-content/20"
							src={data.session.user.image}
							alt={data.session.user.name} />
					</button>
					<ul
						class="menu dropdown rounded-box bg-base-100 text-nowrap shadow-sm"
						popover="auto"
						id="avatar-popover"
						style="position-anchor:--avatar">
						<li>
							<button
								class="justify-end active:bg-primary active:text-primary-content"
								onclick={() =>
									openModal({
										title: "Change theme",
										content: "Select an available theme below:",
										children: theme,
										primaryButton: { text: "Close" }
									})}>
								Change theme
								<Palette size="1em" />
							</button>
						</li>
						<!-- Show button if not dashboard -->
						{#if page.route.id !== "/(public)"}
							<li>
								<a
									class="justify-end active:bg-primary active:text-primary-content"
									href={resolve("/(public)")}>
									Back to Dashboard
									<Undo2 size="1em" />
								</a>
							</li>
						{/if}

						<div class="divider mt-2 mb-0 divider-error"></div>
						<li>
							<button
								class="w-full justify-end text-error hover:bg-error hover:text-error-content active:bg-error active:text-error-content"
								onclick={handleSignOut}>
								Sign Out
								<LogOut size="1em" />
							</button>
						</li>
					</ul>
				</div>
			{:else}
				<a href={resolve("signIn")} class="btn btn-outline btn-primary btn-sm">Sign in</a>
			{/if}
		</div>
	</header>

	{@render children()}
</div>

{#snippet logo()}
	<span
		class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary font-extrabold text-primary-content">
		AI
	</span>
{/snippet}

<Modal />

{#snippet theme()}
	<ThemeController currentTheme={data.theme} />
{/snippet}
